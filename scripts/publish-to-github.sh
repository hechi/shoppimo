#!/bin/bash
#
# publish-to-github.sh
# Publishes Shoppimo to GitHub with full verification and error handling
#
# Usage: ./scripts/publish-to-github.sh
#
# Prerequisites:
#   - Git with SSH or HTTPS credentials configured
#   - GitHub account at https://github.com
#   - Optional: GitHub CLI (gh) for automatic repository creation
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GITHUB_REPO="hechi/shoppimo"
GITHUB_URL="https://github.com/${GITHUB_REPO}"
EXPECTED_VERSION="5.0.0"
GH_AVAILABLE=false
PUSH_COMPLETED=false

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Check prerequisites
verify_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
  fi
  log_success "Git is installed"

  if command -v gh &> /dev/null; then
    log_success "GitHub CLI (gh) is available"
    GH_AVAILABLE=true
  else
    log_warning "GitHub CLI (gh) is not installed"
    log_info "Installation: https://cli.github.com"
    log_info "Without gh, you must create the GitHub repo manually"
  fi
}

# Verify local project state
verify_local_readiness() {
  log_info "Verifying local project readiness..."

  # Check working tree: both staged and unstaged changes
  if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    log_error "Working tree has uncommitted or untracked changes"
    log_info "Run: git status"
    exit 1
  fi
  log_success "Working tree is clean"

  # Verify versions
  FRONTEND_VERSION=$(grep '"version"' frontend/package.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  if [[ "$FRONTEND_VERSION" != "$EXPECTED_VERSION" ]]; then
    log_error "Frontend version is $FRONTEND_VERSION, expected $EXPECTED_VERSION"
    exit 1
  fi
  log_success "Frontend version: $EXPECTED_VERSION"

  BACKEND_VERSION=$(grep 'version = ' backend/build.gradle.kts | head -1 | sed 's/.*= "\([^"]*\)".*/\1/')
  if [[ "$BACKEND_VERSION" != "$EXPECTED_VERSION" ]]; then
    log_error "Backend version is $BACKEND_VERSION, expected $EXPECTED_VERSION"
    exit 1
  fi
  log_success "Backend version: $EXPECTED_VERSION"

  # Verify tag points to HEAD
  TAG_COMMIT=$(git rev-list -n 1 "v${EXPECTED_VERSION}" 2>/dev/null || echo "")
  HEAD_COMMIT=$(git rev-parse HEAD)
  if [[ "$TAG_COMMIT" != "$HEAD_COMMIT" ]]; then
    log_error "Tag v${EXPECTED_VERSION} does not point to HEAD"
    log_info "Tag is at: $TAG_COMMIT"
    log_info "HEAD is at: $HEAD_COMMIT"
    exit 1
  fi
  log_success "Tag v${EXPECTED_VERSION} points to HEAD"

  # Check documentation
   for doc in README.md LICENSE CONTRIBUTING.md SECURITY.md DEPLOYMENT.md VERSIONING.md CODE_OF_CONDUCT.md .github/GITHUB_SETUP.md; do
    if [[ ! -f "$doc" ]]; then
      log_error "Missing: $doc"
      exit 1
    fi
  done
  log_success "Documentation complete"

  # Check workflows
  if [[ ! -f ".github/workflows/ci.yml" ]] || [[ ! -f ".github/workflows/release.yml" ]]; then
    log_error "GitHub workflows not found"
    exit 1
  fi
  log_success "CI/CD workflows configured"

  # Check .env gitignored
  if git ls-files | grep -q "^\.env$"; then
    log_error ".env is tracked in git"
    exit 1
  fi
  log_success ".env is gitignored"

  log_success "Local readiness: ALL CHECKS PASSED"
}

# Ensure GitHub repository exists
ensure_repository() {
  if [[ "$GH_AVAILABLE" != "true" ]]; then
    log_warning "GitHub CLI not available—repository must exist or be created manually"
    log_info ""
    log_info "To create the repository manually:"
    log_info "  1. Go to: https://github.com/new"
    log_info "  2. Name: shoppimo"
    log_info "  3. Visibility: Public"
    log_info "  4. Do NOT initialize with README/LICENSE"
    log_info "  5. Click 'Create repository'"
    log_info ""
     log_info "After creating the repository, confirm the push prompt below."
    return
  fi

  log_info "Checking GitHub repository..."

  if gh repo view "$GITHUB_REPO" > /dev/null 2>&1; then
    log_success "Repository exists: $GITHUB_URL"
    return
  fi

   log_info "Repository does not exist. Creating with gh..."
   if gh repo create "$GITHUB_REPO" --public --source=. --remote=origin --push > /dev/null 2>&1; then
     log_success "Repository created and initial push completed"
     PUSH_COMPLETED=true
     return
  else
    log_warning "Could not auto-create repository with gh"
    log_info "Create manually at: https://github.com/new?name=shoppimo"
  fi
}

# Configure Git remote
configure_remote() {
  log_info "Configuring Git remote..."

  CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

  if [[ -z "$CURRENT_REMOTE" ]]; then
    # No origin remote, add it (preserve user's SSH/HTTPS preference)
    # Default to HTTPS, but support SSH if user has it configured
    if [[ -f ~/.ssh/id_rsa ]] || [[ -f ~/.ssh/id_ed25519 ]]; then
      REMOTE_URL="git@github.com:hechi/shoppimo.git"
      log_info "Using SSH remote (SSH key found)"
    else
      REMOTE_URL="$GITHUB_URL.git"
      log_info "Using HTTPS remote"
    fi
    git remote add origin "$REMOTE_URL"
  elif [[ ! "$CURRENT_REMOTE" =~ "hechi/shoppimo" ]]; then
    # Wrong remote, update it (preserve SSH vs HTTPS)
    if [[ "$CURRENT_REMOTE" =~ "^git@" ]]; then
      NEW_REMOTE="git@github.com:hechi/shoppimo.git"
    else
      NEW_REMOTE="$GITHUB_URL.git"
    fi
    log_warning "Updating origin remote to: $NEW_REMOTE"
    git remote set-url origin "$NEW_REMOTE"
  else
    log_success "origin remote already correct"
    return
  fi

  log_success "Git remote configured"
}

# Execute push
execute_push() {
  log_info "Pushing to GitHub..."
  log_info "  Branch: main"
  log_info "  Tags: v${EXPECTED_VERSION}"
  log_info ""

  if ! git push -u origin main --tags; then
    log_error "Push failed"
    log_info ""
    log_info "Troubleshooting:"
    log_info "  1. Check credentials are configured:"
    log_info "     - SSH: ssh -T git@github.com"
    log_info "     - HTTPS: git ls-remote origin"
    log_info "  2. For SSH auth: ssh-keygen -t ed25519 && ssh-add"
    log_info "  3. For HTTPS: Generate token at https://github.com/settings/tokens"
    log_info "  4. Verify repo exists at: $GITHUB_URL"
    exit 1
  fi

  log_success "Push completed"
}

# Verify push succeeded
verify_push() {
  log_info "Verifying push succeeded..."

  sleep 2

  # Check repo is accessible
  if git ls-remote origin HEAD > /dev/null 2>&1; then
    log_success "Repository is accessible"
  else
    log_warning "Could not verify repository accessibility (may be loading)"
  fi

  # Check tag is on remote
   if git ls-remote origin "refs/tags/v${EXPECTED_VERSION}" 2>/dev/null | grep -q .; then
    log_success "Tag v${EXPECTED_VERSION} is on GitHub"
  else
    log_warning "Could not verify tag on remote"
  fi
}

# Main
main() {
  echo ""
  log_info "=========================================="
  log_info "Shoppimo GitHub Publication"
  log_info "=========================================="
  echo ""

  verify_prerequisites
  echo ""

  verify_local_readiness
  echo ""

  configure_remote
  echo ""

   ensure_repository
   echo ""

   if [[ "$PUSH_COMPLETED" != "true" ]]; then
     log_warning "Ready to push to GitHub:"
     log_warning "  Repository: $GITHUB_URL"
     log_warning "  Branch: main"
     log_warning "  Tags: v${EXPECTED_VERSION}"
     echo ""
     read -p "Continue with push? (y/N) " -n 1 -r
     echo
     if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       log_info "Aborted"
       exit 0
     fi

     echo ""
     execute_push
   else
     log_success "Push already completed during repository creation"
   fi
   echo ""

  verify_push
  echo ""

  log_success "PUBLICATION COMPLETE!"
  echo ""
  echo "Next steps:"
  echo "  1. Repository: $GITHUB_URL"
  echo "  2. Workflows: $GITHUB_URL/actions"
  echo "  3. CI should run on 'main' push"
  echo "  4. Release workflow should run on v${EXPECTED_VERSION} tag"
  echo ""
}

main "$@"
