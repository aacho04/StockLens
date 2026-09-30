# 🚀 StockLens Production Deployment Guide (Docker & VPS)

This guide walks you through deploying **StockLens** (React frontend + Node.js/Express API + Upstox Live WebSocket Engine + PostgreSQL) to any Linux VPS (DigitalOcean Droplet, AWS EC2, Hetzner, Linode, etc.) using Docker Compose.

---

## 📋 Requirements
- Any Linux Virtual Server (Ubuntu 22.04 LTS or 24.04 LTS recommended)
- Minimum Specs: **1 vCPU, 2 GB RAM, 20 GB SSD**
- A domain name pointing to your server's public IP (e.g. `stocklens.yourdomain.com`), or simply your server's public IP address.

---

## ⚡ Quick Start: 5-Step Deployment

### Step 1: Connect to your Server
Open your terminal and SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

---

### Step 2: Install Docker & Docker Compose
If Docker is not installed on your VPS yet, run the official Docker setup script:
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
```
Verify installation:
```bash
docker --version
docker compose version
```

---

### Step 3: Clone the Repository
```bash
git clone https://github.com/aacho04/StockLens.git
cd StockLens
```

---

### Step 4: Configure Environment Variables
Copy the production environment template:
```bash
cp .env.example .env
nano .env
```

Ensure the following variables are configured in `.env`:
```env
# ─── Database ───────────────────────────────────────────────────────────────
POSTGRES_USER=stocklens
POSTGRES_PASSWORD=generate_a_strong_password_here_123!
POSTGRES_DB=stocklens

# ─── Authentication Secrets (Generate 32+ char random strings) ──────────────
JWT_SECRET=replace_with_a_random_jwt_secret_min_32_characters_long
REFRESH_TOKEN_SECRET=replace_with_a_random_refresh_secret_min_32_chars

# ─── Market Data Engine ─────────────────────────────────────────────────────
MARKET_DATA_PROVIDER=upstox
UPSTOX_ACCESS_TOKEN=your_upstox_access_token_here

# ─── Port Configuration ─────────────────────────────────────────────────────
PORT=80
```
> **Tip:** You can generate random 32-character secrets in Linux using:
> ```bash
> openssl rand -hex 24
> ```

---

### Step 5: Launch StockLens
Run the production Docker Compose stack in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Docker will:
1. Start the PostgreSQL 16 database and wait for it to be healthy.
2. Build and start the API engine (`apps/api`), running database migrations automatically.
3. Build the React web frontend (`apps/web`) and serve it through Nginx on port `80`.
4. Handle API requests (`/api/*`) and live WebSocket connections (`/ws`) automatically via reverse proxy.

---

## 🔍 Verification & Useful Commands

### Check Running Containers
```bash
docker compose -f docker-compose.prod.yml ps
```
You should see:
- `stocklens-postgres` (healthy)
- `stocklens-api` (running)
- `stocklens-web` (running on 0.0.0.0:80)

### View Real-Time Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# API logs (Upstox ticks, orders)
docker compose -f docker-compose.prod.yml logs -f api

# Web & Nginx proxy logs
docker compose -f docker-compose.prod.yml logs -f web
```

### Accessing the Web App
Open your browser and navigate to:
```
http://YOUR_SERVER_IP
```

---

## 🔒 Free HTTPS / SSL Setup (Let's Encrypt Certbot)

If you have a domain pointed to your server's IP address (e.g., `stocklens.com`):

### Option A: Certbot with Nginx (Recommended)
1. Install Certbot on your host:
   ```bash
   sudo apt update && sudo apt install -y certbot
   ```
2. Stop the docker web container temporarily:
   ```bash
   docker compose -f docker-compose.prod.yml stop web
   ```
3. Issue an SSL certificate:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```
4. Restart web:
   ```bash
   docker compose -f docker-compose.prod.yml start web
   ```

### Option B: Cloudflare (Easiest, 1-Click SSL)
1. Point your domain DNS to Cloudflare.
2. Set SSL/TLS encryption mode to **Flexible** or **Full**.
3. Cloudflare automatically provides free HTTPS, DDoS protection, and global CDN caching.

---

## 🔄 Deploying Future Updates
Whenever you push changes to GitHub:
```bash
cd StockLens
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
This updates only the changed containers with zero manual database reconfiguration.
