"""
Trains one Prophet model per crime type on statewide monthly FIR counts,
used to upgrade /api/analytics/patterns with 30/60/90-day forecasts.

Run once (and again any time generate_data.py is re-seeded):
    python -m app.ml.train_prophet

Saves: app/ml/models/prophet_models/<crime_type_slug>.pkl
"""
import os
import pickle

import pandas as pd
from sqlalchemy import func, extract

from app.database import SessionLocal
from app.models import FIRRecord

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models", "prophet_models")
MIN_MONTHS = 12
HOLDOUT_MONTHS = 3

# Karnataka festival calendar — used as Prophet custom holidays so the
# model can attribute festival-season spikes to a named effect instead of
# folding them into generic yearly seasonality.
KARNATAKA_HOLIDAYS = pd.DataFrame({
    "holiday": (
        ["Ugadi"] * 5 + ["Dasara"] * 5 + ["Sankranti"] * 5
    ),
    "ds": pd.to_datetime([
        "2020-03-25", "2021-04-13", "2022-04-02", "2023-03-22", "2024-04-09",
        "2020-10-25", "2021-10-15", "2022-10-05", "2023-10-24", "2024-10-12",
        "2020-01-15", "2021-01-14", "2022-01-14", "2023-01-15", "2024-01-15",
    ]),
    "lower_window": 0,
    "upper_window": 3,
})


def _slugify(crime_type: str) -> str:
    return crime_type.lower().replace(" / ", "_").replace(" ", "_").replace("(", "").replace(")", "")


def train_for_crime_type(db, crime_type: str):
    from prophet import Prophet

    rows = (
        db.query(
            extract("year", FIRRecord.date_filed).label("year"),
            extract("month", FIRRecord.date_filed).label("month"),
            func.count(FIRRecord.id).label("count"),
        )
        .filter(FIRRecord.crime_type == crime_type)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )
    if len(rows) < MIN_MONTHS:
        print(f"[Prophet] Skipping {crime_type} — only {len(rows)} months of data")
        return None

    df = pd.DataFrame([
        {"ds": pd.Timestamp(year=int(r.year), month=int(r.month), day=1), "y": r.count}
        for r in rows
    ])

    # Holdout eval: fit on all-but-last-N months, score against actuals.
    train_df = df.iloc[:-HOLDOUT_MONTHS] if len(df) > MIN_MONTHS else df
    eval_model = Prophet(
        seasonality_mode="multiplicative",
        yearly_seasonality=len(df) >= 24,
        weekly_seasonality=False,
        daily_seasonality=False,
        holidays=KARNATAKA_HOLIDAYS,
    )
    eval_model.fit(train_df)
    future = eval_model.make_future_dataframe(periods=HOLDOUT_MONTHS, freq="MS")
    forecast = eval_model.predict(future)
    predictions = forecast.iloc[-HOLDOUT_MONTHS:]["yhat"].values
    actuals = df.iloc[-HOLDOUT_MONTHS:]["y"].values
    mae = float(abs(predictions - actuals).mean())
    mape = float((abs((actuals - predictions) / (actuals + 1))).mean() * 100)
    print(f"[Prophet] {crime_type}: MAE={mae:.1f}, MAPE={mape:.1f}% (holdout={HOLDOUT_MONTHS}mo)")

    # Full-data production model.
    model = Prophet(
        seasonality_mode="multiplicative",
        yearly_seasonality=len(df) >= 24,
        weekly_seasonality=False,
        daily_seasonality=False,
        holidays=KARNATAKA_HOLIDAYS,
        changepoint_prior_scale=0.15,
    )
    model.fit(df)

    output = {
        "model": model,
        "crime_type": crime_type,
        "train_months": len(rows),
        "eval_mae": round(mae, 2),
        "eval_mape": round(mape, 2),
    }
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(os.path.join(MODELS_DIR, f"{_slugify(crime_type)}.pkl"), "wb") as f:
        pickle.dump(output, f)
    return output


def train():
    db = SessionLocal()
    try:
        crime_types = [r[0] for r in db.query(FIRRecord.crime_type).distinct().all()]
        if not crime_types:
            print("[Prophet] No FIR data found. Run generate_data.py first.")
            return
        print(f"[Prophet] Training {len(crime_types)} crime-type models...")
        for ct in crime_types:
            train_for_crime_type(db, ct)
    finally:
        db.close()
    print("[Prophet] Done.")


if __name__ == "__main__":
    train()
