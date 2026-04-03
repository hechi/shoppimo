# AGENTS.md — Shoppimo

> Instructions for AI coding agents working on this repository.
> Human developers: see [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Project Overview

Shoppimo is a **real-time collaborative shopping list app** — no accounts required, share via UUID link, live sync via WebSockets. It is a full-stack monorepo with a React/TypeScript frontend and a Kotlin/Ktor backend backed by PostgreSQL.

## Tech Stack

| Layer | Technology & Version |
|---|---|
| Frontend | React 18, TypeScript 5.2, Vite 5, TailwindCSS 3, Vitest 4, Cypress 15 |
| Backend | Kotlin (JVM 17), Ktor 2, Exposed ORM, PostgreSQL |
| Infra | Docker Compose (dev / prod / monitoring stacks) |
| Monitoring | Prometheus (Micrometer), Grafana, Alertmanager |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

## Commands

### Frontend (`frontend/`)
```bash
npm install          # install dependencies
npm run dev          # dev server → http://localhost:3000
npm run build        # TypeScript check + Vite production build
npm test             # run Vitest unit tests (non-interactive)
npm run test:watch   # Vitest in watch mode
npm run lint         # ESLint (TypeScript + React rules)
npm run cypress:run  # E2E tests (headless)
```

### Backend (`backend/`)

```bash
./gradlew run          # API server → http://localhost:8080
./gradlew test         # JUnit tests
./gradlew shadowJar    # build fat JAR
./gradlew test --no-daemon   # CI-style (no background daemon)
```

### Full Stack (Docker)

```bash
cp .env.example .env    # first time only
docker compose up -d    # start all services (frontend, backend, postgres)
docker compose down     # stop
docker compose logs -f  # stream logs
```

---

## Project Structure

```

shoppimo/
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client + WebSocket client
│   │   ├── translations/    # i18n JSON files (en, de)
│   │   └── types/           # TypeScript interfaces & types
│   └── public/              # Static assets (icons, manifest)
├── backend/
│   └── src/main/kotlin/com/shoppinglist/
│       ├── routes/          # HTTP + WebSocket handlers
│       ├── models/          # Data model classes
│       └── database/        # Exposed ORM schema + queries
├── monitoring/              # Prometheus, Grafana, Alertmanager config
├── scripts/                 # release.sh, version-and-build.sh, helpers
├── config/                  # Frontend runtime config
├── .github/
│   ├── workflows/           # ci.yml, release.yml, feature-docker.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docker-compose.yml             # Development
├── docker-compose.prod.yml        # Production
├── docker-compose.monitoring.yml  # Monitoring stack
├── CHANGELOG.md                   # Keep up to date (see below)
└── AGENTS.md                      # This file
```

---

## Development Lifecycle

### Golden Rules

> **NEVER work directly on `main`.** Every change — no matter how small — lives on its own branch.
> **NEVER create a Pull Request** unless the human explicitly asks you to.
> **Always keep CHANGELOG.md up to date** when committing changes.

### Step-by-Step Workflow

#### 1. Start from a clean `main`

```bash
git checkout main
git pull origin main
```

#### 2. Create a feature branch

Use the naming conventions from CONTRIBUTING.md:

| Prefix | When to use |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `chore/` | Maintenance, tooling, dependency updates, refactoring |
| `test/` | Test additions or corrections |

```bash
git checkout -b feat/my-feature-name
# or
git checkout -b fix/short-description-of-bug
```

Branch names: lowercase, hyphen-separated, concise (e.g. `feat/swipe-to-delete`, `fix/websocket-reconnect`).

#### 3. Make changes and commit

Commit messages must follow **Conventional Commits**:

```txt
feat: add item reordering via drag-and-drop
fix(push): correct Base64 encoding for VAPID keys
docs: update environment variable table in README
chore: upgrade Ktor to 2.3.9
test: add unit tests for autocomplete hook
refactor(backend): extract push notification service
```

Format: `type(optional-scope): short imperative description`

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `style`, `perf`, `ci`

Rules:

- Subject line ≤ 72 characters
- Use imperative mood ("add", "fix", "remove" — not "added", "fixes")
- No period at the end of the subject line
- Reference issues with `Closes #123` in the body when applicable

#### 4. Update CHANGELOG.md **before or with every commit**

The CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format with [Semantic Versioning](https://semver.org/). Add your change under `## [Unreleased]` at the top:

```markdown
## [Unreleased]

### Added
- **Feature name** — One-sentence description of what was added and why it matters

### Fixed
- **Bug name** — What was broken and how it was fixed

### Changed
- **Change name** — What changed and the motivation

### Removed
- **Item** — What was removed and why
```

Use categories: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Deprecated`.
Write entries for a human reader — not a developer. Explain impact, not implementation detail.

#### 5. Verify before pushing

```bash
# Frontend
cd frontend && npm run lint && npm test && npm run build

# Backend
cd backend && ./gradlew test --no-daemon
```

Both must pass with zero errors before pushing.

#### 6. Push the branch

```bash
git push origin feat/my-feature-name
```

#### 7. Help the human create the Pull Request

**Do NOT open the PR yourself.** When the human is ready to merge, provide them with:

1. **PR Title** — follows Conventional Commits style: `feat: add swipe-to-delete for mobile`
2. **PR Body** — filled-in version of the PR template (`.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Description
[Concise explanation of what changed and why, 2–4 sentences]

Closes #[issue number if applicable]

## Type of Change
- [x] New feature / Bug fix / Documentation update / etc.

## Testing
- [x] Unit tests pass (`npm test` / `./gradlew test`)
- [x] I have added tests for new behavior (if applicable)
- [x] Manual testing performed

[Brief manual testing notes: what was tested, what platforms/browsers]

## Checklist
- [x] Code follows the project's style guidelines
- [x] Documentation updated (README, CHANGELOG) if needed
- [x] No debug logging left in code
- [x] No secrets or hardcoded credentials introduced
```

3. **CHANGELOG summary** — paste the relevant `[Unreleased]` section so the reviewer can see at a glance what changed.

Present this information to the human clearly. They will paste it into GitHub when opening the PR.

---

## Coding Conventions

### Frontend (TypeScript / React)

- **TypeScript strictly** — no `any` types; define interfaces in `src/types/`
- **React hooks** — prefer functional components + hooks; no class components
- **i18n required** — all user-visible strings must use `useTranslation()` / `t()` keys; add to both `en.json` and `de.json`
- **TailwindCSS** — utility classes only; no custom CSS unless absolutely necessary
- **Service layer** — API calls go in `src/services/`; never fetch directly from components
- **Error handling** — all async operations must handle errors; never swallow exceptions silently

```typescript
// ✅ Correct: typed interface, i18n, service layer
const { t } = useTranslation();
const items = await apiService.getItems(listId); // via src/services/api.ts

// ❌ Wrong: direct fetch, string literals, any type
const items: any = await fetch(`/api/lists/${id}/items`).then(r => r.json());
```

### Backend (Kotlin / Ktor)

- **Ktor routing** — define routes in `routes/` directory, one file per resource
- **Exposed ORM** — all DB access through Exposed DSL; no raw JDBC
- **Coroutines** — use `suspend` functions and `Dispatchers.IO` for DB/IO work
- **Error responses** — always return structured JSON `{ "error": "..." }` with appropriate HTTP status
- **No secrets in code** — read everything from environment variables; see `.env.example`

```kotlin
// ✅ Correct: structured error, environment config
call.respond(HttpStatusCode.NotFound, mapOf("error" to "List not found"))
val dbUrl = System.getenv("DATABASE_URL") ?: error("DATABASE_URL not set")

// ❌ Wrong: plain string error, hardcoded credential
call.respondText("not found", status = HttpStatusCode.NotFound)
val password = "hardcoded_password"
```

### Both

- Follow existing patterns in the file you are editing
- Keep PRs small and focused — one concern per branch
- Add or update tests for every behavioral change
- No `console.log` / `println` debug statements left in committed code

---

## Boundaries

### Always do

- Create a new branch before making any change
- Follow Conventional Commits format for every commit message
- Update `CHANGELOG.md` under `[Unreleased]` for every committed change
- Run lint + tests + build before considering work complete
- Add i18n keys to both `en.json` and `de.json` for any new UI text
- Keep secrets out of code — use environment variables

### Ask the human first

- Bumping major versions of core dependencies (React, Ktor, TypeScript)
- Adding new npm or Gradle dependencies
- Modifying Docker Compose service definitions
- Changing the public API contract (new/removed/renamed endpoints)
- Modifying CI/CD workflow files
- Performing a version release (`./scripts/release.sh`)

### Never do

- Work directly on the `main` branch
- Open a Pull Request (unless explicitly instructed by the human)
- Commit secrets, API keys, passwords, or `.env` files
- Delete or force-push to `main`
- Skip running tests before pushing
- Leave `TODO`, `FIXME`, or debug statements in committed code
- Remove or skip failing tests (fix them or ask the human)

---

## Environment Variables

Copy `.env.example` to `.env` before starting. Key variables:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | Database password |
| `VITE_API_URL` | ✅ | Backend URL for the frontend |
| `VITE_WS_URL` | ✅ | WebSocket URL for the frontend |
| `VAPID_SUBJECT` | Push only | Contact URI (`mailto:` or `https://`) |
| `VAPID_PUBLIC_KEY` | Push only | EC public key (generate with `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Push only | EC private key |

Full variable list: see `.env.example` and the table in README.md.

---

## CI/CD

Three GitHub Actions workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push/PR to `main` | Lint + test + build (frontend & backend) |
| `feature-docker.yml` | Feature branches | Builds Docker images for testing |
| `release.yml` | Git version tags | Pushes images to `ghcr.io/hechi/shoppimo` |

All CI checks must pass before merging. Never bypass them.

---

## Further Reading

| Document | Purpose |
|---|---|
| [README.md](README.md) | Project overview, quick-start, API reference |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines for humans |
| [CHANGELOG.md](CHANGELOG.md) | Full release history |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide |
| [SECURITY.md](SECURITY.md) | Security model and vulnerability reporting |
| [VERSIONING.md](VERSIONING.md) | Release scripts and semantic versioning |
| [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) | PR template to use when helping with PRs |
