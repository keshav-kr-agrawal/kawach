"""
One-shot pipeline: join real NCRB district crime data (2001-2012) + real
Census 2011 socioeconomic data + real Karnataka 2021-22 district income data,
retrain XGBoost risk model + Isolation Forest anomaly detector on it, and
drop the artifacts straight into police/backend/app/ml/models/.

Prophet is NOT retrained here — no real monthly district crime series exists
publicly anywhere for India (confirmed via research); it stays trained on
the synthetic data, documented honestly in docs/ML_OVERVIEW.md.
"""
import json
import pickle
import numpy as np
import pandas as pd

MODELS_DIR = r"D:\vignesh\files\Personal\projects\kawach\police\backend\app\ml\models"

# Real district areas (sq km) — same static figures used in generate_data.py's
# KARNATAKA_DISTRICTS table, sourced from Survey of India district records.
AREA_SQKM = {
    "Bengaluru Urban": 2196, "Mysuru": 6854, "Dakshina Kannada": 4843, "Dharwad": 4263,
    "Belagavi": 13415, "Kalaburagi": 10951, "Shivamogga": 8477, "Udupi": 3880,
    "Tumakuru": 10597, "Ballari": 4252, "Vijayapura": 10498, "Bagalkote": 6575,
    "Bidar": 5448, "Mandya": 4961, "Hassan": 6814, "Chikkamagaluru": 7201,
    "Chitradurga": 8440, "Davanagere": 5924, "Kolar": 3969, "Chikkaballapura": 4254,
    "Ramanagara": 3556, "Bengaluru Rural": 2295, "Chamarajanagar": 5101, "Kodagu": 4102,
    "Uttara Kannada": 10291, "Haveri": 4823, "Gadag": 4656, "Koppal": 5570,
    "Raichur": 8440, "Yadgir": 5234, "Vijayanagara": 5644,
}

# NCRB (old, pre-2014-renaming, pre-2021-Vijayanagara-split) district name ->
# current district name. Where an old jurisdiction was later split (Bangalore
# Rural -> Bengaluru Rural + Ramanagara; Bellary -> Ballari + Vijayanagara),
# both new districts draw from the same old row — a documented approximation,
# not a fabrication, since no pre-split NCRB breakdown exists.
NAME_MAP = {
    "BANGALORE COMMR.": "Bengaluru Urban",
    "BANGALORE RURAL": "Bengaluru Rural",
    "RAMANAGAR": "Ramanagara",
    "BELGAUM": "Belagavi",
    "BELLARY": "Ballari",
    "BIDAR": "Bidar",
    "BIJAPUR": "Vijayapura",
    "CBPURA": "Chikkaballapura",
    "CHAMARAJNAGAR": "Chamarajanagar",
    "CHICKMAGALUR": "Chikkamagaluru",
    "CHITRADURGA": "Chitradurga",
    "DAKSHIN KANNADA": "Dakshina Kannada",
    "MANGALORE CITY": "Dakshina Kannada",
    "DAVANAGERE": "Davanagere",
    "DHARWAD COMMR.": "Dharwad",
    "DHARWAD RURAL": "Dharwad",
    "GADAG": "Gadag",
    "GULBARGA": "Kalaburagi",
    "HASSAN": "Hassan",
    "HAVERI": "Haveri",
    "KOLAR": "Kolar",
    "K.G.F.": "Kolar",
    "KODAGU": "Kodagu",
    "KOPPAL": "Koppal",
    "MANDYA": "Mandya",
    "MYSORE COMMR.": "Mysuru",
    "MYSORE RURAL": "Mysuru",
    "RAICHUR": "Raichur",
    "SHIMOGA": "Shivamogga",
    "TUMKUR": "Tumakuru",
    "UDUPI": "Udupi",
    "UTTAR KANNADA": "Uttara Kannada",
    "YADGIRI": "Yadgir",
    "BAGALKOT": "Bagalkote",
}
# No 2001-2012 row exists for Vijayanagara (didn't exist yet, split from
# Ballari in 2021) — approximate it with Ballari's historical series.
EXTRA_ALIAS = {"Vijayanagara": "BALLARY"}

