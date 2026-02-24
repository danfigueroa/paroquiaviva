package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
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
	keysByKID map[string]*rsa.PublicKey
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
}

func NewValidator(issuer, jwksURL string, cacheTTL time.Duration) *Validator {
	return &Validator{
		issuer:   issuer,
		jwksURL:  jwksURL,
		cacheTTL: cacheTTL,
		http: &http.Client{
			Timeout: 5 * time.Second,
		},
		keysByKID: map[string]*rsa.PublicKey{},
	}
}

func (v *Validator) ParseAndValidate(ctx context.Context, tokenString string) (jwt.MapClaims, error) {
	parsed, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, errors.New("unexpected signing method")
		}
		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("missing kid")
		}
		return v.publicKey(ctx, kid)
	}, jwt.WithIssuer(v.issuer))
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (v *Validator) publicKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
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

	next := make(map[string]*rsa.PublicKey, len(body.Keys))
	for _, k := range body.Keys {
		if k.Kty != "RSA" || k.Kid == "" || k.N == "" || k.E == "" {
			continue
		}
		pub, err := parseRSAKey(k.N, k.E)
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
