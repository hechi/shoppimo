# Shoppimo — Shared Shopping List

[![CI](https://github.com/hechi/shoppimo/actions/workflows/ci.yml/badge.svg)](https://github.com/hechi/shoppimo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A real-time collaborative shopping list app. Create a list, share the link, and everyone sees changes instantly — no account required.

## ✨ Features

- **Real-time sync** — Changes appear instantly for all users via WebSockets
- **Progressive Web App** — Install on your phone or desktop for an app-like experience
- **Offline support** — Access your lists even without an internet connection
- **Multi-language** — English and German (i18n ready for more)
- **Responsive** — Works seamlessly on mobile, tablet, and desktop
- **Auto-cleanup** — Configurable expiration removes old lists automatically

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

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/lists` | Create a new list |
| `GET` | `/api/lists/{id}` | Get a list |
| `POST` | `/api/lists/{id}/items` | Add an item |
| `PUT` | `/api/lists/{id}/items/{itemId}` | Update an item |
| `DELETE` | `/api/lists/{id}/items/{itemId}` | Delete an item |
| `POST` | `/api/lists/{id}/clear-completed` | Remove completed items |
| `WS` | `/ws/{listId}` | Real-time WebSocket connection |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

## Security

This app has no authentication — lists are accessible to anyone who knows the UUID. See [SECURITY.md](SECURITY.md) for deployment guidance and how to report vulnerabilities.

## License

MIT — see [LICENSE](LICENSE).
