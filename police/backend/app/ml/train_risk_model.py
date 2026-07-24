"""
Trains the XGBoost district-risk regressor that replaces the hand-tuned
formula in /api/analytics/predict.

Run once (and again any time generate_data.py is re-seeded):
    python -m app.ml.train_risk_model

Saves: app/ml/models/risk_model.pkl, risk_model_meta.json, shap_explainer.pkl

Honesty note: R2/RMSE are whatever the data actually supports and are
written to risk_model_meta.json unmodified — if the seeded FIR data has no
real correlation between district features and crime volume, this will
correctly report a low/negative R2 instead of a fabricated one. See
plan/zoho_master_plan.md's "Data Generation Fix" section for the seeding
change needed to give this model real signal to learn from.
"""
import os
import json
import pickle
from datetime import datetime

import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score

from app.database import SessionLocal
from app.ml.features import build_training_frame, FEATURE_COLS, TARGET_COL

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MIN_ROWS_FOR_SPLIT = 40


def train():
    db = SessionLocal()
    try:
        df = build_training_frame(db)
    finally:
        db.close()

    if len(df) < MIN_ROWS_FOR_SPLIT:
        print(f"[ML] Only {len(df)} district-month rows available "
              f"(need >= {MIN_ROWS_FOR_SPLIT}). Run generate_data.py first.")
        return None

    os.makedirs(MODELS_DIR, exist_ok=True)

    df = df.sort_values(["year", "month"]).reset_index(drop=True)
    split_idx = int(len(df) * 0.8)
    train_df, test_df = df.iloc[:split_idx], df.iloc[split_idx:]

    X_train, y_train = train_df[FEATURE_COLS].values, train_df[TARGET_COL].values
    X_test, y_test = test_df[FEATURE_COLS].values, test_df[TARGET_COL].values

    model = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        tree_method="hist",
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    model.get_booster().feature_names = FEATURE_COLS

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    print(f"[ML] XGBoost trained on {len(train_df)} rows, tested on {len(test_df)} — "
          f"R2={r2:.3f}, RMSE={rmse:.2f} crime/100k")

    # Reference band for turning a predicted crime_rate_per_100k into a
    # 0-100 risk score at inference time (percentile clip, not a fixed
    # constant, so it adapts to whatever the seeded data's scale is).
    p5, p95 = float(np.percentile(df[TARGET_COL], 5)), float(np.percentile(df[TARGET_COL], 95))

    try:
        import shap
        explainer = shap.TreeExplainer(model)
        with open(os.path.join(MODELS_DIR, "shap_explainer.pkl"), "wb") as f:
            pickle.dump(explainer, f)
        shap_available = True
    except Exception as e:
        print(f"[ML] SHAP explainer unavailable ({e}) — predictions will fall back "
              f"to feature-importance-based rationale.")
        shap_available = False

    with open(os.path.join(MODELS_DIR, "risk_model.pkl"), "wb") as f:
        pickle.dump({"model": model, "feature_cols": FEATURE_COLS}, f)

    with open(os.path.join(MODELS_DIR, "risk_model_meta.json"), "w") as f:
        json.dump({
            "algorithm": "XGBoost Regressor",
            "r2_score": round(r2, 4),
            "rmse": round(rmse, 2),
            "train_rows": len(train_df),
            "test_rows": len(test_df),
            "features": FEATURE_COLS,
            "target": TARGET_COL,
            "crime_rate_p5": p5,
            "crime_rate_p95": p95,
            "shap_available": shap_available,
            "trained_at": datetime.utcnow().isoformat(),
        }, f, indent=2)

    print(f"[ML] Saved artifacts to {MODELS_DIR}/")
    return model, r2, rmse


if __name__ == "__main__":
    train()
