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
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.ml.features import zcql_rows, get_districts, get_station_district_map, _parse_date

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MIN_ROWS_FOR_TRAINING = 30
CONTAMINATION = 0.05


def _slugify(crime_type: str) -> str:
    return crime_type.lower().replace(" / ", "_").replace(" ", "_").replace("(", "").replace(")", "")


def get_case_category_lookup(db) -> dict:
    """CaseCategoryID -> human-readable crime-type label. CaseMaster only
    carries the numeric CaseCategoryID (Zoho's prescribed lookup-table
    design), not a crime-type string, so the fingerprint columns need this
    join to reproduce the same column names the model was trained on."""
    return {
        c["CaseCategoryID"]: c.get("LookupValue") or f"category_{c['CaseCategoryID']}"
        for c in zcql_rows(db, "CaseCategory")
        if c.get("CaseCategoryID") is not None
    }


def build_crime_fingerprint_matrix(db):
    """district-month x crime-type rate matrix, built from raw ZCQL rows
    joined/grouped in Python (see features.py's module docstring for why —
    matches the rest of the migrated ML pipeline, not a SQLAlchemy query)."""
    districts_by_id = get_districts(db)
    station_to_district = get_station_district_map(db)
    category_labels = get_case_category_lookup(db)

    counts = {}
    for c in zcql_rows(db, "CaseMaster"):
        did = station_to_district.get(c.get("PoliceStationID"))
        d = _parse_date(c.get("CrimeRegisteredDate"))
        cat_id = c.get("CaseCategoryID")
        if did is None or d is None or cat_id is None:
            continue
        key = (did, d.year, d.month, cat_id)
        counts[key] = counts.get(key, 0) + 1

    data = {}
    crime_cols = set()
    for (did, year, month, cat_id), count in counts.items():
        dist = districts_by_id.get(did)
        if not dist:
            continue
        crime_type = category_labels.get(cat_id, f"category_{cat_id}")
        key = (dist["name"], year, month)
        pop = dist["population"]
        col = f"{_slugify(crime_type)}_rate"
        crime_cols.add(col)
        entry = data.setdefault(key, {"district": dist["name"], "year": year, "month": month})
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
    from app.database import get_db
    db = next(get_db())
    df, rate_cols = build_crime_fingerprint_matrix(db)

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
