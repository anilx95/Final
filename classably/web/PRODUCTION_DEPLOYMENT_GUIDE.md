# ClassAbly Platform - Production Deployment & Operations Guide

## Executive Overview

ClassAbly is an enterprise Smart Classroom Accessibility and Analytics platform featuring multi-tenant role isolation (Admin, Educator, Student), live WebRTC video streaming, Speech-to-Text translation, PaddleOCR board extraction, IoT environmental telemetry, and multi-modal accessibility adaptations.

---

## 1. Production Architecture & Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS (Port 3000 / Nginx Port 80/443)
- **Backend API**: FastAPI / Python 3.10+ (Uvicorn ASGI Port 8000)
- **Database**: PostgreSQL 16+ (Port 5432)
- **Cache & WebSockets**: Redis 7+ (Port 6379)
- **AI & Computer Vision**: YOLOv11, PaddleOCR, Whisper Speech-to-Text

---

## 2. Production Docker Environment Setup

### `docker-compose.prod.yml`
```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: classably_postgres_prod
    restart: always
    environment:
      POSTGRES_DB: classably
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: classably_redis_prod
    restart: always
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: classably_backend_prod
    restart: always
    environment:
      - DATABASE_URL=postgresql+psycopg://postgres:${POSTGRES_PASSWORD}@postgres:5432/classably
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - APP_ENV=production
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./web
      dockerfile: Dockerfile
    container_name: classably_frontend_prod
    restart: always
    ports:
      - "80:80"

volumes:
  postgres_prod_data:
```

---

## 3. Nginx Reverse Proxy Configuration (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name classably.university.edu;

    client_max_body_size 100M;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:8000/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 4. Production Database Backup & Disaster Recovery

### Manual PostgreSQL Backup Script
```bash
docker exec -t classably_postgres_prod pg_dump -U postgres classably > classably_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database Procedure
```bash
cat classably_backup.sql | docker exec -i classably_postgres_prod psql -U postgres -d classably
```
