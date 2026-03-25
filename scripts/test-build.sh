#!/bin/bash

# Test Docker builds without versioning or pushing

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

# Test backend build
test_backend() {
    print_status "Testing backend Docker build..."
    
    if docker build -f backend/Dockerfile.prod -t test-backend ./backend; then
        print_status "✅ Backend build successful"
        
        # Show image size
        local size=$(docker images test-backend --format "table {{.Size}}" | tail -n 1)
        print_status "Backend image size: $size"
        
        return 0
    else
        print_error "❌ Backend build failed"
        return 1
    fi
}

# Test frontend build
test_frontend() {
    print_status "Testing frontend Docker build..."
    
    if docker build -f frontend/Dockerfile.prod -t test-frontend ./frontend; then
        print_status "✅ Frontend build successful"
        
        # Show image size
        local size=$(docker images test-frontend --format "table {{.Size}}" | tail -n 1)
        print_status "Frontend image size: $size"
        
        return 0
    else
        print_error "❌ Frontend build failed"
        return 1
    fi
}

# Clean up test images
cleanup() {
    print_status "Cleaning up test images..."
    docker rmi test-backend test-frontend 2>/dev/null || true
    print_status "Cleanup complete"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMPONENT]"
    echo ""
    echo "COMPONENT:"
    echo "  backend   - Test only backend build"
    echo "  frontend  - Test only frontend build"
    echo "  both      - Test both builds (default)"
    echo "  clean     - Clean up test images"
    echo ""
    echo "Examples:"
    echo "  $0              # Test both"
    echo "  $0 backend      # Test backend only"
    echo "  $0 frontend     # Test frontend only"
    echo "  $0 clean        # Clean up test images"
}

# Main function
main() {
    local component="${1:-both}"
    
    echo "=== Docker Build Test ==="
    echo ""
    
    case "$component" in
        "backend")
            test_backend
            ;;
        "frontend")
            test_frontend
            ;;
        "both")
            local backend_success=true
            local frontend_success=true
            
            test_backend || backend_success=false
            echo ""
            test_frontend || frontend_success=false
            
            echo ""
            echo "=== Test Summary ==="
            if [ "$backend_success" = true ] && [ "$frontend_success" = true ]; then
                print_status "✅ All builds successful! Ready for release."
            else
                print_error "❌ Some builds failed. Fix issues before release."
                exit 1
            fi
            ;;
        "clean")
            cleanup
            ;;
        "--help"|"-h"|"help")
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown component: $component"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"