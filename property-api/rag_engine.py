import os
import json
import logging
import pickle
import re
import numpy as np
import pandas as pd
import faiss
from rank_bm25 import BM25Okapi
from typing import Any

logger = logging.getLogger("manzil.rag")

BASE = os.path.dirname(os.path.abspath(__file__))
RAG_DATA_FILE = os.path.join(BASE, "rag_properties.jsonl")
EMBEDDINGS_FILE = os.path.join(BASE, "rag_embeddings.npy")
BM25_FILE = os.path.join(BASE, "rag_bm25.pkl")
FAISS_INDEX_FILE = os.path.join(BASE, "rag_faiss.index")
VECTOR_SIZE = 384

CITY_ALIASES = {
    "5th settlement": "5th settlement",
    "fifth settlement": "5th settlement",
    "1st settlement": "1st settlement",
    "6th settlement": "6th settlement",
    "التجمع الخامس": "5th settlement",
    "التجمع": "settlement",
    "tagamo3": "settlement",
    "settlements": "settlement",
    "new cairo": "new cairo",
    "القاهرة الجديدة": "new cairo",
    "sheikh zayed": "sheikh zayed",
    "الشيخ زايد": "sheikh zayed",
    "october": "october",
    "6 october": "october",
    "السادس من اكتوبر": "october",
    "اكتوبر": "october",
    "rehab": "rehab",
    "الرحاب": "rehab",
    "madinaty": "madinaty",
    "مدينتي": "madinaty",
    "shorouk": "shorouk",
    "الشروق": "shorouk",
    "mostakbal": "mostakbal",
    "المستقبل": "mostakbal",
    "nasr city": "nasr city",
    "مدينة نصر": "nasr city",
    "maadi": "maadi",
    "المعادي": "maadi",
    "zamalek": "zamalek",
    "الزمالك": "zamalek",
    "mohandeseen": "mohandseen",
    "المهندسين": "mohandseen",
    "dokki": "dokki",
    "الدقي": "dokki",
    "garden city": "garden city",
    "جاردن سيتي": "garden city",
    "alexandria": "alexandria",
    "اسكندرية": "alexandria",
    "إسكندرية": "alexandria",
    "hurghada": "hurghada",
    "الغردقة": "hurghada",
    "north coast": "north coast",
    "الساحل الشمالي": "north coast",
    "الساحل": "coast",
    "ras al hekma": "ras al hekma",
    "راس الحكمة": "ras al hekma",
    "alamein": "alamein",
    "العلمين": "alamein",
    "ain sukhna": "ain sukhna",
    "العين السخنة": "ain sukhna",
    "capital": "capital",
    "العاصمة": "capital",
    "heliopolis": "heliopolis",
    "مصر الجديدة": "heliopolis",
    "new heliopolis": "new heliopolis",
    "smoha": "smoha",
    "سموحة": "smoha",
    "katameya": "katameya",
    "القطامية": "katameya",
    "sidi abdel rahman": "sidi abdel rahman",
    "سيدي عبد الرحمن": "sidi abdel rahman",
    "zayed": "zayed",
    "زايد": "zayed",
    "cairo": "cairo",
    "القاهرة": "cairo",
    "القاهره": "cairo",
    "قاهرة": "cairo",
    "giza": "giza",
    "الجيزة": "giza",
    "الجيزه": "giza",
    "red sea": "red sea",
    "البحر الأحمر": "red sea",
    "البحر الاحمر": "red sea",
    "mokattam": "mokattam",
    "المقطم": "mokattam",
    "shubra": "shubra",
    "شبرا": "shubra",
    "agami": "agami",
    "العجمي": "agami",
    "seyouf": "seyouf",
    "السيوف": "seyouf",
    "new nozha": "new nozha",
    "النزهة الجديدة": "new nozha",
    "obour": "obour",
    "العبور": "obour",
    "matruh": "matruh",
    "مطروح": "matruh",
    "marsa matrouh": "marsa matrouh",
    "مرسى مطروح": "marsa matrouh",
    "mansoura": "mansura",
    "المنصورة": "mansura",
    "gouna": "gouna",
    "الجونة": "gouna",
    "makadi bay": "makadi bay",
    "خليج مكادي": "makadi bay",
    "hadayek al-ahram": "hadayek al-ahram",
    "حدائق الاهرام": "hadayek al-ahram",
    "miami": "miami",
    "ميامى": "miami",
    "montazah": "montazah",
    "المنتزه": "montazah",
    "haram": "haram",
    "الهرم": "haram",
    "safaga": "safaga",
    "سفاجا": "safaga",
    "zagazig": "zagazig",
    "الزقازيق": "zagazig",
    "damanhour": "damanhour",
    "دمنهور": "damanhour",
    "soma bay": "soma bay",
    "سومة باي": "soma bay",
    "sahl hasheesh": "sahl hasheesh",
    "سهل حشيش": "sahl hasheesh",
    "banha": "banha",
    "بنها": "banha",
    "damietta": "damietta",
    "دمياط": "damietta",
    "fleming": "fleming",
    "فلمنج": "fleming",
    "mahalla": "mahalla",
    "المحلة": "mahalla",
    "badr city": "badr city",
    "مدينة بدر": "badr city",
    "sidi beshr": "sidi beshr",
    "سيدي بشر": "sidi beshr",
    "borg al-arab": "borg al-arab",
    "برج العرب": "borg al-arab",
    "asyut": "asyut",
    "أسيوط": "asyut",
    "imbaba": "imbaba",
    "إمبابة": "imbaba",
    "suez": "suez",
    "السويس": "suez",
    "sidi gaber": "sidi gaber",
    "سيدي جابر": "sidi gaber",
    "tanta": "tanta",
    "طنطا": "tanta",
    "laurent": "laurent",
    "لوران": "laurent",
    "new mansoura": "new mansoura",
    "المنصورة الجديدة": "new mansoura",
    "mandara": "mandara",
    "المندرة": "mandara",
    "asafra": "asafra",
    "العسافرة": "asafra",
    "abu qir": "abu qir",
    "أبو قير": "abu qir",
    "al manial": "al manial",
    "المنيل": "al manial",
    "masr al-kadema": "masr al-kadema",
    "مصر القديمة": "masr al-kadema",
    "cleopatra": "cleopatra",
    "كليوباترا": "cleopatra",
    "shebin": "shebin",
    "شبين": "shebin",
    "anfoshy": "anfoshy",
    "الأنفوشي": "anfoshy",
    "amreya": "amreya",
    "العامرية": "amreya",
    "minya": "minya",
    "المنيا": "minya",
    "roushdy": "roushdy",
    "روشدي": "roushdy",
    "victoria": "victoria",
    "فيكتوريا": "victoria",
    "bacchus": "bacchus",
    "باكوس": "bacchus",
    "ain shams": "ain shams",
    "عين شمس": "ain shams",
    "uptown cairo": "uptown cairo",
    "أبتاون": "uptown cairo",
    "moustafa kamel": "moustafa kamel",
    "مصطفى كامل": "moustafa kamel",
    "maamoura": "maamoura",
    "المعمورة": "maamoura",
    "ras sedr": "ras sedr",
    "رأس سدر": "ras sedr",
    "10th of ramadan": "10th of ramadan",
    "العاشر من رمضان": "10th of ramadan",
    "king mariout": "king mariout",
    "كينج مريوط": "king mariout",
}

