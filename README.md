# DMS-API

Document Management System — microservices API architecture with Docker Compose.

## Project Structure

```
DMS-API/
│
├── .dockerignore
├── docker-compose.yml           # Orchestrates all services + PostgreSQL
├── package.json                 # Root metadata
│
├── gateway/                     # Single entry point (port 3000)
│   ├── .env                     # Environment variables
│   ├── Dockerfile
│   ├── index.js                 # Routes: /api/auth, /api/documents, /api/users, /api/notifications
│   └── package.json
│
└── services/
    ├── auth-service/            # Authentication & authorization (port 3001)
    │   ├── Dockerfile
    │   ├── index.js
    │   └── package.json
    │
    ├── document-service/        # Document CRUD & storage (port 3002)
    │   ├── Dockerfile
    │   ├── index.js
    │   └── package.json
    │
    ├── user-service/            # User management (port 3003)
    │   ├── Dockerfile
    │   ├── index.js
    │   └── package.json
    │
    └── notification-service/    # Notifications / alerts (port 3004)
        ├── Dockerfile
        ├── index.js
        └── package.json
```

## Getting Started

```bash
# Build and start all services
docker compose up --build -d

# Check logs
docker compose logs -f

# Stop everything
docker compose down
```

## Port Mapping

| Service             | Container Port | Host Port |
|---------------------|---------------|-----------|
| Gateway             | 3000          | 3000      |
| Auth Service        | 3001          | 3001      |
| Document Service    | 3002          | 3002      |
| User Service        | 3003          | 3003      |
| Notification Service| 3004          | 3004      |
| PostgreSQL          | 5432          | 5432      |

## Architecture

- **Gateway** (`localhost:3000`) is the only endpoint the frontend communicates with
- Each backend service runs independently and connects to the shared PostgreSQL instance
- Services communicate via HTTP through the gateway proxy
