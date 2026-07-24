# Dashboard Integration Notes — ML Results

For whoever's wiring up `police/frontend`. The two analytics endpoints now return real ML output instead of a pure formula. This doc says exactly what changed, what's broken right now because of it, and what's worth adding to show it off.

Full background on the models themselves: `docs/ML_OVERVIEW.md`.

---

## 1. Bug to fix first — `PredictiveView.jsx` currently shows a blank breakdown

**File**: `police/frontend/src/views/PredictiveView.jsx`

This view was written when `/api/analytics/predict` only ever returned the deterministic formula. It reads `d.score_breakdown` (an object of `{unemployment, poverty, police_deficit, recent_crime_volume}` numbers) to draw the little bar chart on expand.

**The problem**: when the ML model is loaded (it is, now — `risk_model.pkl` exists), the endpoint returns a *different* shape that has no `score_breakdown` field at all. Right now, expanding a district in the ML-served state shows an empty breakdown grid instead of erroring — silently wrong, not crashed.

**Also wrong**: the file's own header comment and `kicker`/`lede` copy say *"Deterministic statistical scoring... never trained ML"* — that was accurate when it was written, isn't anymore, and should not go in front of judges as-is.

### Response shape, old vs. new

**Formula fallback** (still returned if `risk_model.pkl` is ever missing):
```json
{
  "district_id": 1, "district_name": "Bengaluru Urban",
  "risk_score": 78.4, "risk_tier": "High",
  "contributing_factors": { "unemployment": "...", "poverty": "...", "police_density": "...", "recent_crime_volume": "..." },
  "score_breakdown": { "unemployment": 23.1, "poverty": 18.4, "police_deficit": 12.0, "recent_crime_volume": 24.9 }
}
```

**ML (current live state)**:
```json
{
  "district_id": 1, "district_name": "Bengaluru Urban",
  "risk_score": 78.4, "risk_tier": "High",
  "predicted_crime_rate_per_100k": 142.3,
  "contributing_factors": { "unemployment": "...", "poverty": "...", "police_density": "...", "recent_crime_volume": "..." },
  "shap_explanation": "Risk primarily driven by: 12-month year-over-year crime level (+38.2 crime/100k); adjacent-district spillover (+21.1 crime/100k); population density (+9.4 crime/100k).",
  "ml_model": "XGBoost Regressor",
  "model_r2": 0.8945,
  "model_rmse": 32.92
}
```

`district_id`, `district_name`, `risk_score`, `risk_tier`, `contributing_factors` are present in **both** shapes — safe to keep using those as-is. `score_breakdown` only exists in the formula fallback; **check for it before rendering, don't assume it's there.** The ML shape gives you `shap_explanation` (a ready-to-display sentence) instead.

### Minimal fix
```jsx
{open === d.district_id && (
  <div className="mt-4 rounded-ledger bg-amber-50 p-4">
    {d.score_breakdown ? (
      // existing per-factor bar chart, unchanged
    ) : (
      <p className="text-xs leading-relaxed text-ink-soft">{d.shap_explanation}</p>
    )}
    {d.ml_model && (
      <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-tag text-ink-faint">
        {d.ml_model} · R² {d.model_r2} · RMSE {d.model_rmse}
      </p>
    )}
    <div className="sm:col-span-2 space-y-0.5 border-t border-amber-200 pt-2">
      {Object.values(d.contributing_factors || {}).map((f, j) => (
        <p key={j} className="text-[0.66rem] text-ink-faint">— {f}</p>
      ))}
    </div>
  </div>
)}
```

And update the copy — suggested replacement for the `kicker`/`lede`:
> kicker: `"XGBoost regressor, trained on real NCRB/Census/Karnataka govt. data — R² 0.89"`
> lede: `"Trained on real historical district crime records (NCRB 2001-2012) joined with real Census and state income data. Every score opens into its top SHAP-attributed factors — not a black box."`

(Falls back automatically to the old formula copy's *spirit* if `d.score_breakdown` shows up instead — worth keeping both phrasings handy, or just branch the copy on whether the first row has `ml_model` set.)

---

## 2. `/api/analytics/patterns` — mostly already works, a few fields are unused

The existing pattern-card rendering (`title`, `category`, `description`, `confidence`, `sample_size`) works unchanged for ML cards — Prophet and Isolation Forest cards use the same shape as the 3 statistical ones. Nothing is broken here. Two ML-only fields exist in the response that the current UI doesn't surface but could:

**Prophet forecast cards** (`category: "Forecast"`) additionally carry:
```json
{ "forecast_30d": 142, "forecast_90d": 391, "confidence_interval": { "lower_90d": 318, "upper_90d": 464 } }
```
Worth adding a small "30d: 142 · 90d: 391 (CI 318–464)" line under the description for these.

**Isolation Forest anomaly cards** (`category: "Anomaly"`) additionally carry:
```json
{ "anomaly_score": -0.42, "district": "Belagavi", "elevated_crime_types": ["Murder Homicide", "Theft Robbery"] }
```
Worth rendering `elevated_crime_types` as small chips — that's the "why this district got flagged" detail.

Neither is required — cards read fine without them — just extra detail worth surfacing if there's UI budget.

---

## 3. Model provenance, if you want a "trained on real data" badge anywhere

`police/backend/app/ml/models/risk_model_meta.json` (already deployed) has everything needed for a footer/tooltip:
```json
{
  "algorithm": "XGBoost Regressor",
  "data_source": "REAL: NCRB district-wise IPC crimes 2001-2012 (data.gov.in) + Census 2011 (Registrar General of India) + Karnataka DES district income 2021-22",
  "r2_score": 0.8945, "rmse": 32.92,
  "train_rows": 209, "test_rows": 75,
  "train_years": "2001-2009", "test_years": "2010-2012"
}
```
Not currently exposed via any API endpoint — if a "model card" UI element is wanted (e.g. an info icon on the risk board that pops this up), it'd need a tiny new backend route to read and return this JSON file. Ping me if you want that added; it's a 10-line endpoint.

---

## 4. Not wired to any UI yet at all

- **Counterfeit seizure points** on the hotspot map (`is_seizure`/`seizure_count` fields from `/geo/hotspots`) — per `CLAUDE.md`, `HotspotsView.jsx` already renders these as blue markers, so likely already fine; flagging in case that view hasn't been touched recently.
- Nothing ML-specific is missing elsewhere — `/predict` and `/patterns` are the only two endpoints this session's work touched.