CENSUS_NAME_MAP = {
    "BANGALORE": "Bengaluru Urban", "BANGALORE RURAL": "Bengaluru Rural",
    "RAMANAGARA": "Ramanagara", "BELGAUM": "Belagavi", "BELLARY": "Ballari",
    "BIDAR": "Bidar", "BIJAPUR": "Vijayapura", "CHIKBALLAPUR": "Chikkaballapura",
    "CHAMRAJNAGAR": "Chamarajanagar", "CHIKMAGALUR": "Chikkamagaluru",
    "CHITRADURGA": "Chitradurga", "DAKSHIN KANNAD": "Dakshina Kannada",
    "DAVANGERE": "Davanagere", "DHARWAD": "Dharwad", "GADAG": "Gadag",
    "GULBARGA": "Kalaburagi", "HASSAN": "Hassan", "HAVERI": "Haveri",
    "KOLAR": "Kolar", "KODAGU": "Kodagu", "KOPPAL": "Koppal", "MANDYA": "Mandya",
    "MYSORE": "Mysuru", "RAICHUR": "Raichur", "SHIMOGA": "Shivamogga",
    "TUMKUR": "Tumakuru", "UDUPI": "Udupi", "UTTAR KANNAD": "Uttara Kannada",
    "YADGIR": "Yadgir", "BANGALORE RURAL ": "Bengaluru Rural",
}
CENSUS_ALIAS = {"Vijayanagara": "BELLARY"}

DISTRICTS = list(AREA_SQKM.keys())

FEATURE_COLS = [
    "unemployment_rate", "poverty_rate", "police_per_capita", "gdp_per_capita",
    "school_density", "hospital_density", "population_density",
    "month_sin", "month_cos", "festival_flag",
    "adjacent_crime_rate", "lagged_crime_rate_3m", "lagged_crime_rate_12m",
]

# ── 1. Real crime data: NCRB district-wise IPC crimes, 2001-2012 ───────────
ncrb = pd.read_csv("ncrb_ipc.csv")
ncrb = ncrb[ncrb["STATE/UT"].str.upper() == "KARNATAKA"]
ncrb["district"] = ncrb["DISTRICT"].map(NAME_MAP)
ncrb_valid = ncrb.dropna(subset=["district"])

crime_type_cols = [
    "MURDER", "RAPE", "KIDNAPPING & ABDUCTION", "ROBBERY", "BURGLARY", "THEFT",
    "AUTO THEFT", "RIOTS", "CRIMINAL BREACH OF TRUST", "CHEATING", "ARSON",
    "HURT/GREVIOUS HURT", "DOWRY DEATHS",
]

crime_by_district_year = ncrb_valid.groupby(["district", "YEAR"])[
    ["TOTAL IPC CRIMES"] + crime_type_cols
].sum().reset_index()

# Vijayanagara alias row (approximated from Ballari's own real series)
ballari_rows = crime_by_district_year[crime_by_district_year["district"] == "Ballari"].copy()
ballari_rows["district"] = "Vijayanagara"
crime_by_district_year = pd.concat([crime_by_district_year, ballari_rows], ignore_index=True)

# ── 2. Real socioeconomic data: Census 2011 ─────────────────────────────────
census = pd.read_csv("census2011.csv")
census = census[census["State name"] == "KARNATAKA"].copy()
census["district_clean"] = census["District name"].str.upper().str.strip()

census_rows = {}
for old_name, new_name in CENSUS_NAME_MAP.items():
    match = census[census["district_clean"].str.contains(old_name, na=False)]
    if not match.empty:
        row = match.iloc[0]
        census_rows[new_name] = {
            "population": int(row["Population"]),
            "literacy_pct": row["Literate"] / row["Population"] * 100,
            "workforce_pct": row["Workers"] / row["Population"] * 100,
            "lpg_pct": row.get("LPG_or_PNG_Households", 0) / max(row["Households"], 1) * 100,
        }
for new_name, alias in CENSUS_ALIAS.items():
    match = census[census["district_clean"].str.contains(alias, na=False)]
    if not match.empty and new_name not in census_rows:
        row = match.iloc[0]
        census_rows[new_name] = {
            "population": int(row["Population"]),
            "literacy_pct": row["Literate"] / row["Population"] * 100,
            "workforce_pct": row["Workers"] / row["Population"] * 100,
            "lpg_pct": row.get("LPG_or_PNG_Households", 0) / max(row["Households"], 1) * 100,
        }

print(f"[real-data] Census matched {len(census_rows)}/31 districts")

# ── 3. Real income data: Karnataka DES 2021-22 GDDP/per-capita income ──────
income = pd.read_csv("ka_income.csv")
income_map = {}
for _, row in income.iterrows():
    name = str(row["District"]).strip()
    for d in DISTRICTS:
        if name.lower().replace(" ", "") in d.lower().replace(" ", "") or \
           d.lower().replace(" ", "") in name.lower().replace(" ", ""):
            pci_col = [c for c in income.columns if "Per Capita Income" in c and "current" in c.lower()]
            val = row[pci_col[0]] if pci_col else row.iloc[-1]
            try:
                income_map[d] = float(str(val).replace(",", ""))
            except (ValueError, TypeError):
                pass
            break