TYPE_ALIASES = {
    "stand alone villa": "Stand Alone Villa",
    "villa": "Stand Alone Villa",
    "فيلا": "Stand Alone Villa",
    "twin house": "Twin House",
    "twinhouse": "Twin House",
    "town house": "Town House",
    "townhouse": "Town House",
    "تاون هاوس": "Town House",
    "penthouse": "Penthouse",
    "بنتهاوس": "Penthouse",
    "duplex": "Duplex",
    "دوبلكس": "Duplex",
    "studio": "Studio",
    "استوديو": "Studio",
    "apartment": "Apartment",
    "flat": "Apartment",
    "شقة": "Apartment",
    "hotel apartment": "Hotel Apartment",
    "chalet": "Chalet",
    "شالية": "Chalet",
}

PRICE_MULTIPLIERS = {
    "million": 1_000_000, "مليون": 1_000_000, "m": 1_000_000,
    "thousand": 1_000, "k": 1_000, "الف": 1_000, "آلاف": 1_000,
}


def normalize_arabic(text: str) -> str:
    return (
        text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
        .replace("ة", "ه").replace("ى", "ي")
    )


def _match_alias(query: str, alias: str) -> bool:
    if alias.isascii():
        return re.search(rf"\b{re.escape(alias)}\b", query) is not None
    return normalize_arabic(alias) in normalize_arabic(query)


