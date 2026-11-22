# Shoppimo — Shared Shopping List

[![CI](https://github.com/hechi/shoppimo/actions/workflows/ci.yml/badge.svg)](https://github.com/hechi/shoppimo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A real-time collaborative shopping list app. Create a list, share the link, and everyone sees changes instantly — no account required.

> 🤖 **Built with AI assistance** — This project was created with the help of [Amazon Kiro](https://kiro.dev) and [GitHub Copilot](https://github.com/features/copilot) as a hands-on learning experiment. The idea had been on my mind for a while; AI tools helped me turn it into a real, working project.

## ✨ Features

- **Real-time sync** — Changes appear instantly for all users via WebSockets
- **Progressive Web App** — Install on your phone or desktop for an app-like experience
- **Offline support** — Access your lists even without an internet connection
- **Multi-language** — English and German (i18n ready for more)
- **Responsive** — Works seamlessly on mobile, tablet, and desktop
- **Auto-cleanup** — Configurable expiration removes old lists automatically
- **Dark Mode** — Light, dark, and system-preference theme toggle
- **Smart Autocomplete** — Suggests items from your cross-list history as you type
- **Push Notifications** — Opt-in Web Push alerts when list changes happen
- **List Aliases** — Optionally assign a human-friendly alias (e.g. `groceries`) to any list, usable in place of the UUID
- **MCP Server** — AI assistants can manage shopping lists via the [Model Context Protocol](https://modelcontextprotocol.io) — includes meal planning prompts and batch operations ([setup guide](MCP_INSTALL.md))
- **Prometheus Metrics** — Application metrics (online users, list count, JVM, HTTP requests) exposed for Prometheus scraping

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React · Vite · TypeScript · TailwindCSS · PWA |
| Backend | Kotlin · Ktor · Exposed ORM |
| Database | PostgreSQL |
| Infra | Docker · Docker Compose |
| Monitoring | Prometheus · Grafana · Alertmanager |

## Quick Start

**Prerequisites:** Docker and Docker Compose

```bash
git clone https://github.com/hechi/shoppimo.git
cd shoppimo
cp .env.example .env          # review and adjust if needed
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) — that's it.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (frontend development)
- Java 17+ (backend development)

### Frontend

```bash
cd frontend
npm install
npm run dev          # dev server at http://localhost:3000
npm test             # unit tests
npm run lint         # ESLint
```

### Backend

```bash
cd backend
./gradlew run     # API server at http://localhost:8080
./gradlew test    # run tests
```

## Project Structure

```
├── frontend/          # React frontend
│   ├── src/           # Application source
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/  # API + WebSocket clients
│   │   └── translations/
│   └── public/        # Static assets
├── backend/           # Kotlin/Ktor backend
│   └── src/main/kotlin/com/shoppinglist/
│       ├── routes/    # HTTP + WebSocket handlers
│       ├── models/    # Data models
│       └── database/  # Database layer (Exposed)
├── monitoring/        # Prometheus, Grafana, Alertmanager config
├── scripts/           # Deployment and maintenance helpers
├── config/            # Frontend runtime configuration
├── docker-compose.yml             # Development
├── docker-compose.prod.yml        # Production
└── docker-compose.monitoring.yml  # Monitoring stack
```

## Configuration

Copy `.env.example` to `.env` and adjust the values:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `shopping_lists` | Database name |
| `POSTGRES_USER` | `shopping_user` | Database user |
| `POSTGRES_PASSWORD` | *(set this!)* | Database password |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `FRONTEND_PORT` | `80` | Frontend port (production) |
| `BACKEND_PORT` | `8080` | Backend port |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL (frontend) |
| `VITE_WS_URL` | `ws://localhost:8080` | WebSocket URL (frontend) |
| `LIST_RETENTION_DAYS` | `30` | Days before a list expires |
| `API_HOST` | `localhost` | Host for dev Docker Compose |
| `VAPID_SUBJECT` | *(required for push)* | Contact URI for VAPID (`mailto:` or `https://`) |
| `VAPID_PUBLIC_KEY` | *(required for push)* | VAPID public key (EC uncompressed) |
| `VAPID_PRIVATE_KEY` | *(required for push)* | VAPID private key (PKCS8) |

> 💡 Generate VAPID keys with: `npx web-push generate-vapid-keys`

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/metrics` | Prometheus metrics |
| `POST` | `/api/lists` | Create a new list |
| `GET` | `/api/lists/{id}` | Get a list |
| `POST` | `/api/lists/{id}/items` | Add an item |
| `PUT` | `/api/lists/{id}/items/{itemId}` | Update an item |
| `DELETE` | `/api/lists/{id}/items/{itemId}` | Delete an item |
| `POST` | `/api/lists/{id}/clear-completed` | Remove completed items |
| `GET` | `/api/lists/by-alias/{alias}` | Resolve a list by its alias |
| `PUT` | `/api/lists/{id}/alias` | Set, update, or remove a list's alias |
| `WS` | `/ws/{listId}` | Real-time WebSocket connection |
| `GET` | `/api/push/vapid-key` | Get the server's VAPID public key |
| `POST` | `/api/push/subscribe` | Subscribe to push notifications |
| `POST` | `/api/push/unsubscribe` | Unsubscribe from push notifications |
| `SSE` | `/mcp` | Model Context Protocol endpoint (AI integration) |
| `GET` | `/api/docs` | Interactive API documentation (Swagger UI) |
| `GET` | `/api/openapi.json` | OpenAPI specification (JSON) |

### OpenAPI specification

The backend generates its [OpenAPI](https://spec.openapis.org/oas/latest.html) document at request time from the Ktor routes, so it always matches the running code. Open `/api/docs` for Swagger UI (for example `http://localhost:8080/api/docs`) or fetch `/api/openapi.json` for client generators. Swagger UI loads its JavaScript and CSS from `unpkg.com`, so the browser needs internet access to render it. The JSON document works offline.

The operation descriptions live in `backend/src/main/kotlin/com/shoppinglist/openapi/OpenApiDocs.kt`. When you add or change an endpoint, update its description there.

### WebSocket protocol

OpenAPI cannot describe WebSockets. The protocol for `/ws/{listId}` is documented in the description of the OpenAPI document (top of `/api/docs`). In short: the server pushes JSON messages (`CONNECTION_ESTABLISHED`, `ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEMS_CLEARED`, `ERROR`) with the envelope `{ type, listId, data, timestamp }` after changes made through the REST API.

## MCP (Model Context Protocol)

Shoppimo exposes an MCP server at `/mcp` using SSE transport, allowing AI assistants (Claude, Kiro, Copilot, etc.) to manage shopping lists programmatically.

**Production endpoint:** `https://api.shoppimo.de/mcp`

> **Quick setup:** See [MCP_INSTALL.md](MCP_INSTALL.md) for one-command install instructions for Claude Code, Claude Desktop, Cursor, VS Code, Kiro, ChatGPT, and other clients.

### Available Tools

| Tool | Description |
|------|-------------|
| `create_list` | Create a new shopping list |
| `get_list` | Retrieve a list with all items by UUID |
| `get_list_by_alias` | Look up a list by its human-friendly alias |
| `set_alias` | Set, update, or remove a list's alias |
| `add_item` | Add a single item to a list |
| `add_items` | Add multiple items in batch (up to 50) |
| `remove_item` | Remove an item by ID |
| `check_item` | Mark an item as completed |
| `uncheck_item` | Mark an item as not completed |
| `clear_completed` | Remove all completed items |
| `delete_list` | Permanently delete a list |

### Prompts

| Prompt | Description |
|--------|-------------|
| `weekly-groceries` | Populate a list with typical weekly staples, scaled to household size |
| `suggest-meals` | Suggest meals for the week and add ingredients (excludes pantry basics like salt, pepper, oil) |

### Resources

| URI Pattern | Description |
|-------------|-------------|
| `shoppimo://list/{listId}` | Read-only access to a shopping list and its items |

### Connecting an AI Client

Point your MCP client at `https://api.shoppimo.de/mcp` (or `http://localhost:8080/mcp` for local dev).

```bash
# Claude Code — one command:
claude mcp add --transport http shoppimo https://api.shoppimo.de/mcp
```

For other clients, see [MCP_INSTALL.md](MCP_INSTALL.md).

### Testing with curl

The SSE transport serves both the event stream and the POST endpoint at the same path (`/mcp`):

```bash
# Open the SSE stream (responses appear here)
curl -N -H "Accept: text/event-stream" http://localhost:8080/mcp
```

For LAN access, use your machine's IP (e.g. `http://192.168.x.x:8080/mcp`).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

## Security

This app has no authentication — lists are accessible to anyone who knows the UUID or alias. See [SECURITY.md](SECURITY.md) for deployment guidance and how to report vulnerabilities.

## License

MIT — see [LICENSE](LICENSE).
