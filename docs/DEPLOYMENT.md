# Deployment Guide

This guide covers deploying the OpenBMC Learning Platform to production.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (optional, for HTTPS)
- At least 2GB RAM and 10GB disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/openbmc-learning-platform.git
cd openbmc-learning-platform
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required variables:**

- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `POSTGRES_PASSWORD` - Strong database password
- `NEXTAUTH_URL` - Your domain URL

### 3. Start the Application

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Run Database Migrations

```bash
# Wait for database to be ready, then run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# (Optional) Seed with sample data
docker-compose -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl http://localhost/api/health

# Check all services are running
docker-compose -f docker-compose.prod.yml ps
```

## SSL/HTTPS Setup

### Option 1: Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot

# Generate certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx/ssl directory
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### Option 2: Manual SSL Certificate

Place your SSL certificate files in:

- `nginx/ssl/fullchain.pem` - Full certificate chain
- `nginx/ssl/privkey.pem` - Private key

Then uncomment the HTTPS server block in `nginx/conf.d/default.conf`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                    │
│                    Port 80/443                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
│                    Port 3000 (internal)                     │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌───────────────────────┐   ┌───────────────────────┐
│     PostgreSQL        │   │        Redis          │
│     Port 5432         │   │      Port 6379        │
└───────────────────────┘   └───────────────────────┘
```

## Management Commands

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build app

# Run any new migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres openbmc_learning > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres openbmc_learning < backup.sql
```

### Scale Application

```bash
# Run multiple app instances (requires load balancer update)
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

## Monitoring

### Health Checks

All services have built-in health checks:

```bash
# Application health
curl http://localhost/api/health

# Database health (from inside network)
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Resource Usage

```bash
# View container stats
docker stats

# View disk usage
docker system df
```

## Troubleshooting

### Application Won't Start

1. Check logs: `docker-compose -f docker-compose.prod.yml logs app`
2. Verify environment variables are set
3. Ensure database is healthy
4. Check if port 3000 is available

### Database Connection Issues

1. Check database is running: `docker-compose -f docker-compose.prod.yml ps db`
2. Verify DATABASE_URL is correct
3. Check database logs: `docker-compose -f docker-compose.prod.yml logs db`

### Out of Memory

1. Check memory usage: `docker stats`
2. Increase container memory limits in docker-compose.prod.yml
3. Consider scaling horizontally

### SSL Certificate Issues

1. Verify certificate files exist in `nginx/ssl/`
2. Check certificate validity: `openssl x509 -in nginx/ssl/fullchain.pem -text -noout`
3. Check nginx logs: `docker-compose -f docker-compose.prod.yml logs nginx`

## Security Checklist

- [ ] Change default database password
- [ ] Generate strong JWT and NextAuth secrets
- [ ] Enable HTTPS in production
- [ ] Configure firewall (only expose ports 80, 443)
- [ ] Set up regular database backups
- [ ] Enable rate limiting in nginx
- [ ] Review and update dependencies regularly

## Support

For issues and questions:

- GitHub Issues: https://github.com/your-org/openbmc-learning-platform/issues
- Documentation: https://docs.your-domain.com
