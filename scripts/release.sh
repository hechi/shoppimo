#!/bin/bash

# Quick release script - wrapper around version-and-build.sh
# This provides common release workflows

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_SCRIPT="$SCRIPT_DIR/version-and-build.sh"

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
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "COMMANDS:"
    echo "  patch     - Create patch release (x.x.X)"
    echo "  minor     - Create minor release (x.X.0)"  
    echo "  major     - Create major release (X.0.0)"
    echo "  hotfix    - Create patch release (alias for patch)"
    echo "  feature   - Create minor release (alias for minor)"
    echo "  breaking  - Create major release (alias for major)"
    echo ""
    echo "This script will:"
    echo "  1. Check git status and dependencies"
    echo "  2. Calculate next semantic version"
    echo "  3. Create and push git tag"
    echo "  4. Build Docker images for backend and frontend"
    echo "  5. Push images to ghcr.io/hechi/shoppimo registry"
    echo ""
    echo "Examples:"
    echo "  $0 patch    # Bug fixes: 1.0.0 -> 1.0.1"
    echo "  $0 minor    # New features: 1.0.1 -> 1.1.0"
    echo "  $0 major    # Breaking changes: 1.1.0 -> 2.0.0"
}

main() {
    local command="${1:-patch}"
    
    case "$command" in
        patch|hotfix)
            print_status "Creating patch release..."
            "$VERSION_SCRIPT" patch
            ;;
        minor|feature)
            print_status "Creating minor release..."
            "$VERSION_SCRIPT" minor
            ;;
        major|breaking)
            print_status "Creating major release..."
            "$VERSION_SCRIPT" major
            ;;
        --help|-h|help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"