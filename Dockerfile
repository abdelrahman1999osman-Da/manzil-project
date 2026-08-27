# ── Stage 1: build the React frontend ──
FROM node:20-slim AS frontend
WORKDIR /fe
COPY manzil-frontend/package.json manzil-frontend/package-lock.json ./
RUN npm install
COPY manzil-frontend/ ./
RUN npm run build

# ── Stage 2: FastAPI backend serving the built frontend ──
FROM python:3.12-slim AS runtime
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY property-api/requirements.txt property-api/requirements.txt
RUN pip install --no-cache-dir -r property-api/requirements.txt

COPY . .
COPY --from=frontend /fe/dist property-api/static

EXPOSE 8000
CMD ["sh", "-c", "uvicorn property-api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
