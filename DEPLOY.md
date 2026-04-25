# Deploy — Paróquia Viva

Stack de produção:

```
Vercel (Vite SPA) ──HTTPS──▶ Fly.io (Go/chi) ──pgx──▶ Supabase (Postgres + Auth)
```

O **banco continua no Supabase**. Frontend e backend só consomem-no via env vars — nada é "empacotado" junto.

---

## 0. Pré-requisitos (uma única vez)

```bash
# Fly.io CLI
brew install flyctl
fly auth signup        # ou: fly auth login

# Vercel CLI
npm i -g vercel
vercel login

# golang-migrate (já instalado, usado para rodar SQLs no Supabase)
brew install golang-migrate
```

Tenha à mão, no dashboard do Supabase (Project Settings → Database e API):

- `Project URL` → `https://<ref>.supabase.co`
- `anon public key`
- `Connection string (Transaction pooler — porta 6543)` → será o `DATABASE_URL` em produção
- `Connection string (Direct — porta 5432)` → só para rodar migrações
- `JWT Secret` (Project Settings → API → JWT Settings) → não é necessário se você usa JWKS

---

## 1. Supabase — preparar para produção

1. **Auth → URL Configuration**
   - `Site URL` = URL final do Vercel (ex.: `https://paroquia-viva.vercel.app`)
   - `Redirect URLs` = adicione `https://paroquia-viva.vercel.app/auth` (e `http://localhost:5173/auth` para dev)
   - Sem isso, magic link e reset de senha quebram em produção.

2. **Backups**: confirme política do plano. Free tier retém poucos dias — considere upgrade antes do lançamento público.

3. **Migrações**: já estão na versão 6. Para confirmar:

   ```bash
   cd backend
   migrate -path ./internal/db/migrations \
     -database "postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
     version
   ```

   Use a string **direta** (porta 5432) para `migrate`, não o pooler.

---

## 2. Backend — Fly.io

### 2.1 Build local em Docker (opcional, mas recomendado antes do primeiro deploy)

```bash
cd backend
docker build -t parish-viva-api .
docker run --rm -p 8080:8080 --env-file .env parish-viva-api
# em outro terminal:
curl http://localhost:8080/health   # esperado: {"status":"ok"}
```

### 2.2 Lançar app na Fly

```bash
cd backend
fly launch --no-deploy --copy-config --name parish-viva-api --region gru
```

- O `fly.toml` já existe; o flag `--copy-config` reutiliza ele.
- Escolha um `app name` único globalmente (`parish-viva-api` provavelmente está livre — se não, troque).
- Recuse Postgres/Redis quando perguntar (usaremos Supabase).

### 2.3 Configurar secrets

```bash
# usar a string do POOLER (porta 6543) — sobrevive a picos sem estourar conexões
fly secrets set \
  DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  JWT_ISSUER="https://<ref>.supabase.co/auth/v1" \
  JWKS_URL="https://<ref>.supabase.co/auth/v1/.well-known/jwks.json" \
  CORS_ALLOWED_ORIGINS="https://paroquia-viva.vercel.app,http://localhost:5173"
```

> Defina `CORS_ALLOWED_ORIGINS` agora com um placeholder; depois do deploy do frontend, atualize com o domínio Vercel real (`fly secrets set CORS_ALLOWED_ORIGINS="..."`).

### 2.4 Deploy

```bash
fly deploy
fly logs                          # acompanhe — esperar "api_server_started"
curl https://parish-viva-api.fly.dev/health
```

### 2.5 Comandos úteis

```bash
fly status              # health, regions, machines
fly logs                # streaming de logs
fly ssh console         # entrar no container
fly secrets list        # nomes dos secrets (sem valor)
fly releases            # histórico
fly deploy --image-label v1.0.1   # rollback: redeploy um image label antigo
```

---

## 3. Frontend — Vercel

### 3.1 Primeiro deploy

```bash
cd frontend
vercel
```

Responda às perguntas:

- `Set up and deploy?` → **Y**
- `Which scope?` → seu user/team
- `Link to existing project?` → **N** (no primeiro deploy)
- `Project name?` → `paroquia-viva` (ou outro)
- `In which directory is your code located?` → `./`
- O Vercel detecta Vite automaticamente; aceite os defaults (já reforçados pelo `vercel.json`).

### 3.2 Configurar env vars

```bash
# faça uma vez por env (production, preview, development)
vercel env add VITE_API_BASE_URL production
# valor: https://parish-viva-api.fly.dev/api/v1

vercel env add VITE_SUPABASE_URL production
# valor: https://<ref>.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# valor: <anon public key>
```

Repita para `preview` se quiser ambiente de preview funcional.

### 3.3 Re-deploy com env aplicado

```bash
vercel --prod
```

URL final aparece no output. Copie-a.

### 3.4 Atualizar CORS no backend com o domínio Vercel real

```bash
cd ../backend
fly secrets set CORS_ALLOWED_ORIGINS="https://paroquia-viva.vercel.app,http://localhost:5173"
# o fly deploy automaticamente reinicia as máquinas
```

---

## 4. Verificação E2E

1. Abra `https://paroquia-viva.vercel.app/auth`, crie conta nova (escolha tradição).
2. Confirme e-mail (clica no link → deve cair em `/feed`).
3. Crie um pedido em `/requests/new`, ore num pedido alheio, troque a tradição em `/profile`.
4. Acompanhe `fly logs` durante a sessão — sem 5xx.
5. Confirme reset de senha: `/auth` → "Redefinir senha" → e-mail → link redireciona corretamente.

---

## 5. Rollback rápido

**Backend**

```bash
fly releases             # lista versões
fly releases rollback <release-id>
```

**Frontend**

Vercel dashboard → Deployments → escolher versão anterior → "Promote to Production".

---

## 6. Custos esperados

- **Supabase Free**: 500 MB DB, 1 GB storage, 50k MAU. Se passar, $25/mês para Pro.
- **Fly.io**: 3 VMs `shared-cpu-1x/256MB` no plano hobbyist; nosso `min_machines_running = 0` deixa máquina dormir (cold start ~1-2s na primeira request).
- **Vercel Hobby**: grátis para projetos pessoais (100 GB bandwidth/mês).

---

## 7. Próximos passos sugeridos

- Domínio próprio: `vercel domains add paroquiaviva.com.br` + apontar `app.paroquiaviva.com.br` para a Vercel; `api.paroquiaviva.com.br` (CNAME) para a Fly.
- CI/CD: GitHub Actions já roda testes; adicionar `fly deploy --remote-only` em push para `main` e Vercel já faz deploy automático ao conectar o repo.
- Observabilidade: `fly logs` está OK no início; depois plugar Logflare/Datadog. Sentry no frontend para erros JS.
