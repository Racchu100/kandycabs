# Kandy Cabs — Hostinger VPS Production Deployment & Operations Manual

This document provides step-by-step instructions for deploying, configuring, securing, and maintaining the **Kandy Cabs Mangaluru** application on a Hostinger VPS (Ubuntu 22.04 LTS).

---

## 1. Process Management Rationale: PM2 vs. Docker
We select **PM2 Cluster Mode** over Docker containerization for this deployment:
- **Zero Overhead**: Direct Node.js execution on bare metal Ubuntu without container virtualization overhead.
- **Instant Zero-Downtime Reloads**: `pm2 reload ecosystem.config.js` reloads workers sequentially in under 300ms.
- **Resource Efficiency**: Maximize CPU core usage across all available VPS vCPUs with native process clustering.

---

## 2. Target Production Architecture

```text
Internet
    ↓
DNS (Cloudflare / Hostinger)
    ↓
HTTPS (SSL Certbot TLS 1.3)
    ↓
Nginx Reverse Proxy (Port 80/443, Security Headers, Rate Limits)
    ↓
PM2 Next.js App Cluster (Port 3000, max instances)
    ↓
PostgreSQL (Local Loopback 127.0.0.1:5432, SCRAM-SHA-256)
    ↓
Redis (Local Loopback 127.0.0.1:6379, Password Authenticated)
```

---

## 3. Step-by-Step VPS Setup Guide

### Step 1: System Package Update & Non-Root User Creation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential ufw nginx certbot python3-certbot-nginx

# Create restricted system user
sudo useradd -m -s /bin/bash kandycabs
sudo usermod -aG sudo kandycabs
```

### Step 2: Firewall Configuration (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 3: Node.js 20 LTS & PM2 Installation
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step 4: PostgreSQL Installation & Hardening
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create Database & User
sudo -u postgres psql -c "CREATE DATABASE kandy_cabs_db;"
sudo -u postgres psql -c "CREATE USER kandy_db_user WITH PASSWORD 'YOUR_STRONG_POSTGRES_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kandy_cabs_db TO kandy_db_user;"
```
Ensure `/etc/postgresql/15/main/postgresql.conf` has `listen_addresses = 'localhost'`.

### Step 5: Redis Installation & Hardening
```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Edit /etc/redis/redis.conf:
# bind 127.0.0.1 ::1
# requirepass YOUR_STRONG_REDIS_PASSWORD

sudo systemctl restart redis-server
```

### Step 6: Application Cloning & Production Build
```bash
cd /var/www
sudo git clone https://github.com/your-org/kandy-cabs-website.git
sudo chown -R kandycabs:kandycabs /var/www/kandy-cabs-website
cd /var/www/kandy-cabs-website

# Setup Environment
cp .env.production.example .env.production
# Edit .env.production with production credentials

npm ci
npm run build
```

### Step 7: PM2 Process Management
```bash
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u kandycabs --hp /home/kandycabs
```

### Step 8: Nginx Setup & SSL Certificate
```bash
sudo cp nginx/kandycabs.conf /etc/nginx/sites-available/kandycabs.conf
sudo ln -s /etc/nginx/sites-available/kandycabs.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Free Let's Encrypt SSL
sudo certbot --nginx -d kandycabs.in -d www.kandycabs.in --non-interactive --agree-tos --email admin@kandycabs.in
```

### Step 9: Automated Daily Database Backup Script
Crontab entry (`/etc/cron.daily/kandycabs-backup`):
```bash
#!/bin/bash
BACKUP_PATH="/var/backups/kandycabs/db_$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p /var/backups/kandycabs
pg_dump -U kandy_db_user -h 127.0.0.1 kandy_cabs_db | gzip > $BACKUP_PATH
find /var/backups/kandycabs -type f -mtime +14 -delete
```

---

## 4. Maintenance, Zero-Downtime Updates & Rollbacks

### Zero-Downtime Code Update Procedure
```bash
cd /var/www/kandy-cabs-website
git pull origin main
npm ci
npm run build
pm2 reload ecosystem.config.js
```

### Rollback Procedure
```bash
git checkout HEAD~1
npm run build
pm2 reload ecosystem.config.js
```