def parse_filters(query: str) -> dict:
    q = query.lower()
    filters = {}
    for alias in sorted(CITY_ALIASES, key=len, reverse=True):
        if _match_alias(q, alias):
            filters["city"] = CITY_ALIASES[alias]
            break
    for alias in sorted(TYPE_ALIASES, key=len, reverse=True):
        if _match_alias(q, alias):
            filters["type"] = TYPE_ALIASES[alias]
            break
    m = re.search(r"(\d+)\s*(bed(?:room)?s?|br|غرف|غرفة)\b", q)
    if m:
        filters["beds"] = int(m.group(1))
    m = re.search(r"(\d+)\s*(bath(?:room)?s?|ba|حمام|حمامات)\b", q)
    if m:
        filters["baths"] = int(m.group(1))

    def _parse_price(text: str):
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(million|مليون|m|thousand|k|الف|آلاف)?\b", text)
        if m:
            val = float(m.group(1).replace(",", ""))
            mult = PRICE_MULTIPLIERS.get(m.group(2), 1)
            return int(val * mult)
        m2 = re.search(r"(\d+(?:,\d{3})+)\s*(egp|le|جنيه)?", text)
        if m2:
            return int(m2.group(1).replace(",", ""))
        return None

    under_pat = re.search(
        r"(?:under|less than|below|up to|budget|اقل من|أقل من|تحت)\s*(.+?)(?:egp|le|جنيه)?\s*$", q,
    )
    if under_pat:
        p = _parse_price(under_pat.group(1))
        if p:
            filters["price_max"] = p
    over_pat = re.search(
        r"(?:more than|above|over|starting from|اكثر من|أكثر من|من)\s*(.+?)(?:egp|le|جنيه)?\s*$", q,
    )
    if over_pat:
        p = _parse_price(over_pat.group(1))
        if p:
            filters["price_min"] = p
    range_pat = re.search(r"(?:from|من)?\s*(.+?)\s*(?:to|الى|الي|til|-\s*)\s*(.+?)(?:egp|le|جنيه)?\s*$", q)
    if range_pat:
        p1, p2 = _parse_price(range_pat.group(1)), _parse_price(range_pat.group(2))
        if p1 and p2:
            filtered_price_min, filters["price_max"] = min(p1, p2), max(p1, p2)
    range_pat2 = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m|million|مليون)\s*(?:to|-)\s*(\d+(?:[.,]\d+)?)", q)
    if range_pat2:
        filters["price_min"] = int(float(range_pat2.group(1)) * 1_000_000)
        filters["price_max"] = int(float(range_pat2.group(2)) * 1_000_000)
    if "price_max" not in filters and "budget" in q:
        m = re.search(r"budget\s*(?:of)?\s*(.+?)(?:egp|le|جنيه)?\s*$", q)
        if m:
            p = _parse_price(m.group(1))
            if p:
                filters["price_max"] = p
    if re.search(r"(cheapest|cheap|lowest|lower price|ارخص|أرخص|رخيص|اقل سعر|أقل سعر)", q):
        filters["sort"] = "price_asc"
    elif re.search(r"(most expensive|expensive|highest|higher price|اغلى|أغلى|غالي|اعلى سعر|أعلى سعر)", q):
        filters["sort"] = "price_desc"
    return filters


def property_to_text(row: pd.Series) -> str:
    parts = [
        f"{row['Property Type']} for sale in {row['City']}.",
        f"{int(row['Beds'])} bedrooms, {int(row['Baths'])} bathrooms, {int(row['Area'])} m\u00b2.",
        f"Price: {int(row['Original Price']):,} EGP.",
    ]
    district = str(row.get("Compound_District", ""))
    location = str(row.get("Location", ""))
    if district and district != "nan":
        parts.append(f"Located in {district}.")
    if location and location != "nan" and location != district:
        parts.append(f"Area: {location}.")
    total_rooms = int(row["Beds"]) + int(row["Baths"])
    parts.append(f"{total_rooms} total rooms.")
    pps = int(row["Original Price"] / max(row["Area"], 1))
    parts.append(f"Price per m\u00b2: {pps:,} EGP.")
    return " ".join(parts)


