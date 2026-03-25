# Deployment Guide

This guide covers deploying the Shared Shopping List application in production using Docker containers.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- 10GB disk space for containers and data

## Quick Start

1. **Clone and prepare the environment:**
   ```bash
   git clone https://github.com/hechi/shoppimo.git
   cd shoppimo
   cp .env.example .env
   ```

2. **Configure environment variables:**
   Edit `.env` file and update:
   - `POSTGRES_PASSWORD`: Set a secure password
   - `VITE_API_URL`: Your domain/IP for API access
   - `VITE_WS_URL`: Your domain/IP for WebSocket connections

3. **Deploy the application:**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost (or your configured domain)
   - Backend API: http://localhost:8080/api
   - Health Check: http://localhost/health

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_DB` | Database name | `shopping_lists` | No |
| `POSTGRES_USER` | Database user | `shopping_user` | No |
| `POSTGRES_PASSWORD` | Database password | `shopping_pass` | **Yes** |
| `POSTGRES_PORT` | Database port | `5432` | No |
| `FRONTEND_PORT` | Frontend port | `80` | No |
| `BACKEND_PORT` | Backend port | `8080` | No |
| `VITE_API_URL` | API base URL | `http://localhost:8080` | **Yes** |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8080` | **Yes** |

### Production Configuration

For production deployment, update these variables in your `.env` file:

```bash
# Security
POSTGRES_PASSWORD=your_very_secure_password_here

# Domain configuration
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com

# Optional: Custom ports
FRONTEND_PORT=443
BACKEND_PORT=8080
```

## Architecture

The production deployment consists of three main services:

### Frontend (Nginx + React)
- **Container**: `shopping-list-frontend-prod`
- **Port**: 80 (configurable via `FRONTEND_PORT`)
- **Features**:
  - Static file serving with optimized caching
  - API proxy to backend service
  - WebSocket upgrade handling
  - Health check endpoint at `/health`
  - Security headers and GZIP compression

### Backend (Kotlin/Ktor)
- **Container**: `shopping-list-backend-prod`
- **Port**: 8080 (configurable via `BACKEND_PORT`)
- **Features**:
  - REST API endpoints
  - WebSocket real-time communication
  - Database connection pooling
  - Health check endpoint at `/api/health`
  - JVM optimization for containers

### Database (PostgreSQL)
- **Container**: `shopping-list-db-prod`
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Features**:
  - Persistent data storage
  - Automatic schema initialization
  - Health checks and monitoring
  - Optimized for container environments

## Deployment Scripts

### Deploy Script (`./scripts/deploy.sh`)

Main deployment script with the following commands:

```bash
# Full deployment (default)
./scripts/deploy.sh deploy

# Stop all services
./scripts/deploy.sh stop

# View logs
./scripts/deploy.sh logs

# Check service status
./scripts/deploy.sh status

# Health check
./scripts/deploy.sh health
```

### Database Script (`./scripts/migrate.sh`)

Database management script:

```bash
# Run migrations
./scripts/migrate.sh migrate

# Create backup
./scripts/migrate.sh backup

# Restore from backup
./scripts/migrate.sh restore backup_20241024_123456.sql

# Show database status
./scripts/migrate.sh status
```

## Health Monitoring

### Health Check Endpoints

- **Frontend**: `GET /health` → Returns "healthy"
- **Backend**: `GET /api/health` → Returns "OK"
- **Database**: PostgreSQL `pg_isready` check

### Docker Health Checks

All services include built-in Docker health checks:

```bash
# Check all service health
docker-compose -f docker-compose.prod.yml ps

# View detailed health status
docker inspect shopping-list-frontend-prod | grep -A 10 Health
```

## Backup and Recovery

### Automated Backups

Create regular database backups:

```bash
# Create backup with timestamp
./scripts/migrate.sh backup

# Backups are stored in ./backups/ directory
ls -la backups/
```

### Restore Process

1. **Stop the application:**
   ```bash
   ./scripts/deploy.sh stop
   ```

2. **Restore from backup:**
   ```bash
   ./scripts/migrate.sh restore backups/backup_20241024_123456.sql
   ```

3. **Restart the application:**
   ```bash
   ./scripts/deploy.sh deploy
   ```

## Security Considerations

### Network Security
- All services communicate through internal Docker network
- Only necessary ports are exposed to host
- Frontend acts as reverse proxy for API access

### Data Security
- Database credentials via environment variables
- No hardcoded passwords in configuration
- Regular security updates via base image updates

### Application Security
- Input validation and sanitization
- XSS protection headers
- Rate limiting (configure in Nginx if needed)

## Performance Optimization

### Frontend Optimization
- Static file caching with long expiration
- GZIP compression for text assets
- Optimized Nginx configuration
- CDN-ready static asset serving

### Backend Optimization
- HikariCP connection pooling
- JVM container optimizations
- Efficient WebSocket connection management
- Database query optimization with indexes

### Database Optimization
- Proper indexing on frequently queried columns
- Connection pooling configuration
- Regular maintenance and vacuuming

## Troubleshooting

### Common Issues

1. **Services won't start:**
   ```bash
   # Check logs
   ./scripts/deploy.sh logs
   
   # Check individual service
   docker-compose -f docker-compose.prod.yml logs backend
   ```

2. **Database connection issues:**
   ```bash
   # Check database health
   ./scripts/migrate.sh status
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
   ```

3. **Frontend not loading:**
   ```bash
   # Check Nginx configuration
   docker-compose -f docker-compose.prod.yml exec frontend nginx -t
   
   # Check API connectivity
   curl -f http://localhost:8080/api/health
   ```

### Log Analysis

```bash
# View all logs
./scripts/deploy.sh logs

# Follow specific service logs
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Check service health
./scripts/deploy.sh health

# Database performance
./scripts/migrate.sh status
```

## Scaling and High Availability

### Horizontal Scaling

For high-traffic scenarios, consider:

1. **Load Balancer**: Add Nginx load balancer for multiple backend instances
2. **Database Clustering**: PostgreSQL replication for read scaling
3. **Container Orchestration**: Kubernetes deployment for auto-scaling

### Monitoring Integration

The application is ready for integration with:

- **Prometheus**: Metrics collection from health endpoints
- **Grafana**: Dashboard visualization
- **ELK Stack**: Centralized logging
- **Alertmanager**: Alert notifications

## Updates and Maintenance

### Application Updates

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and deploy:**
   ```bash
   ./scripts/deploy.sh deploy
   ```

3. **Verify deployment:**
   ```bash
   ./scripts/deploy.sh health
   ```

### Database Maintenance

```bash
# Create backup before maintenance
./scripts/migrate.sh backup

# Run any new migrations
./scripts/migrate.sh migrate

# Check database status
./scripts/migrate.sh status
```

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review application logs
3. Verify configuration settings
4. Check Docker and system resources

Remember to always backup your data before making significant changes to the production environment.