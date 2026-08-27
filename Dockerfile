# ── Stage 1: build the React frontend ──
FROM node:20-slim AS frontend
WORKDIR /fe
COPY manzil-frontend/package.json manzil-frontend/package-lock.json ./
RUN npm install
COPY manzil-frontend/ ./
RUN npm run build

# ── Stage 2: FastAPI backend serving the built frontend ──
FROM python:3.12-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && ldconfig \
    && rm -rf /var/lib/apt/lists/*
RUN ldconfig -p | grep libgomp && \
    find /usr -name 'libgomp.so.1*' -print
WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY property-api/requirements.txt property-api/requirements.txt
RUN pip install --no-cache-dir -r property-api/requirements.txt

COPY . .
COPY --from=frontend /fe/dist property-api/static

# ── Build-time + runtime verifications — fail build if libgomp1 / LightGBM / model missing ──
RUN python -c "import ctypes; ctypes.CDLL('libgomp.so.1'); print('libgomp.so.1 OK')"
RUN python -c "import lightgbm; print('LightGBM OK')"
RUN python -c "import joblib; joblib.load('property-api/lgb_model.joblib'); print('MODEL LOAD OK')"

EXPOSE 8000
CMD ["sh", "-c", "uvicorn property-api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
