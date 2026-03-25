# Production Deployment Guide

This document provides comprehensive instructions for deploying the Shared Shopping List application in production environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Configuration](#configuration)
5. [Deployment Options](#deployment-options)
6. [Monitoring and Observability](#monitoring-and-observability)
7. [Security Considerations](#security-considerations)
8. [Performance Optimization](#performance-optimization)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

## Quick Start

### 1. Basic Production Deployment

```bash
# Clone the repository
git clone https://github.com/hechi/shoppimo.git
cd shoppimo

# Configure environment
cp .env.example .env
# Edit .env with your production settings

# Deploy application
./scripts/deploy.sh
```

### 2. Production with Monitoring

```bash
# Deploy with full monitoring stack
./scripts/deploy-with-monitoring.sh
```

## Architecture Overview

### Production Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Monitoring    │    │   Backup        │
│   (Optional)    │    │   Stack         │    │   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Frontend   │  │   Backend   │  │      PostgreSQL         │ │
│  │   (Nginx)   │  │  (Kotlin)   │  │     (Database)          │ │
│  │             │  │             │  │                         │ │
│  │ Port: 80    │  │ Port: 8080  │  │ Port: 5432              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Service Communication

- **Frontend (Nginx)**: Serves static files and proxies API/WebSocket requests
- **Backend (Ktor)**: Handles REST API and WebSocket connections
- **Database (PostgreSQL)**: Persistent data storage with connection pooling
- **Monitoring**: Optional Prometheus, Grafana, and AlertManager stack

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, SSD recommended
- **Network**: Stable internet connection

### Software Dependencies

```bash
# Docker Engine 20.10+
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 2.0+
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Optional: Docker Compose V2 plugin
sudo apt-get update && sudo apt-get install docker-compose-plugin
```

## Configuration

### Environment Variables

Create and configure your `.env` file:

```bash
cp .env.example .env
# Edit .env with your production settings
```

#### Required Configuration

```bash
# Database Security
POSTGRES_PASSWORD=your_very_secure_password_here

# Domain Configuration
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com

# Optional: Custom Ports
FRONTEND_PORT=80
BACKEND_PORT=8080
POSTGRES_PORT=5432
```

#### Monitoring Configuration (Optional)

```bash
# Grafana Credentials
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_secure_grafana_password

# Alert Configuration
ALERT_EMAIL=admin@your-domain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### SSL/TLS Configuration

For production with HTTPS, configure your reverse proxy:

#### Option 1: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080;
        # ... additional proxy settings
    }
    
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # ... additional WebSocket settings
    }
}
```

#### Option 2: Traefik (Docker)

```yaml
# Add to docker-compose.prod.yml
services:
  traefik:
    image: traefik:v2.9
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@domain.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
```

## Deployment Options

### 1. Standard Production Deployment

```bash
# Basic production deployment
./scripts/deploy.sh

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs
```

### 2. Enhanced Deployment with Monitoring

```bash
# Deploy with full monitoring stack
./scripts/deploy-with-monitoring.sh

# Deploy only monitoring (if app is already running)
./scripts/deploy-with-monitoring.sh monitoring-only

# Deploy only application
./scripts/deploy-with-monitoring.sh app-only
```

### 3. Manual Deployment

```bash
# Stop existing services
docker-compose -f docker-compose.prod.yml down

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# With monitoring
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d --build
```

## Monitoring and Observability

### Monitoring Stack Components

1. **Prometheus** (http://localhost:9090)
   - Metrics collection and storage
   - Alert rule evaluation
   - Time-series database

2. **Grafana** (http://localhost:3001)
   - Visualization dashboards
   - Alert notifications
   - User management

3. **AlertManager** (http://localhost:9093)
   - Alert routing and grouping
   - Notification channels
   - Silence management

4. **cAdvisor** (http://localhost:8081)
   - Container resource metrics
   - Performance monitoring
   - Resource usage analysis

### Key Metrics to Monitor

#### Application Metrics
- Response time (95th percentile)
- Request rate (requests per second)
- Error rate (4xx/5xx responses)
- WebSocket connection count
- Active user sessions

#### Infrastructure Metrics
- CPU usage per container
- Memory usage and limits
- Disk I/O and space usage
- Network traffic
- Container restart count

#### Database Metrics
- Connection pool usage
- Query execution time
- Database size and growth
- Lock contention
- Cache hit ratio

### Setting Up Alerts

#### Email Notifications

Edit `monitoring/alertmanager.yml`:

```yaml
receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'admin@your-domain.com'
        from: 'alerts@your-domain.com'
        smarthost: 'smtp.your-provider.com:587'
        auth_username: 'alerts@your-domain.com'
        auth_password: 'your-smtp-password'
        subject: 'Shopping List Alert: {{ .GroupLabels.alertname }}'
```

#### Slack Notifications

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'Shopping List Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Security Considerations

### Network Security

1. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Docker Network Isolation**
   - Services communicate through internal Docker network
   - Database not exposed to host network
   - Frontend acts as reverse proxy

### Application Security

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use strong, unique passwords
   - Rotate credentials regularly

2. **Container Security**
   - Non-root user in containers
   - Read-only file systems where possible
   - Resource limits and constraints

3. **Database Security**
   - Strong password policy
   - Connection encryption
   - Regular security updates

### SSL/TLS Configuration

```bash
# Generate strong SSL configuration
openssl dhparam -out dhparam.pem 4096

# Test SSL configuration
curl -I https://your-domain.com
```

## Performance Optimization

### Frontend Optimization

1. **Nginx Configuration**
   - GZIP compression enabled
   - Static file caching
   - Connection keep-alive
   - Rate limiting

2. **React Build Optimization**
    ```bash
    # Analyze bundle size
    cd frontend
    npm run build
    ```

### Backend Optimization

1. **JVM Tuning**
   ```dockerfile
   ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
   ```

2. **Database Connection Pooling**
   ```kotlin
   maximumPoolSize = 20
   minimumIdle = 5
   connectionTimeout = 30000
   idleTimeout = 600000
   ```

### Database Optimization

1. **PostgreSQL Configuration**
   ```sql
   -- Optimize for container environment
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET maintenance_work_mem = '64MB';
   SELECT pg_reload_conf();
   ```

2. **Index Optimization**
   ```sql
   -- Monitor slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

## Backup and Recovery

### Automated Backups

1. **Database Backups**
   ```bash
   # Create backup
   ./scripts/migrate.sh backup
   
   # Schedule daily backups
   echo "0 2 * * * /path/to/project/scripts/migrate.sh backup" | crontab -
   ```

2. **Full System Backup**
   ```bash
   # Backup entire application
   tar -czf backup-$(date +%Y%m%d).tar.gz \
     .env \
     docker-compose.prod.yml \
     monitoring/ \
     scripts/ \
     backups/
   ```

### Disaster Recovery

1. **Recovery Procedure**
   ```bash
   # Stop services
   ./scripts/deploy.sh stop
   
   # Restore database
   ./scripts/migrate.sh restore backups/backup_20241024_120000.sql
   
   # Restart services
   ./scripts/deploy.sh
   ```

2. **High Availability Setup**
   - Database replication
   - Load balancer configuration
   - Multi-region deployment

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
./scripts/deploy.sh logs

# Check individual service
docker-compose -f docker-compose.prod.yml logs backend

# Check system resources
docker stats
df -h
free -h
```

#### Database Connection Issues

```bash
# Test database connectivity
./scripts/migrate.sh status

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

#### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:8080/api/metrics

# Database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U shopping_user -d shopping_lists -c "SELECT * FROM pg_stat_activity;"
```

### Log Analysis

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100 backend

# Nginx access logs
docker-compose -f docker-compose.prod.yml exec frontend tail -f /var/log/nginx/access.log

# Database logs
docker-compose -f docker-compose.prod.yml logs postgres | grep ERROR
```

### Health Checks

```bash
# Application health
curl -f http://localhost/health
curl -f http://localhost:8080/api/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U shopping_user

# Container health
docker inspect shopping-list-frontend-prod | grep -A 10 Health
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly Tasks**
   ```bash
   # Update container images
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   
   # Clean up unused images
   docker image prune -f
   
   # Check disk space
   df -h
   ```

2. **Monthly Tasks**
   ```bash
   # Database maintenance
   docker-compose -f docker-compose.prod.yml exec postgres psql -U shopping_user -d shopping_lists -c "VACUUM ANALYZE;"
   
   # Rotate logs
   docker-compose -f docker-compose.prod.yml exec frontend logrotate /etc/logrotate.conf
   
   # Security updates
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d --force-recreate
   ```

### Scaling Considerations

#### Horizontal Scaling

1. **Load Balancer Setup**
   ```yaml
   # Add to docker-compose.prod.yml
   nginx-lb:
     image: nginx:alpine
     ports:
       - "80:80"
     volumes:
       - ./nginx-lb.conf:/etc/nginx/nginx.conf
     depends_on:
       - frontend-1
       - frontend-2
   ```

2. **Database Replication**
   ```yaml
   postgres-replica:
     image: postgres:15-alpine
     environment:
       POSTGRES_MASTER_SERVICE: postgres
       POSTGRES_REPLICA_USER: replica_user
       POSTGRES_REPLICA_PASSWORD: replica_password
   ```

#### Vertical Scaling

```yaml
# Resource limits in docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Updates and Upgrades

1. **Application Updates**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Backup before update
   ./scripts/migrate.sh backup
   
   # Deploy update
   ./scripts/deploy.sh
   
   # Verify deployment
   ./scripts/deploy.sh health
   ```

2. **Database Migrations**
   ```bash
   # Run migrations
   ./scripts/migrate.sh migrate
   
   # Verify migration
   ./scripts/migrate.sh status
   ```

## Support and Documentation

### Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### Getting Help

1. **Check application logs first**
2. **Review this documentation**
3. **Search existing issues**
4. **Create detailed bug reports with logs**

Remember to always test changes in a staging environment before applying them to production.