"""
Live inference for the XGBoost district risk model. Called from
/api/analytics/predict (routes/analytics.py). Returns None if the model
hasn't been trained yet (analytics.py falls back to the statistical
formula in that case) — see the "Graceful Degradation Rule" in
plan/zoho_master_plan.md.
"""
import os
import json
import pickle

import numpy as np

from app.ml.features import FEATURE_COLS

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
RISK_MODEL_PATH = os.path.join(MODELS_DIR, "risk_model.pkl")
RISK_META_PATH = os.path.join(MODELS_DIR, "risk_model_meta.json")
SHAP_PATH = os.path.join(MODELS_DIR, "shap_explainer.pkl")

_FEATURE_LABELS = {
    "unemployment_rate": "unemployment rate",
    "poverty_rate": "poverty rate",
    "police_per_capita": "police-per-capita index",
    "gdp_per_capita": "GDP per capita",
    "school_density": "school density",
    "hospital_density": "hospital density",
    "population_density": "population density",
    "month_sin": "seasonal phase (sin)",
    "month_cos": "seasonal phase (cos)",
    "festival_flag": "festival-month effect",
    "adjacent_crime_rate": "adjacent-district spillover",
    "lagged_crime_rate_3m": "3-month crime momentum",
    "lagged_crime_rate_12m": "12-month year-over-year crime level",
}


def _score_to_risk(crime_rate: float, p5: float, p95: float) -> float:
    if p95 <= p5:
        return 50.0
    pct = (crime_rate - p5) / (p95 - p5)
    return float(round(min(100.0, max(0.0, pct * 100)), 1))


def _tier(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def ml_predict_district_risk(feature_df) -> list | None:
    """feature_df: pandas DataFrame from features.build_latest_month_frame().
    Returns a list of prediction dicts matching the existing /predict schema
    plus ml_model/model_r2/shap_explanation, or None if the model isn't
    trained yet."""
    if feature_df is None or feature_df.empty:
        return None
    if not (os.path.exists(RISK_MODEL_PATH) and os.path.exists(RISK_META_PATH)):
        return None

    try:
        with open(RISK_MODEL_PATH, "rb") as f:
            saved = pickle.load(f)
        model = saved["model"]
        with open(RISK_META_PATH) as f:
            meta = json.load(f)

        explainer = None
        if meta.get("shap_available") and os.path.exists(SHAP_PATH):
            with open(SHAP_PATH, "rb") as f:
                explainer = pickle.load(f)

        X = feature_df[FEATURE_COLS].values
        preds = model.predict(X)

        shap_values = None
        if explainer is not None:
            shap_values = explainer.shap_values(X)

        p5, p95 = meta["crime_rate_p5"], meta["crime_rate_p95"]
        results = []
        for i, (_, row) in enumerate(feature_df.iterrows()):
            crime_rate_pred = float(preds[i])
            risk_score = _score_to_risk(crime_rate_pred, p5, p95)

            if shap_values is not None:
                contribs = sorted(
                    zip(FEATURE_COLS, shap_values[i]),
                    key=lambda x: abs(x[1]), reverse=True,
                )[:3]
                parts = [
                    f"{_FEATURE_LABELS.get(f, f)} ({'+' if v >= 0 else ''}{v:.1f} crime/100k)"
                    for f, v in contribs
                ]
                shap_explanation = "Risk primarily driven by: " + "; ".join(parts) + "."
            else:
                importances = model.feature_importances_
                top = sorted(zip(FEATURE_COLS, importances), key=lambda x: x[1], reverse=True)[:3]
                shap_explanation = ("Top model features (global importance, SHAP unavailable): "
                                     + ", ".join(_FEATURE_LABELS.get(f, f) for f, _ in top) + ".")

            results.append({
                "district_id": row["district_id"],
                "district_name": row["district_name"],
                "risk_score": risk_score,
                "risk_tier": _tier(risk_score),
                "predicted_crime_rate_per_100k": round(crime_rate_pred, 1),
                "contributing_factors": {
                    "unemployment": f"Unemployment rate at {row['unemployment_rate']}%",
                    "poverty": f"Poverty rate at {round(row['poverty_rate'], 1)}%",
                    "police_density": f"Police per capita index at {round(row['police_per_capita'], 1)}",
                    "recent_crime_volume": f"Predicted {round(crime_rate_pred, 1)} FIRs per 100k next month",
                },
                "shap_explanation": shap_explanation,
                "ml_model": "XGBoost Regressor",
                "model_r2": meta["r2_score"],
                "model_rmse": meta["rmse"],
            })

        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results
    except Exception as e:
        print(f"[ML] XGBoost prediction failed, falling back to formula: {e}")
        return None
