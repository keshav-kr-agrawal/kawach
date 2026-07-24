"""
Live inference for the Prophet forecaster and Isolation Forest anomaly
detector. Called from /api/analytics/patterns (routes/analytics.py) and
appended after the existing 3 statistical pattern cards. Each function
returns [] if its model hasn't been trained yet.
"""
import os
import pickle

from app.ml.train_isolation_forest import build_crime_fingerprint_matrix

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
PROPHET_DIR = os.path.join(MODELS_DIR, "prophet_models")
IF_MODEL_PATH = os.path.join(MODELS_DIR, "isolation_forest.pkl")

SIGNIFICANT_PCT_CHANGE = 10.0


def ml_forecast_patterns(db) -> list:
    """Prophet 30/60/90-day forecast per crime type. Only reports crime
    types whose forecast moves >= SIGNIFICANT_PCT_CHANGE% vs. the trailing
    3-month average, so the panel doesn't fill up with noise."""
    patterns = []
    if not os.path.isdir(PROPHET_DIR):
        return patterns

    for pkl_file in sorted(os.listdir(PROPHET_DIR)):
        if not pkl_file.endswith(".pkl"):
            continue
        try:
            with open(os.path.join(PROPHET_DIR, pkl_file), "rb") as f:
                saved = pickle.load(f)

            model = saved["model"]
            crime_type = saved["crime_type"]

            future = model.make_future_dataframe(periods=3, freq="MS")
            forecast = model.predict(future)
            next_months = forecast.iloc[-3:]

            forecast_30d = int(max(0, next_months.iloc[0]["yhat"]))
            forecast_90d = int(max(0, next_months["yhat"].sum()))
            ci_lower = int(max(0, next_months.iloc[-1]["yhat_lower"]))
            ci_upper = int(max(0, next_months.iloc[-1]["yhat_upper"]))

            recent = forecast.iloc[-6:-3]["yhat"].mean()
            upcoming = forecast.iloc[-3:]["yhat"].mean()
            pct_change = ((upcoming - recent) / (recent + 1)) * 100
            direction = "increase" if pct_change > 5 else ("decrease" if pct_change < -5 else "stable")

            if abs(pct_change) < SIGNIFICANT_PCT_CHANGE:
                continue

            mape = saved.get("eval_mape", 10)
            patterns.append({
                "id": f"PAT-ML-PROPHET-{crime_type[:8].upper().replace(' ', '')}",
                "title": f"Prophet Forecast: {crime_type} {'Rising' if direction == 'increase' else 'Declining'}",
                "description": (
                    f"Prophet forecasts {crime_type} FIRs will {direction} "
                    f"{abs(pct_change):.0f}% over the next 90 days "
                    f"(forecast: {forecast_90d} FIRs, 95% CI: {ci_lower}-{ci_upper}). "
                    f"Holdout MAPE: {mape:.1f}%."
                ),
                "confidence": round(min(95.0, max(5.0, 100 - mape)), 1),
                "category": "Forecast",
                "sample_size": saved.get("train_months", 0),
                "forecast_30d": forecast_30d,
                "forecast_90d": forecast_90d,
                "confidence_interval": {"lower_90d": ci_lower, "upper_90d": ci_upper},
                "ml_model": "Prophet",
            })
        except Exception as e:
            print(f"[ML] Prophet inference failed for {pkl_file}: {e}")
    return patterns


def ml_anomaly_patterns(db) -> list:
    """Isolation Forest: scores every district's most recent month
    fingerprint (all crime types at once) against the trained model."""
    patterns = []
    if not os.path.exists(IF_MODEL_PATH):
        return patterns

    try:
        with open(IF_MODEL_PATH, "rb") as f:
            saved = pickle.load(f)
        model, scaler = saved["model"], saved["scaler"]
        feature_cols = saved["feature_cols"]
        threshold = saved["anomaly_threshold"]

        df, _ = build_crime_fingerprint_matrix(db)
        if df.empty:
            return patterns
        for c in feature_cols:
            if c not in df.columns:
                df[c] = 0.0

        df["_ym"] = df["year"].astype(str) + df["month"].astype(str).str.zfill(2)
        latest = df.loc[df.groupby("district")["_ym"].idxmax()]

        X = latest[feature_cols].values
        X_scaled = scaler.transform(X)
        scores = model.score_samples(X_scaled)
        baseline_mean = scaler.mean_

        for i, (_, row) in enumerate(latest.iterrows()):
            score = float(scores[i])
            if score >= threshold:
                continue
            elevated = [
                feature_cols[j].replace("_rate", "").replace("_", " ").title()
                for j in range(len(feature_cols))
                if X[i][j] > baseline_mean[j] * 1.5 and X[i][j] > 0
            ]
            patterns.append({
                "id": f"PAT-ML-IF-{row['district'][:8].upper().replace(' ', '')}",
                "title": f"Isolation Forest: Anomalous Crime Profile — {row['district']}",
                "description": (
                    f"Isolation Forest flagged a simultaneous multi-crime-type anomaly in "
                    f"{row['district']}. Elevated: {', '.join(elevated) or 'broad-based spike'}. "
                    f"Anomaly score {score:.3f} (threshold {threshold}), "
                    f"vs {saved['train_rows']} historical district-month profiles."
                ),
                "confidence": round(min(95.0, abs(score) * 150), 1),
                "category": "Anomaly",
                "sample_size": saved["train_rows"],
                "anomaly_score": round(score, 4),
                "district": row["district"],
                "elevated_crime_types": elevated,
                "ml_model": "Isolation Forest",
            })
    except Exception as e:
        print(f"[ML] Isolation Forest inference failed: {e}")
    return patterns
