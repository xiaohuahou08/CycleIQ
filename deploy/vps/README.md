## CycleIQ VPS deploy (Docker)

This deploys the Next.js app in `apps/web` on a VPS using Docker Compose.

### 0) Security note

Do **not** commit any `.env` files containing credentials. Keep secrets only on the server.

### 1) VPS prerequisites

On the VPS (Ubuntu):

```bash
sudo apt-get update -y
sudo apt-get install -y git ca-certificates curl

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Re-login so docker group applies
```

Install Docker Compose v2 (usually included with Docker). Verify:

```bash
docker --version
docker compose version
```

### 2) Clone repo

```bash
git clone git@github.com:xiaohuahou08/CycleIQ.git
cd CycleIQ
```

### 3) Create env file on VPS

```bash
mkdir -p deploy/vps
cp deploy/vps/web.env.example deploy/vps/web.env
nano deploy/vps/web.env
```

Fill at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `APP_BASE_URL` (your VPS domain, if using a reverse proxy)

### 4) Build + run

```bash
cd deploy/vps
docker compose up -d --build
docker compose ps
```

App will listen on port `3000` on the VPS.

### 5) Optional: reverse proxy (Nginx)

If you want `https://your-domain.com`:
- point your domain A record to the VPS
- terminate TLS with Nginx + certbot (or Caddy)
- proxy to `http://127.0.0.1:3000`

Example Nginx server block:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 6) Updates

```bash
cd ~/CycleIQ
git pull
cd deploy/vps
docker compose up -d --build
```

