# Kandy Cabs — VPS Infrastructure & Production Security Hardening Guide

This document outlines the mandatory production infrastructure and OS-level security hardening requirements for deploying Kandy Cabs to a Linux VPS (Ubuntu 22.04 LTS / Debian 12).

---

## 1. UFW Firewall Configuration
Restricted inbound ports. Only SSH, HTTP, and HTTPS are accessible to the outside world.

```bash
# Reset firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential ports
sudo ufw allow 22/tcp      # SSH (or custom port)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# Enable UFW
sudo ufw enable
sudo ufw status verbose
```

---

## 2. PostgreSQL Database Hardening
- **Local Loopback Binding Only**: Edit `/etc/postgresql/15/main/postgresql.conf`:
  ```ini
  listen_addresses = 'localhost'
  ```
- **Authentication**: Edit `/etc/postgresql/15/main/pg_hba.conf`:
  ```ini
  local   all             all                                     scram-sha-256
  host    kandy_db        kandy_user      127.0.0.1/32            scram-sha-256
  ```

---

## 3. Redis In-Memory Store Hardening
- **Loopback Binding & Password Authentication**: Edit `/etc/redis/redis.conf`:
  ```ini
  bind 127.0.0.1 ::1
  protected-mode yes
  requirepass YOUR_STRONG_REDIS_PASSWORD_HERE
  ```

---

## 4. Non-Root Application Execution (`pm2` / Systemd)
Never run Next.js application processes as `root`. Create a dedicated system user:

```bash
sudo useradd -r -s /bin/false kandycabs
sudo chown -R kandycabs:kandycabs /var/www/kandy-cabs

# Start using PM2 under kandycabs user
pm2 start ecosystem.config.js --env production
```

---

## 5. SSH Key Authentication & Password Disabling
Edit `/etc/ssh/sshd_config`:

```ini
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
```

Restart SSH service:
```bash
sudo systemctl restart sshd
```

---

## 6. Automated Daily Database & Upload Backups
Crontab rule (`/etc/cron.daily/kandycabs-backup`):

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/kandycabs"

mkdir -p $BACKUP_DIR
pg_dump -U kandy_user kandy_db | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Retain 14 days of backups
find $BACKUP_DIR -type f -mtime +14 -name "*.gz" -delete
```
