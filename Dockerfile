# Multi-Stage Dockerfile for ClassAbly Single-Container Deployment (Railway / Fly.io)

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY classably/web/package*.json ./
RUN npm ci
COPY classably/web ./
RUN npm run build

# Stage 2: FastAPI Backend & Web Server
FROM python:3.10-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    ffmpeg \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY classably/backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY classably/backend ./backend
COPY --from=frontend-builder /app/web/dist ./web/dist

ENV PYTHONPATH=/app/backend
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
