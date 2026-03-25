# Versioning and Release Process

This project uses semantic versioning with automated Docker image building and registry pushing.

## Quick Start

For most releases, use the simple release script:

```bash
# Bug fixes (patch release: 1.0.0 -> 1.0.1)
./scripts/release.sh patch

# New features (minor release: 1.0.1 -> 1.1.0)  
./scripts/release.sh minor

# Breaking changes (major release: 1.1.0 -> 2.0.0)
./scripts/release.sh major
```

## Advanced Usage

For more control, use the main versioning script:

```bash
# Standard semantic versioning
./scripts/version-and-build.sh patch   # x.x.X
./scripts/version-and-build.sh minor   # x.X.0
./scripts/version-and-build.sh major   # X.0.0

# Custom version
./scripts/version-and-build.sh custom --version 2.1.0

# Build without pushing to registry
./scripts/version-and-build.sh patch --no-push

# Dry run to see what would happen
./scripts/version-and-build.sh minor --dry-run
```

## What the Scripts Do

1. **Check Dependencies**: Ensures git, docker, and jq are installed
2. **Validate Git Status**: Confirms working directory is clean
3. **Calculate Version**: Determines next semantic version based on current git tags
4. **Create Git Tag**: Creates and pushes a new version tag (e.g., `v1.2.3`)
5. **Build Images**: Builds production Docker images for backend and frontend
6. **Push to Registry**: Pushes images to `ghcr.io/hechi/shoppimo`

## Registry Images

The following images are built and pushed:

- `ghcr.io/hechi/shoppimo/backend:VERSION`
- `ghcr.io/hechi/shoppimo/backend:latest`
- `ghcr.io/hechi/shoppimo/frontend:VERSION`
- `ghcr.io/hechi/shoppimo/frontend:latest`

## Deployment

After a successful release, update your production docker-compose file to use the new version:

```yaml
services:
  backend:
    image: ghcr.io/hechi/shoppimo/backend:1.2.3
  frontend:
    image: ghcr.io/hechi/shoppimo/frontend:1.2.3
```

## Prerequisites

- Clean git working directory (no uncommitted changes)
- Docker daemon running
- GitHub credentials for GHCR (see [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry))
- Required tools: `git`, `docker`, `jq`

## Semantic Versioning Guidelines

- **Patch** (x.x.X): Bug fixes, security patches, minor improvements
- **Minor** (x.X.0): New features, backwards-compatible changes
- **Major** (X.0.0): Breaking changes, major refactors, API changes

## Troubleshooting

### "Working directory is not clean"
Commit or stash your changes before running the release script.

### "Docker push failed"
Ensure you're logged into GHCR:
```bash
docker login ghcr.io
```

### "Missing dependencies"
Install required tools:
```bash
# Ubuntu/Debian
sudo apt-get install git docker.io jq

# macOS
brew install git docker jq
```