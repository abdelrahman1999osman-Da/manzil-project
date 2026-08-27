import os
import logging
import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger("manzil.engine")

NUMERIC_FEATURES = ["Beds", "Baths", "Area", "Total_Rooms", "Area_Per_Room"]
CATEGORICAL_FEATURES = ["Property Type", "Location", "City", "Compound_District"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


class ManzilEngine:
    def __init__(self, base_dir: str):
        t0 = pd.Timestamp.now()
        parent = os.path.join(base_dir, "..")

        self.model = joblib.load(os.path.join(parent, "lgb_model.joblib"))
        self.preprocessor = joblib.load(os.path.join(parent, "preprocessor.joblib"))
        self.categories = joblib.load(os.path.join(parent, "categories.joblib"))
        self.correction = joblib.load(os.path.join(parent, "correction_tables.joblib"))
        self.confidence = joblib.load(os.path.join(parent, "confidence_stats.joblib"))

        self.dataset = pd.read_excel(
            os.path.join(parent, "cleaned_property_data.xlsx")
        )

        self.feature_names = self.preprocessor.get_feature_names_out().tolist()
        self._explainer = None

        self._precompute_analytics()
        elapsed = (pd.Timestamp.now() - t0).total_seconds()
        logger.info("ManzilEngine loaded in %.2fs (%d rows)", elapsed, len(self.dataset))

    def _get_explainer(self):
        if self._explainer is None:
            import shap
            self._explainer = shap.TreeExplainer(self.model)
        return self._explainer

    def _build_input(self, data) -> pd.DataFrame:
        total_rooms = data.Beds + data.Baths
        area_per_room = data.Area / total_rooms if total_rooms > 0 else 0
        row = {
            "Beds": data.Beds,
            "Baths": data.Baths,
            "Area": data.Area,
            "Total_Rooms": total_rooms,
            "Area_Per_Room": area_per_room,
            "Property Type": str(data.Property_Type),
            "Location": str(data.Location),
            "City": str(data.City),
            "Compound_District": str(data.Compound_District),
        }
        df = pd.DataFrame([row])
        df[CATEGORICAL_FEATURES] = df[CATEGORICAL_FEATURES].astype(str)
        return df

    def _apply_correction(self, raw_price: float, prop_type: str, city: str) -> float:
        type_corr = self.correction.get("by_type", {}).get(prop_type, {}).get("median_ratio", 1.0)
        city_corr = self.correction.get("by_city", {}).get(city, {}).get("median_ratio", 1.0)
        if type_corr > 1.0 and city_corr > 1.0:
            combined = min(type_corr, city_corr)
        elif type_corr < 1.0 and city_corr < 1.0:
            combined = max(type_corr, city_corr)
        else:
            combined = (type_corr + city_corr) / 2.0
        return raw_price / combined

    def _aggregate_shap(self, shap_values: np.ndarray, user_input: pd.DataFrame) -> list[dict]:
        raw = user_input.iloc[0]
        sv = shap_values[0]

        total_shap_log = sv.sum()
        explainer = self._get_explainer()
        base_egp = float(np.expm1(explainer.expected_value
                                  if np.isscalar(explainer.expected_value)
                                  else explainer.expected_value[0]))
        processed = self.preprocessor.transform(user_input)
        final_log = float(self.model.predict(processed)[0])
        final_egp = float(np.expm1(final_log))
        total_change_egp = final_egp - base_egp

        display_map = {
            "Beds": f"{int(raw['Beds'])} beds",
            "Baths": f"{int(raw['Baths'])} baths",
            "Area": f"{int(raw['Area'])} m\u00b2",
            "Total_Rooms": f"{int(raw['Total_Rooms'])} rooms",
            "Area_Per_Room": f"{raw['Area_Per_Room']:.1f} m\u00b2/room",
            "Property Type": str(raw["Property Type"]),
            "City": str(raw["City"]),
            "Compound_District": str(raw["Compound_District"]),
            "Location": str(raw["Location"]),
        }

        contributions = {}
        for fname, val in zip(self.feature_names, sv):
            if fname.startswith("num__"):
                orig = fname[5:]
                contributions[orig] = contributions.get(orig, 0.0) + float(val)
            elif fname.startswith("cat__"):
                for cat_col in CATEGORICAL_FEATURES:
                    prefix = f"cat__{cat_col}_"
                    if fname.startswith(prefix):
                        contributions[cat_col] = contributions.get(cat_col, 0.0) + float(val)
                        break

        result = []
        for feat, log_contrib in contributions.items():
            if feat in ("Total_Rooms", "Area_Per_Room"):
                continue
            proportion = log_contrib / total_shap_log if total_shap_log != 0 else 0
            egp_contrib = proportion * total_change_egp
            result.append({
                "feature": feat,
                "display": display_map.get(feat, feat),
                "contribution": round(egp_contrib),
                "direction": "positive" if egp_contrib >= 0 else "negative",
            })

        result.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return result

    def predict(self, data) -> dict:
        user_input = self._build_input(data)
        processed = self.preprocessor.transform(user_input)
        log_price = self.model.predict(processed)[0]
        raw_price = float(np.expm1(log_price))
        final_price = self._apply_correction(raw_price, data.Property_Type, data.City)
        adjustment = final_price - raw_price

        ci = self.confidence
        lower = max(0, final_price + ci["residual_q025"])
        upper = final_price + ci["residual_q975"]

        result = {
            "price": round(final_price),
            "confidence_interval": {
                "lower": round(lower),
                "upper": round(upper),
                "confidence_pct": 95,
            },
            "investment_score": None,
        }

        listed = getattr(data, "Listed_Price", None)
        if listed and listed > 0:
            diff = final_price - listed
            diff_pct = (diff / listed) * 100 if listed else 0
            if diff_pct > 15:
                rating, status, label = 5, "excellent_deal", "Excellent Investment Opportunity"
            elif diff_pct > 5:
                rating, status, label = 4, "good_deal", "Good Investment Opportunity"
            elif diff_pct > -5:
                rating, status, label = 3, "fair_price", "Fair Market Price"
            elif diff_pct > -15:
                rating, status, label = 2, "overpriced", "Slightly Overpriced"
            else:
                rating, status, label = 1, "overpriced", "Overpriced Property"
            result["investment_score"] = {
                "listed_price": round(listed),
                "predicted_price": round(final_price),
                "difference": round(-diff),
                "difference_pct": round(-diff_pct, 1),
                "rating": rating,
                "status": status,
                "label": label,
            }

        return result

    def explain(self, data) -> dict:
        user_input = self._build_input(data)
        processed = self.preprocessor.transform(user_input)
        log_price = self.model.predict(processed)[0]
        raw_price = float(np.expm1(log_price))
        final_price = self._apply_correction(raw_price, data.Property_Type, data.City)

        shap_values = self._get_explainer().shap_values(processed)
        contributions = self._aggregate_shap(shap_values, user_input)

        explainer = self._get_explainer()
        base_value = float(np.expm1(explainer.expected_value)) if np.isscalar(explainer.expected_value) else float(np.expm1(explainer.expected_value[0]))

        return {
            "base_value": round(base_value),
            "model_prediction": round(raw_price),
            "market_adjustment": round(final_price - raw_price),
            "final_prediction": round(final_price),
            "feature_contributions": contributions,
        }

    def simulate(self, data) -> dict:
        user_input = self._build_input(data)
        processed = self.preprocessor.transform(user_input)
        log_price = self.model.predict(processed)[0]
        raw_price = float(np.expm1(log_price))
        final_price = self._apply_correction(raw_price, data.Property_Type, data.City)
        return {"price": round(final_price)}

    def find_similar(self, data, n: int = 5) -> dict:
        city = str(data.City)
        ptype = str(data.Property_Type)
        beds = data.Beds
        baths = data.Baths
        area = data.Area

        mask = (self.dataset["City"] == city) & (self.dataset["Property Type"] == ptype)
        candidates = self.dataset[mask]

        if len(candidates) < n:
            candidates = self.dataset[self.dataset["City"] == city]
        if len(candidates) < n:
            candidates = self.dataset

        num_cols = ["Beds", "Baths", "Area"]
        cand_features = candidates[num_cols].values.astype(float)
        input_features = np.array([[beds, baths, area]], dtype=float)
        distances = np.sqrt(np.sum((cand_features - input_features) ** 2, axis=1))

        top_idx = distances.argsort()[:n * 3]
        results = []
        seen = set()
        for idx in top_idx:
            row = candidates.iloc[idx]
            key = (int(row["Beds"]), int(row["Baths"]), int(row["Area"]), str(row["Original Price"]))
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "price": int(row["Original Price"]),
                "area": int(row["Area"]),
                "beds": int(row["Beds"]),
                "baths": int(row["Baths"]),
                "city": str(row["City"]),
                "district": str(row["Compound_District"]),
                "location": str(row["Location"]),
                "type": str(row["Property Type"]),
                "price_diff": 0,
            })
            if len(results) >= n:
                break

        user_input = self._build_input(data)
        processed = self.preprocessor.transform(user_input)
        log_price = self.model.predict(processed)[0]
        final_price = self._apply_correction(float(np.expm1(log_price)), ptype, city)

        for r in results:
            r["price_diff"] = round(final_price) - r["price"]

        return {"similar_properties": results}

    def _precompute_analytics(self):
        self.analytics = self._compute_analytics(self.dataset)

    def _compute_analytics(self, df: pd.DataFrame) -> dict:
        if len(df) == 0:
            return {
                "summary": {"total": 0, "avg_price": 0, "median_price": 0, "avg_area": 0},
                "avg_price_by_city": [], "avg_price_by_district": [],
                "price_per_sqm_by_city": [], "price_distribution": {"bins": [], "counts": []},
                "area_distribution": {"bins": [], "counts": []}, "property_type_distribution": {},
                "price_vs_area": [], "top_expensive": [], "top_affordable": [],
                "correlation": {"area_price": 0, "beds_price": 0, "baths_price": 0},
            }
        top_cities = df["City"].value_counts().head(20).index.tolist()
        top_districts = df["Compound_District"].value_counts().head(30).index.tolist()

        return {
            "summary": {
                "total": len(df),
                "avg_price": round(df["Original Price"].mean()),
                "median_price": round(df["Original Price"].median()),
                "avg_area": round(df["Area"].mean(), 1),
            },
            "avg_price_by_city": [
                {"city": c, "avg_price": round(df[df["City"] == c]["Original Price"].mean()), "count": int((df["City"] == c).sum())}
                for c in top_cities
            ],
            "avg_price_by_district": [
                {"district": d, "avg_price": round(df[df["Compound_District"] == d]["Original Price"].mean()), "count": int((df["Compound_District"] == d).sum())}
                for d in top_districts
            ],
            "price_per_sqm_by_city": [
                {"city": c, "avg_ppsm": round(df[df["City"] == c]["Price_Per_SQM"].mean())}
                for c in top_cities
                if pd.notna(df[df["City"] == c]["Price_Per_SQM"].mean())
            ],
            "price_distribution": self._histogram(df["Original Price"].values, 25),
            "area_distribution": self._histogram(df["Area"].values, 20),
            "property_type_distribution": df["Property Type"].value_counts().to_dict(),
            "price_vs_area": df[["Area", "Original Price", "Property Type"]].sample(
                min(600, len(df)), random_state=42
            ).to_dict("records"),
            "top_expensive": [
                {"city": r["City"], "avg_price": round(r["mean_price"])}
                for r in df.groupby("City")["Original Price"].mean().reset_index().rename(columns={"Original Price": "mean_price"}).nlargest(10, "mean_price").to_dict("records")
            ],
            "top_affordable": [
                {"city": r["City"], "avg_price": round(r["mean_price"])}
                for r in df.groupby("City")["Original Price"].mean().reset_index().rename(columns={"Original Price": "mean_price"}).nsmallest(10, "mean_price").to_dict("records")
            ],
            "correlation": {
                "area_price": round(df["Area"].corr(df["Original Price"]), 3),
                "beds_price": round(df["Beds"].corr(df["Original Price"]), 3),
                "baths_price": round(df["Baths"].corr(df["Original Price"]), 3),
            },
        }

    def get_analytics(self, city: str | None = None, ptype: str | None = None) -> dict:
        df = self.dataset
        if city:
            df = df[df["City"] == city]
        if ptype:
            df = df[df["Property Type"] == ptype]
        return self._compute_analytics(df)

    def retrieve_context(self, question: str) -> str:
        """RAG: extract filters from user question and return relevant market context."""
        q = question.lower()
        all_cities = sorted(self.categories.get("City_Map", {}).keys(), key=len, reverse=True)
        types = self.categories.get("Property Type", [])

        found_city = None
        for c in all_cities:
            if c.lower() in q:
                found_city = c
                break

        found_type = None
        for t in types:
            if t.lower() in q:
                found_type = t
                break

        stats = self.get_analytics(city=found_city, ptype=found_type)
        s = stats["summary"]

        parts = []

        if found_city and found_type:
            parts.append(f"There are {s['total']:,} {found_type} properties in {found_city}.")
            parts.append(f"The average price is {s['avg_price']:,.0f} EGP, the median is {s['median_price']:,.0f} EGP.")
            parts.append(f"The average area is {s['avg_area']:.0f} m\u00b2.")
        elif found_city:
            parts.append(f"There are {s['total']:,} properties in {found_city}.")
            parts.append(f"The average price is {s['avg_price']:,.0f} EGP, the median is {s['median_price']:,.0f} EGP.")
            parts.append(f"The average area is {s['avg_area']:.0f} m\u00b2.")
        elif found_type:
            parts.append(f"There are {s['total']:,} {found_type} properties in our database.")
            parts.append(f"The average price is {s['avg_price']:,.0f} EGP, the median is {s['median_price']:,.0f} EGP.")
        else:
            parts.append(f"Our database has {s['total']:,} properties total across Egypt.")
            parts.append(f"The overall average price is {s['avg_price']:,.0f} EGP, median is {s['median_price']:,.0f} EGP.")

        if stats["property_type_distribution"] and not found_type:
            dist = stats["property_type_distribution"]
            top = sorted(dist.items(), key=lambda x: -x[1])[:5]
            type_str = ", ".join(f"{t}: {c:,}" for t, c in top)
            parts.append(f"Property type breakdown: {type_str}.")

        if found_city and stats["price_per_sqm_by_city"]:
            for item in stats["price_per_sqm_by_city"]:
                if item["city"] == found_city:
                    parts.append(f"The average price per square meter in {found_city} is {item['avg_ppsm']:,.0f} EGP.")
                    break

        if found_city and stats["avg_price_by_district"]:
            districts = stats["avg_price_by_district"][:5]
            parts.append("Average prices by district:")
            for d in districts:
                parts.append(f"- {d['district']}: {d['avg_price']:,.0f} EGP ({d['count']} listings)")

        if stats["top_expensive"] and not found_city:
            parts.append("Most expensive cities: " + ", ".join(
                f"{e['city']} ({e['avg_price']:,.0f} EGP)" for e in stats["top_expensive"][:5]
            ) + ".")

        if stats["top_affordable"] and not found_city:
            parts.append("Most affordable cities: " + ", ".join(
                f"{e['city']} ({e['avg_price']:,.0f} EGP)" for e in stats["top_affordable"][:5]
            ) + ".")

        corr = stats["correlation"]
        parts.append(f"Price correlations: area={corr['area_price']}, bedrooms={corr['beds_price']}, bathrooms={corr['baths_price']}.")

        return "\n".join(parts)

    @staticmethod
    def _histogram(values: np.ndarray, bins: int) -> dict:
        counts, edges = np.histogram(values, bins=bins)
        return {
            "bins": [round(float(e)) for e in edges],
            "counts": [int(c) for c in counts],
        }