def build_rag_dataset(df: pd.DataFrame, output_path: str):
    logger.info("Building RAG dataset from %d rows...", len(df))
    docs = []
    for i, (_, row) in enumerate(df.iterrows()):
        doc = {
            "id": f"prop_{i}",
            "text": property_to_text(row),
            "metadata": {
                "price": int(row["Original Price"]),
                "area": int(row["Area"]),
                "beds": int(row["Beds"]),
                "baths": int(row["Baths"]),
                "city": str(row["City"]),
                "type": str(row["Property Type"]),
                "district": str(row.get("Compound_District", "")),
                "location": str(row.get("Location", "")),
            },
        }
        docs.append(doc)
    with open(output_path, "w", encoding="utf-8") as f:
        for doc in docs:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
    logger.info("Saved %d documents to %s", len(docs), output_path)
    return docs


def _filter_doc_indices(
    docs: list[dict], filters: dict, searchable: list[str] | None = None
) -> np.ndarray:
    idxs = list(range(len(docs)))
    if filters.get("city"):
        token = filters["city"]
        if searchable is not None:
            idxs = [i for i in idxs if token in searchable[i]]
        else:
            idxs = [i for i in idxs if token in docs[i]["metadata"]["city"].lower()]
    if filters.get("type"):
        ptype = filters["type"]
        idxs = [i for i in idxs if docs[i]["metadata"]["type"] == ptype]
    if filters.get("beds"):
        idxs = [i for i in idxs if docs[i]["metadata"]["beds"] == filters["beds"]]
    if filters.get("baths"):
        idxs = [i for i in idxs if docs[i]["metadata"]["baths"] == filters["baths"]]
    if filters.get("price_min"):
        idxs = [i for i in idxs if docs[i]["metadata"]["price"] >= filters["price_min"]]
    if filters.get("price_max"):
        idxs = [i for i in idxs if docs[i]["metadata"]["price"] <= filters["price_max"]]
    return np.array(idxs, dtype=np.int64)


