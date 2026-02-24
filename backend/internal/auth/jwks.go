package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Validator struct {
	issuer    string
	jwksURL   string
	cacheTTL  time.Duration
	http      *http.Client
	mu        sync.RWMutex
	keysByKID map[string]any
	expiresAt time.Time
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func NewValidator(issuer, jwksURL string, cacheTTL time.Duration) *Validator {
	return &Validator{
		issuer:   issuer,
		jwksURL:  jwksURL,
		cacheTTL: cacheTTL,
		http: &http.Client{
			Timeout: 5 * time.Second,
		},
		keysByKID: map[string]any{},
	}
}

func (v *Validator) ParseAndValidate(ctx context.Context, tokenString string) (jwt.MapClaims, error) {
	parsed, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		switch token.Method.(type) {
		case *jwt.SigningMethodRSA, *jwt.SigningMethodECDSA:
		default:
			return nil, errors.New("unexpected signing method")
		}
		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return v.anyPublicKey(ctx)
		}
		return v.publicKey(ctx, kid)
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	iss, _ := claims["iss"].(string)
	if !sameIssuer(iss, v.issuer) {
		return nil, errors.New("invalid issuer")
	}
	return claims, nil
}

func sameIssuer(got, expected string) bool {
	normalize := func(v string) string {
		return strings.TrimRight(strings.TrimSpace(v), "/")
	}
	return normalize(got) != "" && normalize(got) == normalize(expected)
}

func (v *Validator) publicKey(ctx context.Context, kid string) (any, error) {
	v.mu.RLock()
	key, ok := v.keysByKID[kid]
	fresh := time.Now().Before(v.expiresAt)
	v.mu.RUnlock()
	if ok && fresh {
		return key, nil
	}

	if err := v.refresh(ctx); err != nil {
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	key, ok = v.keysByKID[kid]
	if !ok {
		return nil, errors.New("kid not found")
	}
	return key, nil
}

func (v *Validator) anyPublicKey(ctx context.Context) (any, error) {
	v.mu.RLock()
	fresh := time.Now().Before(v.expiresAt)
	if fresh && len(v.keysByKID) == 1 {
		for _, key := range v.keysByKID {
			v.mu.RUnlock()
			return key, nil
		}
	}
	v.mu.RUnlock()

	if err := v.refresh(ctx); err != nil {
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	for _, key := range v.keysByKID {
		return key, nil
	}
	return nil, errors.New("kid not found")
}

func (v *Validator) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	res, err := v.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return errors.New("jwks request failed")
	}

	var body jwksResponse
	if err = json.NewDecoder(res.Body).Decode(&body); err != nil {
		return err
	}

	next := make(map[string]any, len(body.Keys))
	for _, k := range body.Keys {
		if k.Kid == "" {
			continue
		}
		var (
			pub any
			err error
		)
		switch k.Kty {
		case "RSA":
			if k.N == "" || k.E == "" {
				continue
			}
			pub, err = parseRSAKey(k.N, k.E)
		case "EC":
			if k.Crv == "" || k.X == "" || k.Y == "" {
				continue
			}
			pub, err = parseECKey(k.Crv, k.X, k.Y)
		default:
			continue
		}
		if err != nil {
			continue
		}
		next[k.Kid] = pub
	}
	if len(next) == 0 {
		return errors.New("no valid jwks keys")
	}

	v.mu.Lock()
	v.keysByKID = next
	v.expiresAt = time.Now().Add(v.cacheTTL)
	v.mu.Unlock()
	return nil
}

func parseRSAKey(nEnc, eEnc string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nEnc)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eEnc)
	if err != nil {
		return nil, err
	}

	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)
	if n.Sign() <= 0 || e.Sign() <= 0 {
		return nil, errors.New("invalid rsa key")
	}

	return &rsa.PublicKey{N: n, E: int(e.Int64())}, nil
}

func parseECKey(crv, xEnc, yEnc string) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(xEnc)
	if err != nil {
		return nil, err
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(yEnc)
	if err != nil {
		return nil, err
	}

	var curve elliptic.Curve
	switch crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, errors.New("unsupported curve")
	}

	x := new(big.Int).SetBytes(xBytes)
	y := new(big.Int).SetBytes(yBytes)
	if !curve.IsOnCurve(x, y) {
		return nil, errors.New("invalid ec key")
	}

	return &ecdsa.PublicKey{Curve: curve, X: x, Y: y}, nil
}