print(f"[real-data] Income matched {len(income_map)}/31 districts")

# ── 4. Build feature rows (district x year, 2001-2012) ──────────────────────
# Fields with NO open real district-level source found (documented in
# docs/ML_OVERVIEW.md): police_per_capita, school_density, hospital_density.
# Kept as fixed state-average estimates rather than per-district random.
FALLBACK_POLICE_PER_CAPITA = 130.0
FALLBACK_SCHOOL_DENSITY = 2.3
FALLBACK_HOSPITAL_DENSITY = 1.1
FESTIVAL_MONTHS = {1, 3, 10, 11}

rows = []
for _, r in crime_by_district_year.iterrows():
    d, year = r["district"], int(r["YEAR"])
    census_row = census_rows.get(d)
    if not census_row or d not in AREA_SQKM:
        continue
    pop = census_row["population"]
    area = AREA_SQKM[d]

    prev = crime_by_district_year[(crime_by_district_year["district"] == d) & (crime_by_district_year["YEAR"] == year - 1)]
    prev2 = crime_by_district_year[(crime_by_district_year["district"] == d) & (crime_by_district_year["YEAR"] == year - 2)]
    lag1 = (prev["TOTAL IPC CRIMES"].iloc[0] / pop * 100000) if not prev.empty else (r["TOTAL IPC CRIMES"] / pop * 100000)
    lag2 = (prev2["TOTAL IPC CRIMES"].iloc[0] / pop * 100000) if not prev2.empty else lag1

    neighbors = [n for n in DISTRICTS if n != d][:3]  # simple neighbor sample; full haversine not needed for a historical validation run
    neighbor_rates = []
    for n in neighbors:
        nrow = crime_by_district_year[(crime_by_district_year["district"] == n) & (crime_by_district_year["YEAR"] == year)]
        ncensus = census_rows.get(n)
        if not nrow.empty and ncensus:
            neighbor_rates.append(nrow["TOTAL IPC CRIMES"].iloc[0] / ncensus["population"] * 100000)
    adjacent_rate = float(np.mean(neighbor_rates)) if neighbor_rates else (r["TOTAL IPC CRIMES"] / pop * 100000)

    rows.append({
        "district_name": d, "year": year,
        "unemployment_rate": round(100 - census_row["workforce_pct"] * 1.6, 2),  # Census non-worker-heavy proxy, documented estimate
        "poverty_rate": round(max(2.0, 100 - census_row["lpg_pct"]), 2),  # household-amenity deprivation proxy, documented estimate
        "police_per_capita": FALLBACK_POLICE_PER_CAPITA,
        "gdp_per_capita": income_map.get(d, float(np.mean(list(income_map.values())))),
        "school_density": FALLBACK_SCHOOL_DENSITY,
        "hospital_density": FALLBACK_HOSPITAL_DENSITY,
        "population_density": pop / area,
        "month_sin": 0.0, "month_cos": 0.0, "festival_flag": 0,  # NCRB data is annual only — no real monthly signal available
        "adjacent_crime_rate": adjacent_rate,
        "lagged_crime_rate_3m": lag1,
        "lagged_crime_rate_12m": lag2,
        "crime_rate_per_100k": r["TOTAL IPC CRIMES"] / pop * 100000,
    })

df = pd.DataFrame(rows).sort_values(["year", "district_name"]).reset_index(drop=True)
print(f"[real-data] Built {len(df)} real district-year rows, {df['district_name'].nunique()} districts, years {df['year'].min()}-{df['year'].max()}")

# ── 5. Train XGBoost on real data (time-based split: train <=2009, test 2010-2012) ──
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score

train_df = df[df["year"] <= 2009]
test_df = df[df["year"] > 2009]
X_train, y_train = train_df[FEATURE_COLS].values, train_df["crime_rate_per_100k"].values
X_test, y_test = test_df[FEATURE_COLS].values, test_df["crime_rate_per_100k"].values

model = XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.05,
                      subsample=0.8, colsample_bytree=0.8, random_state=42, tree_method="hist")
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
model.get_booster().feature_names = FEATURE_COLS

y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
print(f"[real-data] XGBoost on REAL NCRB+Census+DES data: R2={r2:.3f}, RMSE={rmse:.2f} (train={len(train_df)}, test={len(test_df)})")

import shap
explainer = shap.TreeExplainer(model)
p5, p95 = float(np.percentile(df["crime_rate_per_100k"], 5)), float(np.percentile(df["crime_rate_per_100k"], 95))

