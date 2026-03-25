#!/bin/bash

# Deployment script for Shared Shopping List application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    
    print_status "Environment configuration ready."
}

# Build and deploy the application
deploy() {
    print_status "Starting deployment..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down
    
    # Build images
    print_status "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_health
}

# Check if all services are healthy
check_health() {
    print_status "Checking service health..."
    
    # Check database
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U shopping_user -d shopping_lists > /dev/null 2>&1; then
        print_status "Database is healthy"
    else
        print_error "Database health check failed"
        return 1
    fi
    
    # Check backend
    if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_status "All services are healthy!"
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    print_status "Application URLs:"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:8080/api"
    echo "Health Check: http://localhost/health"
}

# Main deployment flow
main() {
    echo "=== Shared Shopping List Deployment ==="
    echo ""
    
    check_dependencies
    setup_environment
    deploy
    show_status
    
    echo ""
    print_status "Deployment completed successfully!"
    print_status "You can now access the application at http://localhost"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose -f docker-compose.prod.yml down
        print_status "Services stopped."
        ;;
    "logs")
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "status")
        show_status
        ;;
    "health")
        check_health
        ;;
    *)
        echo "Usage: $0 {deploy|stop|logs|status|health}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the application (default)"
        echo "  stop    - Stop all services"
        echo "  logs    - Show and follow logs"
        echo "  status  - Show service status"
        echo "  health  - Check service health"
        exit 1
        ;;
esac