# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **AGENTS.md** — AI coding agent instructions covering project overview, tech stack, exact commands, coding conventions, development lifecycle (branch-per-change, Conventional Commits, CHANGELOG discipline), PR workflow, and three-tier boundaries (always/ask/never)

### Fixed
- **Flaky backend tests** — Resolved intermittent `PSQLException: Connection refused` errors in CI by fixing Testcontainers lifecycle mismatch (`@Container` moved to `companion object` for all `@TestInstance(PER_CLASS)` test classes) and disabling parallel test-class execution (`maxParallelForks = 1`) to prevent Exposed's global database registry from being overwritten mid-test by a concurrently running test class

## [6.3.0] - 2026-03-30

### Added

- **Swipe-to-delete** — List items can be swiped left on mobile to reveal a delete action; full swipe auto-deletes with a collapse animation; desktop retains hover-reveal delete with confirmation
- **Sticky bottom input** — Add Item form is fixed to the bottom of the screen on mobile for thumb-reachable access; desktop keeps it in the header
- **Bottom sheet settings** — Burger menu opens as a full-width bottom sheet on mobile, portaled to `document.body` to avoid z-index stacking issues; redesigned with section labels, title, and inline controls
- **Inline language switcher** — Replaced dropdown with a pill-style button group matching the theme toggle pattern
- **Tap delay elimination** — Added `touch-action: manipulation` globally to all interactive elements, removing the 300ms delay on mobile browsers
- **Smart autocomplete positioning** — Autocomplete dropdown flips above the input when there's insufficient space below (e.g., when the mobile keyboard is open)

### Fixed

- **Edit input overflow** — Fixed text input overflowing the screen on small devices in edit mode by adding `min-w-0` constraints

## [6.2.0] - 2026-03-26

### Added

- **Prometheus application metrics** — Replace JSON `/api/metrics` endpoint with Prometheus exposition format using Ktor MicrometerMetrics plugin; exposes `shoppimo_websocket_connections_total` (active WebSocket connections) and `shoppimo_shopping_lists_total` (total lists in database) alongside JVM and HTTP request metrics

## [6.1.0] - 2026-03-26

### Added

- **Detailed push notifications** — Replace generic "List updated" message with action-specific notifications: item added (✚), checked (✓), unchecked (↩), edited (✎), deleted (✕), and completed items cleared
- **Auto-subscribe with opt-out** — Users are automatically subscribed to push notifications when opening a list; per-list opt-out toggle persisted in localStorage

### Fixed

- **Push notification delivery** — Fix Base64 encoding mismatch between frontend (`btoa()` standard Base64) and backend (`Base64.getUrlDecoder()` URL-safe Base64) that silently broke push delivery
- **CORS preflight failure** — Pass `deviceId` as query parameter instead of `X-Device-Id` custom header to avoid CORS preflight rejections in production

## [6.0.1] - 2026-03-26

### Fixed

- **CORS configuration** — Removed `allowCredentials = true` which is incompatible with `anyHost()`; the CORS spec forbids wildcard origin with credentials, causing Ktor to silently drop all CORS headers

## [6.0.0] - 2026-03-26

### Added

- **Dark Mode** — Light, dark, and system-preference theme toggle via `ThemeContext` and `ThemeToggle` component; applied across all pages and components
- **Smart Autocomplete** — `AutocompleteService` tracks item history cross-list; `AutocompleteDropdown` integrated into `AddItemForm` with keyboard navigation
- **Push Notifications** — Web Push opt-in via `PushNotificationContext` and `NotificationBell`; backend push subscription endpoints (`/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/vapid-key`) with VAPID signing; notifications triggered on list item changes
- **Push Subscription Storage** — New `PushSubscriptions` database table and repository in Kotlin backend
- **VAPID Key Support** — `PushNotificationService` with VAPID key configuration; VAPID env vars documented in `.env.example` and wired into Docker Compose files
- **Backend `.env` Auto-Loading** — `EnvLoader.kt` reads `.env` at startup for local development; gracefully falls back to OS env vars in production
- **PWA Service Worker** — Migrated VitePWA from `generateSW` to `injectManifest` for custom service worker with push event handling
- **E2E Tests** — Cypress tests for dark mode, autocomplete, and push notification UI flows

### Changed

- README updated with dark mode, autocomplete, and push notification features; env vars table and API endpoints table expanded

### Fixed

- Push notification infinite spinner — Added timeout guard on `navigator.serviceWorker.ready`; added VAPID fast-fail if keys are not configured
- WebPush API usage — Fixed VAPID key encoding and Web Push library reflection issues
- Removed redundant `eslint-disable` comments; replaced `any` types; extracted i18n strings; deduplicated CSS classes

## [5.0.0] - 2026-03-25

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

[Unreleased]: https://github.com/hechi/shoppimo/compare/v6.2.0...HEAD
[6.2.0]: https://github.com/hechi/shoppimo/compare/v6.1.0...v6.2.0
[6.1.0]: https://github.com/hechi/shoppimo/compare/v6.0.2...v6.1.0
[6.0.1]: https://github.com/hechi/shoppimo/compare/v6.0.0...v6.0.1
[6.0.0]: https://github.com/hechi/shoppimo/compare/v5.0.0...v6.0.0
[5.0.0]: https://github.com/hechi/shoppimo/releases/tag/v5.0.0

