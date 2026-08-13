# Multi-Stage Dockerfile for ClassAbly Subfolder Deployment (Railway / Fly.io)

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web ./
RUN npm run build

# Stage 2: FastAPI Backend & Web Server
FROM python:3.10-slim
WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    ffmpeg \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend .
COPY --from=frontend-builder /app/web/dist ../web/dist

ENV PYTHONPATH=/app/backend
ENV PORT=8000

EXPOSE 8000

CMD ["python", "start.py"]
