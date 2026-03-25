#!/bin/bash

# Script to update frontend configuration at runtime without rebuilding

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
    echo "  --restart           Restart frontend container after update"
    echo ""
    echo "Examples:"
    echo "  $0 192.168.1.100"
    echo "  $0 example.com --protocol https --restart"
    echo "  $0 my-server.local --http-port 3000 --restart"
}

main() {
    local domain="$1"
    local protocol="http"
    local http_port="8080"
    local ws_port=""
    local restart_container=false
    
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
            --restart)
                restart_container=true
                shift
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
    
    print_status "Updating frontend configuration:"
    echo "  Domain: $domain"
    echo "  API URL: $api_url"
    echo "  WebSocket URL: $ws_url"
    echo ""
    
    # Create config directory if it doesn't exist
    mkdir -p config
    
    # Update the mounted config file
    print_status "Updating config/frontend-config.js..."
    cat > config/frontend-config.js << EOF
// Production runtime configuration
// This file is mounted into the frontend container at runtime
// Updated: $(date)
window.APP_CONFIG = {
  API_URL: '$api_url',
  WS_URL: '$ws_url'
};
EOF
    
    print_status "Configuration file updated successfully!"
    
    if [ "$restart_container" = true ]; then
        print_status "Restarting frontend container..."
        if docker-compose -f docker-compose.prod.yml restart frontend; then
            print_status "Frontend container restarted successfully!"
        else
            print_warning "Failed to restart frontend container. You may need to restart it manually:"
            echo "  docker-compose -f docker-compose.prod.yml restart frontend"
        fi
    else
        print_warning "Configuration updated. Restart the frontend container to apply changes:"
        echo "  docker-compose -f docker-compose.prod.yml restart frontend"
    fi
    
    echo ""
    print_status "The frontend will now use:"
    echo "  API: $api_url"
    echo "  WebSocket: $ws_url"
}

main "$@"