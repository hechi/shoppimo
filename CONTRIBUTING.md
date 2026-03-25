# Contributing to Shoppimo

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please check the [existing issues](../../issues) to avoid duplicates.

When filing a bug report, please include:
- A clear, descriptive title
- Steps to reproduce the problem
- Expected vs. actual behavior
- Your environment (OS, browser, Docker version)
- Relevant logs or screenshots

Use the **Bug Report** issue template when creating the issue.

### Suggesting Features

Feature requests are welcome! Please:
- Check the existing issues first
- Use the **Feature Request** issue template
- Describe the problem you're trying to solve, not just the solution
- Be open to discussion about alternative approaches

### Submitting Pull Requests

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/my-bug-fix
   ```

2. **Set up the development environment** (see [README.md](README.md#development-setup)).

3. **Make your changes**, keeping the following in mind:
   - Write clear, focused commits
   - Add or update tests for your changes
   - Keep PRs small and focused on a single concern

4. **Run the test suite** before submitting:
   ```bash
   # Frontend tests
   cd frontend && npm test

   # Backend tests
   cd backend && ./gradlew test
   ```

5. **Open a Pull Request** against the `main` branch using the PR template.

## Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `chore/` | Maintenance, tooling, refactoring |
| `test/` | Test additions or corrections |

## Development Setup

See [README.md](README.md#development-setup) for full instructions. The quickest way to get started:

```bash
git clone https://github.com/hechi/shoppimo.git
cd shoppimo
cp .env.example .env
docker compose up -d
```

## Project Structure

```
├── frontend/     # React + Vite + TypeScript + TailwindCSS
├── backend/      # Kotlin + Ktor + Exposed (PostgreSQL)
├── monitoring/   # Prometheus + Grafana + Alertmanager config
└── scripts/      # Helper scripts for deployment and maintenance
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) style:

```
feat: add item reordering via drag-and-drop
fix: prevent duplicate items on rapid input
docs: clarify environment variable setup
chore: upgrade Ktor to 2.3.8
```

## Questions?

Open a [Discussion](../../discussions) or an issue marked with the `question` label.
