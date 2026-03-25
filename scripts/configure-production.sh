#!/bin/bash

# Script to configure production URLs after deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_usage() {
    echo "Usage: $0 <DOMAIN> [OPTIONS]"
    echo ""
    echo "DOMAIN: Your production domain (e.g., example.com or 192.168.1.100)"
    echo ""
    echo "OPTIONS:"
    echo "  --http-port PORT    Backend HTTP port (default: 8080)"
    echo "  --ws-port PORT      WebSocket port (default: same as HTTP port)"
    echo "  --protocol PROTO    Protocol (http or https, default: http)"
    echo ""
    echo "Examples:"
    echo "  $0 example.com"
    echo "  $0 192.168.1.100 --protocol https --http-port 8080"
    echo "  $0 my-server.local --http-port 3000"
}

main() {
    local domain="$1"
    local protocol="http"
    local http_port="8080"
    local ws_port=""
    
    if [ -z "$domain" ]; then
        echo "Error: Domain is required"
        show_usage
        exit 1
    fi
    
    # Parse arguments
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --protocol)
                protocol="$2"
                shift 2
                ;;
            --http-port)
                http_port="$2"
                shift 2
                ;;
            --ws-port)
                ws_port="$2"
                shift 2
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Set WebSocket port to HTTP port if not specified
    if [ -z "$ws_port" ]; then
        ws_port="$http_port"
    fi
    
    # Determine WebSocket protocol
    local ws_protocol="ws"
    if [ "$protocol" = "https" ]; then
        ws_protocol="wss"
    fi
    
    # Build URLs
    local api_url="${protocol}://${domain}:${http_port}"
    local ws_url="${ws_protocol}://${domain}:${ws_port}"
    
    print_status "Configuring production URLs:"
    echo "  Domain: $domain"
    echo "  API URL: $api_url"
    echo "  WebSocket URL: $ws_url"
    echo ""
    
    # Update .env file
    print_status "Updating .env file..."
    sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=$api_url|" .env
    sed -i.bak "s|VITE_WS_URL=.*|VITE_WS_URL=$ws_url|" .env
    
    # Update runtime config file (both locations)
    print_status "Updating runtime config files..."
    
    # Create config directory if it doesn't exist
    mkdir -p config
    
    # Update the mounted config file
    cat > config/frontend-config.js << EOF
// Production runtime configuration
// This file is mounted into the frontend container at runtime
window.APP_CONFIG = {
  API_URL: '$api_url',
  WS_URL: '$ws_url'
};
EOF
    
    # Also update the build-time config for consistency
    cat > frontend/public/config.js << EOF
// Runtime configuration for production deployment
// This file can be modified after build to change API endpoints
window.APP_CONFIG = {
  API_URL: '$api_url',
  WS_URL: '$ws_url'
};
EOF
    
    print_status "Configuration updated successfully!"
    print_warning "If you're using pre-built images, you'll need to rebuild and push new images:"
    echo "  ./scripts/release.sh patch"
    echo ""
    print_warning "Or update the config.js file directly in your deployed frontend container."
}

main "$@"