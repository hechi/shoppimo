# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Documentation for deploying with monitoring stack
- Comprehensive security and deployment guidelines
- Version management and changelog maintenance docs

### Changed

- Improved Docker Compose configurations for better environment management

### Fixed

- Git tracking cleanup for sensitive environment files

## [5.0.0] - 2026-03-24

### Added

- **Public Open-Source Release**: Official GitHub public release of Shoppimo
- Real-time WebSocket synchronization for collaborative editing
- Progressive Web App (PWA) support with offline functionality
- Multi-language support (English and German) with i18n infrastructure
- Responsive design for mobile, tablet, and desktop
- Automatic list cleanup with configurable retention policies
- Docker-based deployment with monitoring stack
- Comprehensive API with CORS support
- Health check endpoints and monitoring integration with Prometheus
- Kotlin/Ktor backend with PostgreSQL database
- React 18 frontend with Vite bundler
- TypeScript throughout frontend and supporting tooling
- Cypress end-to-end testing
- Vitest unit testing framework
- GitHub Container Registry (GHCR) image distribution
- Automated CI/CD with GitHub Actions

### Tech Stack

**Frontend:**
- React 18 with Vite
- TypeScript
- TailwindCSS for styling
- PWA capabilities
- i18next for internationalization
- React Router for navigation
- Testing Library and Cypress for testing

**Backend:**
- Kotlin with Ktor web framework
- Exposed ORM for database access
- PostgreSQL for data persistence
- HikariCP connection pooling
- Logback for logging

**Infrastructure:**
- Docker & Docker Compose for containerization
- Prometheus for metrics collection
- Grafana for metrics visualization
- Alertmanager for alerting
- GitHub Container Registry for image distribution

### Repository

- GitHub Actions CI/CD pipelines for automated testing and releases
- Comprehensive documentation (deployment, security, production)
- MIT license (2026 Shoppimo Contributors)
- Professional open-source project structure

---

[Unreleased]: https://github.com/hechi/shoppimo/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/hechi/shoppimo/releases/tag/v5.0.0