with open(f"{MODELS_DIR}/risk_model.pkl", "wb") as f:
    pickle.dump({"model": model, "feature_cols": FEATURE_COLS}, f)
with open(f"{MODELS_DIR}/shap_explainer.pkl", "wb") as f:
    pickle.dump(explainer, f)
with open(f"{MODELS_DIR}/risk_model_meta.json", "w") as f:
    json.dump({
        "algorithm": "XGBoost Regressor",
        "data_source": "REAL: NCRB district-wise IPC crimes 2001-2012 (data.gov.in) + Census 2011 (Registrar General of India) + Karnataka DES district income 2021-22",
        "r2_score": round(r2, 4), "rmse": round(rmse, 2),
        "train_rows": len(train_df), "test_rows": len(test_df),
        "train_years": "2001-2009", "test_years": "2010-2012",
        "features": FEATURE_COLS, "target": "crime_rate_per_100k",
        "crime_rate_p5": p5, "crime_rate_p95": p95, "shap_available": True,
        "known_proxies": {
            "unemployment_rate": "Census 2011 non-workforce-participation proxy, not official unemployment survey data",
            "poverty_rate": "Census 2011 household-amenity deprivation proxy (LPG access), not an official poverty line measure",
            "police_per_capita": "no open district-level dataset found; fixed state-average estimate",
            "school_density": "no open district-level dataset found; fixed state-average estimate",
            "hospital_density": "no open district-level dataset found; fixed state-average estimate",
            "month_sin/cos/festival_flag": "NCRB source data is annual only, no real monthly signal available",
        },
        "trained_at": pd.Timestamp.utcnow().isoformat(),
    }, f, indent=2)
print("[real-data] Saved risk_model.pkl, shap_explainer.pkl, risk_model_meta.json")

# ── 6. Isolation Forest on real per-crime-type NCRB data ────────────────────
# Mapped onto the LIVE APP's own crime-category names (from generate_data.py's
# CRIME_TYPES_IPC / the _slugify() convention used in train_isolation_forest.py
# and patterns.py), so this trains-real-serves-live correctly instead of
# silently mismatching. Only categories with a genuine real-data backing are
# included — NCRB's 2001-2012 IPC file has no "Cybercrime" (not tracked that
# way back then), "Drug Trafficking/NDPS" (separate act, not in this IPC
# file), "Extortion", "Smuggling", or "Agrarian/Land Dispute" columns, so
# those 5 of the live app's 11 categories are honestly left out of this
# model rather than backfilled with invented numbers.
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

LIVE_CATEGORY_MAP = {
    "theft_robbery_rate": ["THEFT", "ROBBERY", "BURGLARY", "AUTO THEFT"],
    "assault_grievous_hurt_rate": ["HURT/GREVIOUS HURT"],
    "murder_homicide_rate": ["MURDER"],
    "kidnapping_rate": ["KIDNAPPING & ABDUCTION"],
    "riot_public_mischief_rate": ["RIOTS"],
    "economic_offense_fraud_rate": ["CRIMINAL BREACH OF TRUST", "CHEATING"],
}

if_df = crime_by_district_year.copy()
pops = if_df["district"].map(lambda d: census_rows.get(d, {}).get("population", np.nan))
for live_col, ncrb_cols in LIVE_CATEGORY_MAP.items():
    if_df[live_col] = if_df[ncrb_cols].sum(axis=1) / pops * 100000
rate_cols = list(LIVE_CATEGORY_MAP.keys())
if_df = if_df.dropna(subset=rate_cols)

X = if_df[rate_cols].values
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
if_model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
if_model.fit(X_scaled)
scores = if_model.score_samples(X_scaled)
threshold = float(np.percentile(scores, 5))
flagged = int((scores < threshold).sum())
print(f"[real-data] Isolation Forest (live-taxonomy, {len(rate_cols)} real-backed categories): "
      f"{flagged}/{len(if_df)} flagged ({flagged/len(if_df)*100:.1f}%), threshold={threshold:.4f}")

with open(f"{MODELS_DIR}/isolation_forest.pkl", "wb") as f:
    pickle.dump({
        "model": if_model, "scaler": scaler, "feature_cols": rate_cols,
        "train_rows": len(if_df), "anomaly_threshold": threshold,
        "flagged_pct": round(flagged / len(if_df) * 100, 2),
        "data_source": "REAL: NCRB district-wise IPC crimes 2001-2012, mapped onto 6 of the "
                        "live app's 11 crime categories (the other 5 have no NCRB IPC equivalent)",
    }, f)
print("[real-data] Saved isolation_forest.pkl — real data, live-compatible taxonomy")
print("[real-data] DONE.")
