# GitHub Setup Instructions

This repository is pre-configured for public GitHub publication to:

```
https://github.com/hechi/shoppimo
```

All references throughout the repository assume this location. If you plan to use a different GitHub organization or repository name, you must manually update references across:

- `README.md`, `CONTRIBUTING.md`, `DEPLOYMENT.md`, `PRODUCTION.md`, `VERSIONING.md`, `CHANGELOG.md` (repository URLs and links)
- `frontend/package.json` (homepage, repository, bugs fields)
- `docker-compose.prod.yml` (GHCR image names: `ghcr.io/YOUR_ORG/YOUR_REPO/frontend` and `/backend`)
- `scripts/version-and-build.sh` and `scripts/release.sh` (GHCR registry path)

**Standard setup instructions below assume the pre-configured location.**

## Standard Setup (github.com/hechi/shoppimo)

Use the automated publication script for one-command setup:

```bash
./scripts/publish-to-github.sh
```

This script will:
1. ✅ Verify local project readiness
2. ✅ Configure Git remote automatically
3. ✅ Check GitHub repository accessibility
4. ✅ Push main branch and tags to GitHub

### Prerequisites

Before running the script:

**Option A: With GitHub CLI (recommended)**
- Install GitHub CLI: https://cli.github.com
  - macOS: `brew install gh`
  - Linux: `apt-get install gh` or `dnf install gh`
  - Windows: `choco install gh`
- Authenticate: `gh auth login`

The script will automatically create the repository if it doesn't exist.

**Option B: Without GitHub CLI**
- Manually create the repository at: https://github.com/new?name=shoppimo&visibility=public
- Configure Git: `git remote set-url origin https://github.com/hechi/shoppimo.git`
- The script will still handle the push

### Credential Setup

**SSH (recommended):**
```bash
ssh-keygen -t ed25519
ssh-add ~/.ssh/id_ed25519
# Add public key to GitHub: https://github.com/settings/keys
```

**HTTPS Token:**
```bash
# Generate token at https://github.com/settings/tokens (repo scope)
# Git will prompt for credentials on first push
```

### Manual Push (if script fails)

```bash
git remote set-url origin https://github.com/hechi/shoppimo.git
git push -u origin main --tags
```

## After First Push

### Verify Workflows Run
1. Go to `https://github.com/hechi/shoppimo/actions`
2. Confirm `CI` workflow passes on the `main` branch push
3. Confirm `Release` workflow triggers and completes for the `v5.0.0` tag

### Make Docker Images Public (Optional)

If you want users to pull Docker images without authentication:

1. Go to `https://github.com/hechi/shoppimo/packages`
2. For each package (`frontend`, `backend`):
   - Click package → Package settings
   - Change visibility to **Public**

### Enable Dependabot (Optional)
Create `.github/dependabot.yml` to keep dependencies auto-updated via PRs:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/frontend"
    schedule:
      interval: weekly
  - package-ecosystem: gradle
    directory: "/backend"
    schedule:
      interval: weekly
```

## Troubleshooting

### Workflows Don't Trigger

- Ensure GitHub Actions are enabled (Settings → Actions → General → Actions permissions)
- Ensure you pushed the `v5.0.0` tag to GitHub (the remote you set up in Step 2 above)

### Release Notes Are Empty
- Fallback: Use `generate_release_notes: true` (already enabled in `release.yml`)

### GHCR Images Can't Be Pulled
- GHCR packages inherit permissions from the repository
- If private: make the repo public or set package visibility to public (see "After First Push")

### Docker Compose Fails with "docker-compose: command not found"
- Use `docker compose` instead (requires Docker Desktop 4.0+ or Compose v2 plugin)
- Update scripts to use `docker compose` syntax if needed
