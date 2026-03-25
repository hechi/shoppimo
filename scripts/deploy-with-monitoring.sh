#!/bin/bash

# Enhanced deployment script with monitoring for Shared Shopping List application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Dependencies check passed."
}

# Create .env file if it doesn't exist
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example template..."
        cp .env.example .env
        print_warning "Please edit .env file with your production settings before running again."
        print_warning "Especially change the POSTGRES_PASSWORD and update VITE_API_URL/VITE_WS_URL for your domain."
        exit 1
    fi
    
    # Set default monitoring credentials if not set
    if ! grep -q "GRAFANA_USER" .env; then
        echo "GRAFANA_USER=admin" >> .env
    fi
    
    if ! grep -q "GRAFANA_PASSWORD" .env; then
        echo "GRAFANA_PASSWORD=admin" >> .env
        print_warning "Default Grafana password is 'admin'. Please change it in .env file for production."
    fi
    
    print_status "Environment configuration ready."
}

# Deploy the main application
deploy_application() {
    print_status "Deploying main application..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down
    
    # Build images
    print_status "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    print_status "Starting application services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    print_status "Waiting for application services to be healthy..."
    sleep 30
    
    # Check application health
    check_application_health
}

# Deploy monitoring stack
deploy_monitoring() {
    print_status "Deploying monitoring stack..."
    
    # Create monitoring directories if they don't exist
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    
    # Start monitoring services
    print_status "Starting monitoring services..."
    docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
    
    # Wait for monitoring services
    print_status "Waiting for monitoring services to start..."
    sleep 20
    
    print_status "Monitoring stack deployed successfully!"
}

# Check if all application services are healthy
check_application_health() {
    print_status "Checking application service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Health check attempt $attempt/$max_attempts..."
        
        # Check database
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U shopping_user -d shopping_lists > /dev/null 2>&1; then
            print_status "✓ Database is healthy"
            db_healthy=true
        else
            print_warning "✗ Database health check failed"
            db_healthy=false
        fi
        
        # Check backend
        if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
            print_status "✓ Backend is healthy"
            backend_healthy=true
        else
            print_warning "✗ Backend health check failed"
            backend_healthy=false
        fi
        
        # Check frontend
        if curl -f http://localhost/health > /dev/null 2>&1; then
            print_status "✓ Frontend is healthy"
            frontend_healthy=true
        else
            print_warning "✗ Frontend health check failed"
            frontend_healthy=false
        fi
        
        if [ "$db_healthy" = true ] && [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ]; then
            print_status "All application services are healthy!"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo ""
    
    print_info "Application Services:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    print_info "Monitoring Services (if deployed):"
    docker-compose -f docker-compose.monitoring.yml ps 2>/dev/null || echo "Monitoring stack not deployed"
    
    echo ""
    print_status "Application URLs:"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:8080/api"
    echo "Health Check: http://localhost/health"
    echo "Metrics: http://localhost:8080/api/metrics"
    
    echo ""
    print_status "Monitoring URLs (if deployed):"
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3001 (admin/admin)"
    echo "AlertManager: http://localhost:9093"
    echo "cAdvisor: http://localhost:8081"
}

# Show logs
show_logs() {
    local service=${1:-""}
    
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker-compose -f docker-compose.prod.yml logs -f "$service"
    else
        print_status "Showing all application logs..."
        docker-compose -f docker-compose.prod.yml logs -f
    fi
}

# Stop all services
stop_services() {
    print_status "Stopping all services..."
    
    # Stop monitoring stack
    docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
    
    # Stop application
    docker-compose -f docker-compose.prod.yml down
    
    print_status "All services stopped."
}

# Main deployment flow
main() {
    echo "=== Shared Shopping List Enhanced Deployment ==="
    echo ""
    
    check_dependencies
    setup_environment
    deploy_application
    
    # Ask if user wants monitoring
    echo ""
    print_info "Would you like to deploy the monitoring stack? (Prometheus, Grafana, AlertManager)"
    read -p "Deploy monitoring? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_monitoring
    fi
    
    show_status
    
    echo ""
    print_status "Deployment completed successfully!"
    print_status "You can now access the application at http://localhost"
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Monitoring is available at:"
        print_info "- Grafana: http://localhost:3001 (admin/admin)"
        print_info "- Prometheus: http://localhost:9090"
        print_info "- AlertManager: http://localhost:9093"
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "app-only")
        check_dependencies
        setup_environment
        deploy_application
        show_status
        ;;
    "monitoring-only")
        check_dependencies
        setup_environment
        deploy_monitoring
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs "$2"
        ;;
    "status")
        show_status
        ;;
    "health")
        check_application_health
        ;;
    *)
        echo "Usage: $0 {deploy|app-only|monitoring-only|stop|logs|status|health}"
        echo ""
        echo "Commands:"
        echo "  deploy          - Deploy application and optionally monitoring (default)"
        echo "  app-only        - Deploy only the application"
        echo "  monitoring-only - Deploy only the monitoring stack"
        echo "  stop            - Stop all services"
        echo "  logs [service]  - Show logs (optionally for specific service)"
        echo "  status          - Show service status"
        echo "  health          - Check application health"
        exit 1
        ;;
esac