class RAGEngine:
    def __init__(self, df: pd.DataFrame, rebuild: bool = False):
        self.df = df
        self.docs: list[dict] = []
        self.searchable: list[str] = []
        self.faiss_index = None
        self.embeddings = None
        self.embed_model = None
        self.bm25 = None

        semantic = os.getenv("RAG_SEMANTIC", "1") != "0" and (
            rebuild
            or (os.path.isfile(EMBEDDINGS_FILE) and os.path.isfile(FAISS_INDEX_FILE))
        )
        if semantic:
            self._load_semantic(rebuild)
        else:
            logger.info("RAG running in BM25-only mode (semantic embeddings disabled).")

    def _load_semantic(self, rebuild: bool = False):
        if rebuild or not os.path.isfile(RAG_DATA_FILE):
            build_rag_dataset(self.df, RAG_DATA_FILE)

        self.docs = []
        with open(RAG_DATA_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.docs.append(json.loads(line))
        logger.info("Loaded %d docs from %s", len(self.docs), RAG_DATA_FILE)

        self.searchable = []
        for d in self.docs:
            meta = d["metadata"]
            text = " ".join(
                str(meta.get(k, "")) for k in ("city", "district", "location")
            )
            self.searchable.append(text.lower().replace("nan", " "))

        if rebuild or not os.path.isfile(EMBEDDINGS_FILE):
            logger.info("Computing embeddings...")
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            texts = [d["text"] for d in self.docs]
            embeddings = model.encode(texts, batch_size=256, show_progress_bar=True)
            np.save(EMBEDDINGS_FILE, embeddings)
            logger.info("Saved embeddings: %s", str(embeddings.shape))

        self.embeddings = np.load(EMBEDDINGS_FILE).astype(np.float32)
        faiss.normalize_L2(self.embeddings)

        if rebuild or not os.path.isfile(FAISS_INDEX_FILE):
            logger.info("Building FAISS index...")
            index = faiss.IndexFlatIP(VECTOR_SIZE)
            index.add(self.embeddings)
            faiss.write_index(index, FAISS_INDEX_FILE)
            logger.info("FAISS index saved")

        self.faiss_index = faiss.read_index(FAISS_INDEX_FILE)
        logger.info("FAISS index loaded: %d vectors", self.faiss_index.ntotal)

        if rebuild or not os.path.isfile(BM25_FILE):
            tokenized = [d["text"].lower().split() for d in self.docs]
            with open(BM25_FILE, "wb") as f:
                pickle.dump(tokenized, f)
            logger.info("Saved BM25 corpus")
        with open(BM25_FILE, "rb") as f:
            self.bm25 = BM25Okapi(pickle.load(f))
        logger.info("BM25 ready")

        self._load_embedding_model()

    def _load_embedding_model(self):
        from sentence_transformers import SentenceTransformer
        self.embed_model = SentenceTransformer("all-MiniLM-L6-v2")

    def _normalize(self, values: list[float]) -> list[float]:
        arr = np.array(values, dtype=float)
        mn, mx = arr.min(), arr.max()
        if mx - mn < 1e-9:
            return [1.0] * len(arr)
        return ((arr - mn) / (mx - mn)).tolist()

    @staticmethod
    def _mmr_rerank(
        candidate_idx: list[int],
        cand_embs: np.ndarray,
        relevance: np.ndarray,
        k: int,
        mmr_lambda: float = 0.7,
    ) -> list[int]:
        if not candidate_idx:
            return []
        k = min(k, len(candidate_idx))
        norm = lambda v: v / (np.linalg.norm(v) + 1e-9)
        emb = np.array([norm(e) for e in cand_embs])
        selected = []
        remaining = set(range(len(candidate_idx)))
        while len(selected) < k and remaining:
            best_i, best_score = -1, -1e18
            for i in remaining:
                sim_q = float(relevance[i])
                if selected:
                    max_sim = max(float(emb[i] @ emb[j]) for j in selected)
                else:
                    max_sim = 0.0
                score = mmr_lambda * sim_q - (1.0 - mmr_lambda) * max_sim
                if score > best_score:
                    best_score, best_i = score, i
            selected.append(best_i)
            remaining.discard(best_i)
        return [candidate_idx[i] for i in selected]

    def _filter_mask(self, df: pd.DataFrame, filters: dict) -> pd.Series:
        mask = pd.Series(True, index=df.index)
        if filters.get("city"):
            token = filters["city"]
            city = df["City"].astype(str).str.lower().str.contains(token, regex=False)
            district = df["Compound_District"].astype(str).str.lower().str.contains(token, regex=False)
            location = df["Location"].astype(str).str.lower().str.contains(token, regex=False)
            mask &= (city | district | location).fillna(False)
        if filters.get("type"):
            mask &= df["Property Type"].astype(str) == filters["type"]
        if filters.get("beds") is not None:
            mask &= df["Beds"] == filters["beds"]
        if filters.get("baths") is not None:
            mask &= df["Baths"] == filters["baths"]
        if filters.get("price_min"):
            mask &= df["Original Price"] >= filters["price_min"]
        if filters.get("price_max"):
            mask &= df["Original Price"] <= filters["price_max"]
        return mask

    def _bm25_search(
        self, query: str, filters: dict, sort_mode: str | None, k: int
    ) -> list[dict[str, Any]]:
        df = self.df
        mask = self._filter_mask(df, filters)

        relax_order = ("price_min", "price_max", "baths", "beds", "type", "city")
        for key in relax_order:
            if int(mask.sum()) < k and filters.get(key):
                del filters[key]
                mask = self._filter_mask(df, filters)
                logger.info("relaxed filter %s -> %d docs", key, int(mask.sum()))

        if int(mask.sum()) < 1:
            return []

        idxs = df.index[mask]

        def _to_result(row: pd.Series, score: float) -> dict[str, Any]:
            return {
                "id": f"prop_{row.name}",
                "text": property_to_text(row),
                "metadata": {
                    "price": int(row["Original Price"]),
                    "area": int(row["Area"]),
                    "beds": int(row["Beds"]),
                    "baths": int(row["Baths"]),
                    "city": str(row["City"]),
                    "type": str(row["Property Type"]),
                    "district": str(row.get("Compound_District", "")),
                    "location": str(row.get("Location", "")),
                },
                "score": round(float(score), 4),
            }

        if sort_mode:
            sub = df.loc[idxs].sort_values(
                "Original Price", ascending=sort_mode != "price_desc"
            )
            results, seen = [], set()
            for _, row in sub.iterrows():
                text = property_to_text(row)
                if text in seen:
                    continue
                seen.add(text)
                results.append(_to_result(row, 1.0))
                if len(results) >= k:
                    break
            return results

        rows = df.loc[idxs]
        max_rows = 20000
        if len(rows) > max_rows:
            rows = rows.sample(n=max_rows, random_state=42)

        texts = [property_to_text(row) for _, row in rows.iterrows()]

        tokens = query.lower().split()
        if filters.get("city"):
            tokens += filters["city"].split()
        if filters.get("type"):
            tokens += filters["type"].lower().split()
        if filters.get("beds") is not None:
            tokens += ["bed", "bedroom", "bedrooms"]
        if filters.get("baths") is not None:
            tokens += ["bath", "bathroom", "bathrooms"]

        bm25 = BM25Okapi([t.lower().split() for t in texts])
        scores = bm25.get_scores(tokens)

        results, seen = [], set()
        for pos in np.argsort(scores)[::-1]:
            if scores[pos] <= 0.0:
                continue
            text = texts[pos]
            if text in seen:
                continue
            seen.add(text)
            results.append(_to_result(rows.iloc[pos], scores[pos]))
            if len(results) >= k:
                break

        if not results:
            for _, row in rows.iterrows():
                text = property_to_text(row)
                if text in seen:
                    continue
                seen.add(text)
                results.append(_to_result(row, 0.0))
                if len(results) >= k:
                    break
        return results

    def hybrid_search(
        self, query: str, k: int = 5, alpha: float = 0.3
    ) -> list[dict[str, Any]]:
        filters = parse_filters(query)
        sort_mode = filters.pop("sort", None)
        logger.info("hybrid_search filters: %s", filters)

        if self.faiss_index is None or self.embeddings is None:
            return self._bm25_search(query, filters, sort_mode, k)

        idxs = _filter_doc_indices(self.docs, filters, self.searchable)
        logger.info("filtered to %d docs", len(idxs))

        relax_order = ("price_min", "price_max", "baths", "beds", "type", "city")
        for key in relax_order:
            if len(idxs) < k and filters.get(key):
                del filters[key]
                idxs = _filter_doc_indices(self.docs, filters, self.searchable)
                logger.info("relaxed filter %s -> %d docs", key, len(idxs))

        if len(idxs) < 1:
            return []

        if sort_mode:
            reverse = sort_mode == "price_desc"
            ordered = sorted(
                idxs, key=lambda i: self.docs[int(i)]["metadata"]["price"], reverse=reverse
            )
            results = []
            seen_texts = set()
            for gidx in ordered:
                doc = self.docs[int(gidx)]
                if doc["text"] in seen_texts:
                    continue
                seen_texts.add(doc["text"])
                results.append({
                    "id": doc["id"],
                    "text": doc["text"],
                    "metadata": dict(doc["metadata"]),
                    "score": round(1.0, 4),
                })
                if len(results) >= k:
                    break
            return results

        if len(idxs) < 2:
            gidx = idxs[0]
            doc = self.docs[int(gidx)]
            return [{
                "id": doc["id"],
                "text": doc["text"],
                "metadata": dict(doc["metadata"]),
                "score": round(1.0, 4),
            }]

        local_emb = self.embeddings[idxs]
        sub_index = faiss.IndexFlatIP(VECTOR_SIZE)
        sub_index.add(local_emb)

        query_emb = self.embed_model.encode([query]).astype(np.float32)
        faiss.normalize_L2(query_emb)
        n_candidates = max(k * 30, 150)
        distances, local_positions = sub_index.search(query_emb, n_candidates)
        local_positions = local_positions[0]
        distances = distances[0]

        global_indices = idxs[local_positions]

        seen_texts = set()
        uniq_pos = []
        for p, gi in enumerate(global_indices):
            t = self.docs[int(gi)]["text"]
            if t in seen_texts:
                continue
            seen_texts.add(t)
            uniq_pos.append(p)
        global_indices = global_indices[uniq_pos]
        distances = distances[uniq_pos]

        texts = [self.docs[int(gi)]["text"] for gi in global_indices]

        bm25_local = BM25Okapi([t.lower().split() for t in texts])
        tokenized_query = query.lower().split()
        bm25_scores = bm25_local.get_scores(tokenized_query)

        vec_norm = self._normalize(distances.tolist())
        bm25_norm = self._normalize(bm25_scores.tolist())

        relevance = np.array([
            alpha * bm25_norm[i] + (1.0 - alpha) * vec_norm[i]
            for i in range(len(global_indices))
        ])

        cand_embs = local_emb[local_positions[uniq_pos]]
        cand_pick = self._mmr_rerank(
            list(range(len(global_indices))), cand_embs, relevance, k
        )

        results = []
        for cidx in cand_pick:
            gidx = global_indices[cidx]
            doc = self.docs[int(gidx)]
            results.append({
                "id": doc["id"],
                "text": doc["text"],
                "metadata": dict(doc["metadata"]),
                "score": round(float(relevance[cidx]), 4),
            })
        return results
