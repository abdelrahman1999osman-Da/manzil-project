# ── Stage 1: build the React frontend ──
FROM node:20-slim AS frontend
WORKDIR /fe
COPY manzil-frontend/package.json manzil-frontend/package-lock.json ./
RUN npm install
COPY manzil-frontend/ ./
RUN npm run build

# ── Stage 2: FastAPI backend serving the built frontend ──
FROM python:3.12-slim AS runtime
# Cache-bust: bump to force rebuild of libgomp layer when Railway uses cached layers
ARG CACHEBUST=20260828_02
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && ldconfig \
    && test -e /usr/lib/x86_64-linux-gnu/libgomp.so.1 \
    && rm -rf /var/lib/apt/lists/*
RUN ldconfig -p | grep libgomp && \
    find /usr -name 'libgomp.so.1*' -print
WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY property-api/requirements.txt property-api/requirements.txt
RUN pip install --no-cache-dir -r property-api/requirements.txt

COPY . .
COPY --from=frontend /fe/dist property-api/static

# ── Build-time verifications — MUST FAIL BUILD if libgomp1 / LightGBM / model missing (no || true) ──
RUN python -c "import ctypes; ctypes.CDLL('libgomp.so.1'); print('LIBGOMP LOAD SUCCESS')"
RUN python -c "import lightgbm; print('LIGHTGBM IMPORT SUCCESS', lightgbm.__file__)"
RUN python -c "import joblib; m=joblib.load('property-api/lgb_model.joblib'); print(type(m)); print('MODEL LOAD SUCCESS')"
# Verify shared-library dependencies (ldd) for LightGBM — shows any "not found"
RUN python -c "import lightgbm, pathlib; p=pathlib.Path(lightgbm.__file__).parent; print('lightgbm dir:', p)" && \
    find $(python -c "import lightgbm, pathlib; print(pathlib.Path(lightgbm.__file__).parent)") -name "_lightgbm*.so" -exec ldd {} \; | grep -E "libgomp|not found" | head -n 20

EXPOSE 8000
# Runtime diagnostics in SAME final image that Railway starts — must succeed for model to load
CMD ["sh", "-c", "\
echo '=== RUNTIME DIAGNOSTICS (final image) ===' && \
echo '--- dpkg libgomp ---' && dpkg -l | grep libgomp || true && \
echo '--- find libgomp ---' && find /usr -name 'libgomp.so*' -print || true && \
echo '--- ldconfig ---' && ldconfig -p | grep libgomp || true && \
echo '--- ctypes ---' && python -c \"import ctypes; ctypes.CDLL('libgomp.so.1'); print('LIBGOMP LOAD SUCCESS')\" || true && \
echo '--- lightgbm ---' && python -c \"import lightgbm; print('LIGHTGBM IMPORT SUCCESS', lightgbm.__file__)\" || true && \
echo '--- ldd lightgbm ---' && python -c \"import lightgbm, pathlib, subprocess, glob; p=pathlib.Path(lightgbm.__file__).parent; f=list(p.glob('_lightgbm*.so')); print(f); [print(subprocess.run(['ldd', str(x)], capture_output=True, text=True).stdout) for x in f]\" || true && \
echo '--- model ---' && python -c \"import joblib; m=joblib.load('property-api/lgb_model.joblib'); print(type(m)); print('MODEL LOAD SUCCESS')\" || true && \
echo '=== STARTING UVICORN ===' && \
uvicorn property-api.main:app --host 0.0.0.0 --port ${PORT:-8000} \
"]
