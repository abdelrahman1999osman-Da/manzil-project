from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.staticfiles import StaticFiles
import os
import logging
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("manzil.api")

app = FastAPI(title="Manzil API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Startup diagnostics (must not hide real cause) ──
import platform
import traceback
logger.info("[manzil.api] Checking libgomp...")
try:
    import ctypes
    ctypes.CDLL("libgomp.so.1")
    logger.info("[manzil.api] libgomp OK: %s", "libgomp.so.1 found via ctypes")
except Exception as e:
    logger.error("[manzil.api] libgomp check FAILED: %s\n%s", e, traceback.format_exc())
logger.info("[manzil.api] Python %s on %s (%s)", platform.python_version(), platform.machine(), platform.system())
try:
    import os as _os
    _p = "/usr/lib/x86_64-linux-gnu/libgomp.so.1"
    logger.info("[manzil.api] libgomp exists %s: %s", _p, os.path.exists(_p))
except Exception:
    pass

engine = None
rag_engine = None
logger.info("[manzil.api] Loading LightGBM engine...")
try:
    from ml_engine import ManzilEngine
    engine = ManzilEngine(BASE_DIR)
    logger.info("[manzil.api] LightGBM engine loaded: %s", type(engine).__name__)
    logger.info("[manzil.api] Loading RAG engine...")
    from rag_engine import RAGEngine
    rag_engine = RAGEngine(engine.dataset)
    logger.info("[manzil.api] RAG engine loaded")
    logger.info("[manzil.api] Engine initialized successfully")
except Exception as e:
    logger.error("[manzil.api] Failed to load engines: %s\n%s", e, traceback.format_exc())

old_model = None
old_preprocessor = None
old_categories = None
old_correction = None
logger.info("[manzil.api] Loading legacy model...")
try:
    import joblib
    parent = os.path.join(BASE_DIR, "..")
    old_model = joblib.load(os.path.join(BASE_DIR, "lgb_model.joblib"))
    old_preprocessor = joblib.load(os.path.join(parent, "preprocessor.joblib"))
    old_categories = joblib.load(os.path.join(parent, "categories.joblib"))
    old_correction = joblib.load(os.path.join(parent, "correction_tables.joblib"))
    logger.info("[manzil.api] Legacy model loaded successfully: %s", type(old_model).__name__)
except Exception as e:
    logger.error("[manzil.api] Legacy model loading error: %s\n%s", e, traceback.format_exc())


class PropertyInputs(BaseModel):
    Beds: int
    Baths: int
    Area: float
    Property_Type: str
    City: str
    Compound_District: str
    Location: str
    Listed_Price: float | None = None


@app.get("/api/categories")
def get_categories():
    cats = old_categories or (engine.categories if engine else None)
    if not cats:
        raise HTTPException(status_code=503, detail="Categories not loaded")
    return {
        "Property Type": list(cats["Property Type"]),
        "City_Map": cats["City_Map"],
    }


@app.get("/health")
def health():
    ok = (engine is not None) or (old_model is not None)
    return {
        "status": "ok" if ok else "degraded",
        "ml_engine": engine is not None,
        "model_loaded": ok,
        "rag_available": rag_engine is not None,
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "python_version": platform.python_version(),
        "platform": platform.machine(),
        "libgomp_available": os.path.exists("/usr/lib/x86_64-linux-gnu/libgomp.so.1"),
    }


@app.post("/api/predict")
def predict_price(data: PropertyInputs):
    if engine:
        try:
            return engine.predict(data)
        except Exception as e:
            logger.error("Engine predict failed: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    if not old_model or not old_preprocessor:
        raise HTTPException(status_code=503, detail="Prediction model not available")

    try:
        import numpy as np
        import pandas as pd
        total_rooms = data.Beds + data.Baths
        area_per_room = data.Area / total_rooms if total_rooms > 0 else 0
        user_input = pd.DataFrame([{
            "Beds": data.Beds, "Baths": data.Baths, "Area": data.Area,
            "Total_Rooms": total_rooms, "Area_Per_Room": area_per_room,
            "Property Type": data.Property_Type, "Location": data.Location,
            "City": data.City, "Compound_District": data.Compound_District,
        }])
        cat_cols = ["Property Type", "Location", "City", "Compound_District"]
        user_input[cat_cols] = user_input[cat_cols].astype(str)
        processed = old_preprocessor.transform(user_input)
        log_price = old_model.predict(processed)[0]
        price = float(np.expm1(log_price))
        if old_correction:
            tc = old_correction.get("by_type", {}).get(data.Property_Type, {}).get("median_ratio", 1.0)
            cc = old_correction.get("by_city", {}).get(data.City, {}).get("median_ratio", 1.0)
            if tc > 1.0 and cc > 1.0:
                c = min(tc, cc)
            elif tc < 1.0 and cc < 1.0:
                c = max(tc, cc)
            else:
                c = (tc + cc) / 2.0
            price = price / c
        return {"price": price, "confidence_interval": None, "investment_score": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict/explain")
def predict_explain(data: PropertyInputs):
    if not engine:
        raise HTTPException(status_code=503, detail="SHAP engine not available")
    try:
        return engine.explain(data)
    except Exception as e:
        logger.error("Explain failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict/simulate")
def predict_simulate(data: PropertyInputs):
    if not engine:
        raise HTTPException(status_code=503, detail="Simulation engine not available")
    try:
        return engine.simulate(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/similar")
def find_similar(data: PropertyInputs):
    if not engine:
        raise HTTPException(status_code=503, detail="Similarity engine not available")
    try:
        return engine.find_similar(data)
    except Exception as e:
        logger.error("Similar failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics")
def get_analytics(
    city: str | None = Query(default=None),
    type: str | None = Query(default=None),
):
    if not engine:
        raise HTTPException(status_code=503, detail="Analytics not available")
    try:
        return engine.get_analytics(city=city, ptype=type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
#  AI ASSISTANT — OpenRouter Chat Endpoint
# ══════════════════════════════════════════════════════════════

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")

ASSISTANT_SYSTEM_PROMPT = """You are an elite real estate sales agent in Egypt. The data below is from our live database — answer using ONLY that data, not your training knowledge.

Read each "Actual listings matching your query" carefully and present matching ones to the user with their price, bedrooms, and area. The "Market statistics" section is supplementary context about averages.

Keep responses concise. Match the user's language (Arabic or English)."""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural-language property search query")


@app.post("/api/search")
def search_properties(data: SearchRequest):
    """Read-only retrieval for Agent SEARCH tool.

    Reuses the existing RAGEngine.hybrid_search + market context.
    No LLM call is made here; the Agent is responsible for generation.
    """
    query = (data.query or "").strip()
    if not query:
        raise HTTPException(status_code=422, detail="Query must not be empty")

    # Primary: RAG hybrid search
    if rag_engine:
        try:
            results = rag_engine.hybrid_search(query, k=5)
            market_context = ""
            if engine:
                try:
                    market_context = engine.retrieve_context(query) or ""
                except Exception:
                    logger.warning("Market context unavailable for query: %s", query)
            return {
                "query": query,
                "results": [_flatten_result(r) for r in results],
                "market_context": market_context,
            }
        except Exception as e:
            logger.error("Search failed via RAG: %s", e)
            # Fall through to fallback

    # Fallback: simple dataset filter when RAG not available (demo-safe, no faiss needed)
    if engine is not None and hasattr(engine, 'dataset'):
        try:
            df = engine.dataset
            q_lower = query.lower()
            # Simple city keyword match without rag_engine
            city_keywords = {
                "alexandria": "alexandria", "اسكندرية": "alexandria", "إسكندرية": "alexandria",
                "cairo": "cairo", "القاهرة": "cairo",
                "giza": "giza", "الجيزة": "giza",
            }
            target_city = None
            for k, v in city_keywords.items():
                if k in q_lower:
                    target_city = v
                    break
            if target_city:
                mask = df["City"].astype(str).str.lower().str.contains(target_city, na=False)
                filtered = df[mask]
                if filtered.empty:
                    filtered = df.head(5)
                else:
                    filtered = filtered.head(5)
            else:
                filtered = df.head(5)
            fallback = []
            for _, row in filtered.iterrows():
                fallback.append({
                    "id": f"prop_{row.name}",
                    "text": f"{row['Property Type']} for sale in {row['City']}. {int(row['Beds'])} bedrooms, {int(row['Baths'])} bathrooms, {int(row['Area'])} m2. Price: {int(row['Original Price']):,} EGP.",
                    "metadata": {
                        "price": int(row["Original Price"]),
                        "area": int(row["Area"]),
                        "beds": int(row["Beds"]),
                        "baths": int(row["Baths"]),
                        "city": str(row["City"]),
                        "type": str(row["Property Type"]),
                        "district": str(row.get("Compound_District","")),
                        "location": str(row.get("Location","")),
                    },
                    "score": 0.5,
                })
            return {"query": query, "results": fallback, "market_context": ""}
        except Exception as e:
            logger.error("Fallback search failed: %s", e)

    raise HTTPException(status_code=503, detail="Search engine not available")


def _flatten_result(hit: dict) -> dict:
    item = {
        "id": hit.get("id"),
        "text": hit.get("text"),
        "score": hit.get("score"),
    }
    meta = hit.get("metadata") or {}
    for key in ("price", "area", "beds", "baths", "city", "type", "district", "location"):
        item[key] = meta.get(key)
    return item


@app.post("/api/assistant/chat")
def assistant_chat(data: ChatRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant is not configured. Set OPENROUTER_API_KEY environment variable.",
        )
    try:
        rag_parts = []
        if rag_engine:
            hits = rag_engine.hybrid_search(data.message, k=10)
            if hits:
                rag_parts.append("Actual listings matching your query:")
                for h in hits:
                    rag_parts.append(
                        f"- {h['text']} (relevance: {h['score']})"
                    )
        if engine:
            ctx = engine.retrieve_context(data.message)
            if ctx:
                rag_parts.append("Market statistics:")
                rag_parts.append(ctx)

        system_content = ASSISTANT_SYSTEM_PROMPT
        if rag_parts:
            system_content += "\n\n" + "\n".join(rag_parts)

        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
        messages = [{"role": "system", "content": system_content}]
        for msg in data.history[-20:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": data.message})
        logger.info("Using model: %s on base: %s", OPENROUTER_MODEL, OPENROUTER_BASE_URL)
        completion = client.chat.completions.create(
            model=OPENROUTER_MODEL, messages=messages, temperature=0.7, max_tokens=1024,
        )
        reply = completion.choices[0].message.content or "I could not generate a response."
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Assistant error: {str(e)}")


STATIC_DIR = os.path.join(BASE_DIR, "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
