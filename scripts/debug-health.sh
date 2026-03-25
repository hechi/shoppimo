#!/bin/bash

# Debug script for health check issues

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check container status
check_containers() {
    print_header "Container Status:"
    docker-compose -f docker-compose.prod.yml ps
    echo ""
}

# Check backend logs
check_backend_logs() {
    print_header "Backend Logs (last 50 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
    echo ""
}

# Test health endpoint manually
test_health_endpoint() {
    print_header "Testing health endpoint manually:"
    
    # Get backend container IP
    local backend_ip=$(docker inspect shopping-list-backend-prod --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")
    
    if [ -n "$backend_ip" ]; then
        print_status "Backend container IP: $backend_ip"
        
        # Test from host
        print_status "Testing from host (localhost:8080):"
        curl -v http://localhost:8080/api/health 2>&1 || print_error "Failed to connect from host"
        echo ""
        
        # Test from container network
        print_status "Testing from container network:"
        docker run --rm --network shopping-list_shopping-network curlimages/curl:latest \
            curl -v http://shopping-list-backend-prod:8080/api/health 2>&1 || print_error "Failed to connect from container network"
        echo ""
    else
        print_error "Backend container not found or not running"
    fi
}

# Check if backend is listening on port 8080
check_backend_port() {
    print_header "Checking if backend is listening on port 8080:"
    
    # Check from inside the container
    docker exec shopping-list-backend-prod netstat -tlnp 2>/dev/null | grep :8080 || \
    docker exec shopping-list-backend-prod ss -tlnp 2>/dev/null | grep :8080 || \
    print_error "Backend not listening on port 8080"
    echo ""
}

# Check environment variables
check_env_vars() {
    print_header "Backend Environment Variables:"
    docker exec shopping-list-backend-prod env | grep -E "(DATABASE|PORT)" || true
    echo ""
}

# Main function
main() {
    echo "=== Backend Health Check Debug ==="
    echo ""
    
    check_containers
    check_backend_logs
    check_env_vars
    check_backend_port
    test_health_endpoint
    
    echo ""
    print_status "Debug complete. Check the output above for issues."
    print_warning "If backend is not starting, check the logs for database connection issues."
    print_warning "If backend is starting but health check fails, verify the /api/health endpoint."
}

main "$@"