#!/bin/bash

# Version, build and push script for Shoppimo application
# Uses semantic versioning with git tags and pushes to ghcr.io/hechi/shoppimo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="ghcr.io/hechi/shoppimo"
BACKEND_IMAGE="$REGISTRY/backend"
FRONTEND_IMAGE="$REGISTRY/frontend"

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

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [VERSION_TYPE] [OPTIONS]"
    echo ""
    echo "VERSION_TYPE:"
    echo "  patch    - Increment patch version (x.x.X) - default"
    echo "  minor    - Increment minor version (x.X.0)"
    echo "  major    - Increment major version (X.0.0)"
    echo "  custom   - Use custom version (requires --version)"
    echo ""
    echo "OPTIONS:"
    echo "  --version VERSION    - Custom version (use with 'custom')"
    echo "  --no-push           - Build images but don't push to registry"
    echo "  --dry-run           - Show what would be done without executing"
    echo "  --help              - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Increment patch version"
    echo "  $0 minor                     # Increment minor version"
    echo "  $0 custom --version 2.1.0   # Use custom version"
    echo "  $0 patch --no-push          # Build but don't push"
}

# Check if required tools are installed
check_dependencies() {
    print_header "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing tools and try again."
        exit 1
    fi
    
    print_status "All dependencies are available."
}

# Check if we're in a git repository and working directory is clean
check_git_status() {
    print_header "Checking git repository status..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository."
        exit 1
    fi
    
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Working directory is not clean. Please commit or stash your changes."
        git status --short
        exit 1
    fi
    
    print_status "Git repository is clean."
}

# Get the latest git tag version
get_latest_version() {
    local latest_tag
    latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    
    # Remove 'v' prefix if present
    latest_tag=${latest_tag#v}
    
    echo "$latest_tag"
}

# Parse semantic version into components
parse_version() {
    local version=$1
    local regex="^([0-9]+)\.([0-9]+)\.([0-9]+)$"
    
    if [[ $version =~ $regex ]]; then
        echo "${BASH_REMATCH[1]} ${BASH_REMATCH[2]} ${BASH_REMATCH[3]}"
    else
        print_error "Invalid version format: $version"
        print_error "Expected format: MAJOR.MINOR.PATCH (e.g., 1.2.3)"
        exit 1
    fi
}

# Calculate next version based on type
calculate_next_version() {
    local current_version=$1
    local version_type=$2
    local custom_version=$3
    
    if [ "$version_type" = "custom" ]; then
        if [ -z "$custom_version" ]; then
            print_error "Custom version type requires --version parameter"
            exit 1
        fi
        echo "$custom_version"
        return
    fi
    
    read -r major minor patch <<< "$(parse_version "$current_version")"
    
    case $version_type in
        "patch")
            echo "$major.$minor.$((patch + 1))"
            ;;
        "minor")
            echo "$major.$((minor + 1)).0"
            ;;
        "major")
            echo "$((major + 1)).0.0"
            ;;
        *)
            print_error "Invalid version type: $version_type"
            exit 1
            ;;
    esac
}

# Create and push git tag
create_git_tag() {
    local version=$1
    local tag="v$version"
    
    print_header "Creating git tag: $tag"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_status "[DRY RUN] Would create tag: $tag"
        return
    fi
    
    git tag -a "$tag" -m "Release version $version"
    git push origin "$tag"
    
    print_status "Created and pushed tag: $tag"
}

# Build Docker image
build_image() {
    local context=$1
    local dockerfile=$2
    local image_name=$3
    local version=$4
    
    print_header "Building $image_name:$version"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_status "[DRY RUN] Would build: $image_name:$version"
        return
    fi
    
    docker build \
        -t "$image_name:$version" \
        -t "$image_name:latest" \
        -f "$dockerfile" \
        "$context"
    
    print_status "Built $image_name:$version"
}

# Push Docker image to registry
push_image() {
    local image_name=$1
    local version=$2
    
    print_header "Pushing $image_name to registry"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_status "[DRY RUN] Would push: $image_name:$version and $image_name:latest"
        return
    fi
    
    if [ "$NO_PUSH" = "true" ]; then
        print_warning "Skipping push (--no-push flag set)"
        return
    fi
    
    docker push "$image_name:$version"
    docker push "$image_name:latest"
    
    print_status "Pushed $image_name:$version and $image_name:latest"
}

# Build all images
build_all_images() {
    local version=$1
    
    print_header "Building all Docker images for version $version"
    
    # Build backend image
    build_image "./backend" "./backend/Dockerfile.prod" "$BACKEND_IMAGE" "$version"
    
    # Build frontend image  
    build_image "./frontend" "./frontend/Dockerfile.prod" "$FRONTEND_IMAGE" "$version"
}

# Push all images
push_all_images() {
    local version=$1
    
    print_header "Pushing all Docker images for version $version"
    
    push_image "$BACKEND_IMAGE" "$version"
    push_image "$FRONTEND_IMAGE" "$version"
}

# Generate build summary
show_summary() {
    local version=$1
    
    echo ""
    echo "=================================="
    echo "         BUILD SUMMARY"
    echo "=================================="
    echo "Version: $version"
    echo "Registry: $REGISTRY"
    echo ""
    echo "Images built:"
    echo "  - $BACKEND_IMAGE:$version"
    echo "  - $BACKEND_IMAGE:latest"
    echo "  - $FRONTEND_IMAGE:$version"
    echo "  - $FRONTEND_IMAGE:latest"
    echo ""
    
    if [ "$NO_PUSH" = "true" ]; then
        echo "Images were built locally but not pushed to registry."
    elif [ "$DRY_RUN" = "true" ]; then
        echo "This was a dry run - no actual changes were made."
    else
        echo "Images have been pushed to registry and are ready for deployment."
        echo ""
        echo "To deploy this version, update your docker-compose.prod.yml to use:"
        echo "  backend: $BACKEND_IMAGE:$version"
        echo "  frontend: $FRONTEND_IMAGE:$version"
    fi
    echo "=================================="
}

# Main function
main() {
    local version_type="${1:-patch}"
    local custom_version=""
    local NO_PUSH=false
    local DRY_RUN=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                custom_version="$2"
                shift 2
                ;;
            --no-push)
                NO_PUSH=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            patch|minor|major|custom)
                version_type="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo "=== Shoppimo Version & Build Script ==="
    echo ""
    
    check_dependencies
    check_git_status
    
    # Get current version and calculate next
    local current_version
    current_version=$(get_latest_version)
    print_status "Current version: $current_version"
    
    local next_version
    next_version=$(calculate_next_version "$current_version" "$version_type" "$custom_version")
    print_status "Next version: $next_version"
    
    # Validate new version format
    parse_version "$next_version" > /dev/null
    
    if [ "$DRY_RUN" = "false" ]; then
        echo ""
        read -p "Proceed with version $next_version? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Aborted by user."
            exit 0
        fi
    fi
    
    # Create git tag
    create_git_tag "$next_version"
    
    # Build images
    build_all_images "$next_version"
    
    # Push images (if not disabled)
    push_all_images "$next_version"
    
    # Show summary
    show_summary "$next_version"
    
    print_status "Version and build process completed successfully!"
}

# Export variables for use in functions
export NO_PUSH DRY_RUN

# Run main function with all arguments
main "$@"