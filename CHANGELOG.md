# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dark Mode** — Light, dark, and system-preference theme toggle via `ThemeContext` and `ThemeToggle` component; applied across all pages and components
- **Smart Autocomplete** — `AutocompleteService` tracks item history cross-list; `AutocompleteDropdown` integrated into `AddItemForm` with keyboard navigation
- **Push Notifications** — Web Push opt-in via `PushNotificationContext` and `NotificationBell`; backend push subscription endpoints (`/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/vapid-key`) with VAPID signing; notifications triggered on list item changes
- **Push Subscription Storage** — New `PushSubscriptions` database table and repository in Kotlin backend
- **VAPID Key Support** — `PushNotificationService` with VAPID key configuration; VAPID env vars documented in `.env.example` and wired into Docker Compose files
- **Backend `.env` Auto-Loading** — `EnvLoader.kt` reads `.env` at startup for local development; gracefully falls back to OS env vars in production
- **PWA Service Worker** — Migrated VitePWA from `generateSW` to `injectManifest` for custom service worker with push event handling
- **E2E Tests** — Cypress tests for dark mode, autocomplete, and push notification UI flows
- Documentation for deploying with monitoring stack
- Comprehensive security and deployment guidelines
- Version management and changelog maintenance docs

### Changed

- README updated with dark mode, autocomplete, and push notification features; env vars table and API endpoints table expanded
- Improved Docker Compose configurations for better environment management

### Fixed

- **CORS preflight failure** — Removed `X-Device-Id` custom header from subscribe/unsubscribe fetch calls; `deviceId` is already in the JSON body, and the custom header was triggering CORS preflight rejections in production
- **CORS configuration** — Removed `allowCredentials = true` which is incompatible with `anyHost()` (the CORS spec forbids wildcard origin with credentials)
- Push notification infinite spinner — Added timeout guard on `navigator.serviceWorker.ready`; added VAPID fast-fail if keys are not configured
- WebPush API usage — Fixed VAPID key encoding and Web Push library reflection issues
- Code quality — Removed redundant `eslint-disable` comments; replaced `any` types; extracted i18n strings; deduplicated CSS classes
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
