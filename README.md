# Manzil — AI Real Estate Valuation & Decision Support System

An AI-powered Egyptian real estate platform: LightGBM price prediction with SHAP
explanations, confidence intervals, investment scoring, similar-property lookup,
a market analytics dashboard, and a RAG-powered AI assistant (FAISS + BM25).

## Project structure

```
manzil-project/
├── property-api/           FastAPI backend (predict, explain, similar, analytics, assistant)
│   ├── main.py             API routes + AI assistant endpoint
│   ├── ml_engine.py        LightGBM model, SHAP, corrections, analytics
│   ├── rag_engine.py       FAISS + BM25 hybrid search, filter parsing (EN/AR)
│   └── requirements.txt
├── manzil-frontend/        React 19 + Vite + Tailwind v4 UI
├── lgb_model.joblib        Trained LightGBM model
├── preprocessor.joblib     ColumnTransformer (scaler + one-hot)
├── categories.joblib       Categorical vocabularies
├── correction_tables.joblib
├── confidence_stats.joblib Residual quantiles for confidence intervals
├── cleaned_property_data.xlsx  ~99K Egyptian property records
├── rebuild_rag.py          Regenerates the large RAG artifacts (run once)
├── Dockerfile              Multi-stage build (frontend + backend)
└── .dockerignore
```

## Setup (local)

### 1. Backend

```bash
cd property-api
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

cp .env.example .env          # add your OPENROUTER_API_KEY (needed for AI assistant)
```

### 2. Rebuild RAG artifacts (required once, ~5 min)

```bash
python rebuild_rag.py
```

This generates `rag_embeddings.npy`, `rag_faiss.index`, `rag_bm25.pkl`,
`rag_properties.jsonl` inside `property-api/` from `cleaned_property_data.xlsx`.

### 3. Run the backend

```bash
cd property-api
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Frontend

```bash
cd manzil-frontend
npm install
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to port 8000).

## API endpoints

| Method | Endpoint                 | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | `/api/categories`        | Property types + city/district map   |
| POST   | `/api/predict`           | Price + confidence interval + score  |
| POST   | `/api/predict/explain`   | SHAP feature contributions           |
| POST   | `/api/predict/simulate`  | Simulate price                       |
| POST   | `/api/similar`           | Similar properties                   |
| GET    | `/api/analytics`         | Market analytics (filters: city, type) |
| POST   | `/api/assistant/chat`    | AI assistant (RAG + market stats)    |

## Deploy (Render — free tier)

The `Dockerfile` builds the React frontend, copies it into `property-api/static`,
and starts uvicorn on `$PORT` (single service). On Render:

1. New → Web Service → connect this GitHub repo
2. Runtime: **Docker** (build/start commands are auto-detected from the Dockerfile)
3. Instance type: Free
4. Environment variable: `OPENROUTER_API_KEY` = your key (needed for the AI assistant)

On boot without RAG artifacts the backend runs in BM25-only mode (fast, ~300MB
RAM) — every feature stays available. For full semantic search locally run
`python rebuild_rag.py` once (~8 min).

## Model

LightGBM over ~2589 features (StandardScaler + OneHotEncoder), log1p target,
~9% MAPE, trained on `cleaned_property_data.xlsx`.
