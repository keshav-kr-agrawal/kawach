"""
Trains the Isolation Forest that flags districts whose simultaneous
multi-crime-type profile is a statistical outlier vs. all other
district-months — the multivariate check Z-scores can't do because they
only ever look at one crime type at a time.

Run once (and again any time generate_data.py is re-seeded):
    python -m app.ml.train_isolation_forest

Saves: app/ml/models/isolation_forest.pkl

Note: crime-type columns are derived from whatever FIRRecord.crime_type
values actually exist in the DB (via a pandas pivot), not a hardcoded list —
generate_data.py's CRIME_TYPES_IPC labels ("Theft / Robbery", "Cybercrime /
Phishing", ...) don't match generic category names like "Theft"/"Cybercrime",
so hardcoding would silently create empty columns.
"""
import os
import pickle

import numpy as np
import pandas as pd
from sqlalchemy import func, extract
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.database import SessionLocal
from app.models import District, FIRRecord, PoliceStation

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MIN_ROWS_FOR_TRAINING = 30
CONTAMINATION = 0.05


def _slugify(crime_type: str) -> str:
    return crime_type.lower().replace(" / ", "_").replace(" ", "_").replace("(", "").replace(")", "")


def build_crime_fingerprint_matrix(db):
    districts_by_id = {d.id: d for d in db.query(District).all()}

    rows = (
        db.query(
            PoliceStation.district_id,
            extract("year", FIRRecord.date_filed).label("year"),
            extract("month", FIRRecord.date_filed).label("month"),
            FIRRecord.crime_type,
            func.count(FIRRecord.id).label("count"),
        )
        .join(FIRRecord, FIRRecord.police_station_id == PoliceStation.id)
        .group_by(PoliceStation.district_id, "year", "month", FIRRecord.crime_type)
        .all()
    )

    data = {}
    crime_cols = set()
    for did, year, month, crime_type, count in rows:
        dist = districts_by_id.get(did)
        if not dist:
            continue
        key = (dist.name, int(year), int(month))
        pop = dist.population or 500000
        col = f"{_slugify(crime_type)}_rate"
        crime_cols.add(col)
        entry = data.setdefault(key, {"district": dist.name, "year": int(year), "month": int(month)})
        entry[col] = (count / pop) * 100000

    df = pd.DataFrame(list(data.values()))
    if df.empty:
        return df, []
    rate_cols = sorted(crime_cols)
    for c in rate_cols:
        if c not in df.columns:
            df[c] = 0.0
    df[rate_cols] = df[rate_cols].fillna(0.0)
    return df, rate_cols


def train():
    db = SessionLocal()
    try:
        df, rate_cols = build_crime_fingerprint_matrix(db)
    finally:
        db.close()

    if len(df) < MIN_ROWS_FOR_TRAINING:
        print(f"[IF] Only {len(df)} district-month rows — need >= {MIN_ROWS_FOR_TRAINING}. "
              f"Run generate_data.py first.")
        return None

    os.makedirs(MODELS_DIR, exist_ok=True)

    X = df[rate_cols].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # Derive the anomaly cutoff from this model's own score distribution
    # (the contamination-th percentile) rather than a hardcoded constant —
    # score_samples()'s scale shifts with dataset size/sparsity, so a fixed
    # threshold silently flags 0% or 100% depending on how much data there is.
    scores = model.score_samples(X_scaled)
    anomaly_threshold = float(np.percentile(scores, CONTAMINATION * 100))
    flagged = int((scores < anomaly_threshold).sum())
    print(f"[IF] Trained on {len(df)} district-months across {len(rate_cols)} crime types — "
          f"{flagged} flagged anomalous ({flagged / len(df) * 100:.1f}%, target ~5%), "
          f"threshold={anomaly_threshold:.4f}")

    output = {
        "model": model,
        "scaler": scaler,
        "feature_cols": rate_cols,
        "train_rows": len(df),
        "anomaly_threshold": anomaly_threshold,
        "flagged_pct": round(float(flagged) / len(df) * 100, 2),
    }
    with open(os.path.join(MODELS_DIR, "isolation_forest.pkl"), "wb") as f:
        pickle.dump(output, f)

    print(f"[IF] Saved to {MODELS_DIR}/isolation_forest.pkl")
    return output


if __name__ == "__main__":
    train()
