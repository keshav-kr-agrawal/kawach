import os
import json
import uuid
import time
from contextlib import asynccontextmanager
from typing import Optional

try:  # local dev convenience: Classifier/.env; on HF Spaces, Space secrets win
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .video_reader import VideoReader
from .face_extractor import FaceExtractor
from .model_loader import load_models
from .classifier import predict_on_video
from .scene_analyzer import SceneAnalyzer
from .priority_validator import PriorityValidator
from .currency_detector import CurrencyDetector
from .trust_scorer import compute_trust_score, compute_civic_urgency_score
from .schemas import (
    ClassifyResponse, HealthResponse,
    RouteRequest, DeptRoutingResponse,
    SceneAnalysisResponse,
    FullAnalysisRequest, FullAnalysisResponse,
    HotspotRequest, HotspotResponse,
    QuickValidateResponse,
)
from .router import route_report_text


# ─── Global state ─────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
models = []
face_extractor = None
scene_analyzer: Optional[SceneAnalyzer] = None
priority_validator = None
currency_detector: Optional[CurrencyDetector] = None
input_size = 380
# 32 frames is the DFDC-winning default (use on HF Spaces 16GB); drop to 16
# via env on low-RAM dev machines — MTCNN + dual-B7 on 32 frames can exhaust
# 8GB. Chunked inference (INFER_BATCH_SIZE, classifier.py) bounds model memory
# either way.
frames_per_video = int(os.environ.get("FRAMES_PER_VIDEO", "32"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global models, face_extractor, scene_analyzer, priority_validator, currency_detector

    print(f"\n{'='*60}")
    print(f"  KAWACH AI Classifier v2.1 — Startup (device: {device})")
    print(f"{'='*60}")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    weights_dir = os.path.join(base_dir, "weights")

    # Pipeline 1 — Deepfake detection
    print("\n[P1] Loading deepfake detection models...")
    video_reader = VideoReader()
    video_read_fn = lambda path: video_reader.read_frames(path, num_frames=frames_per_video)
    face_extractor = FaceExtractor(video_read_fn, device=device)
    models.extend(load_models(weights_dir, device))
    print(f"  [OK] {len(models)} deepfake model(s) loaded")

    # Pipeline 3 — Scene detection
    print("\n[P3] Loading scene detection models...")
    scene_analyzer = SceneAnalyzer(weights_dir=weights_dir, device=device)
    scene_count = (1 if scene_analyzer.yolo_model else 0) + (1 if scene_analyzer.trash_model else 0)
    print(f"  [OK] {scene_count} scene model(s) ready")

    # Priority validator (DistilBERT)
    print("\n[P2] Loading DistilBERT priority validator...")
    priority_validator = PriorityValidator(model_dir=weights_dir)
    pv_ready = priority_validator.model is not None
    print(f"  {'[OK]' if pv_ready else '[WARN]'} DistilBERT {'ready' if pv_ready else 'unavailable (degraded)'}")

    # Pipeline 7 — Counterfeit currency detection
    print("\n[P7] Loading counterfeit currency detector...")
    currency_detector = CurrencyDetector(weights_dir=weights_dir, device=device)
    print(f"  [OK] Currency detector ready (mode: {currency_detector.mode})")

    # Warm EasyOCR in the background: its lazy first-call init takes long
    # enough on the free-tier 2vCPU host that the first currency request
    # after every container (re)start blew past the HF proxy timeout and
    # 500'd (observed 2026-07-19 — failures rotated across images, warm
    # container always fine). Boot stays fast; only OCR-dependent checks
    # degrade gracefully until the thread finishes.
    import threading
    from app.currency_detector import _get_ocr_reader

    def _warm_ocr():
        print("  [P7] Warming EasyOCR reader (background)...")
        _get_ocr_reader()
        print("  [P7] EasyOCR reader warm")

    threading.Thread(target=_warm_ocr, daemon=True).start()

    print(f"\n{'='*60}")
    print("  KAWACH startup complete — 6 endpoints live")
    print(f"{'='*60}\n")

    yield
    models.clear()


app = FastAPI(
    title="KAWACH AI Classifier",
    description=(
        "Community Hero — Hyperlocal Problem Solver\n\n"
        "AI microservice powering KAWACH with 6 endpoints across 5 pipelines:\n"
        "• Pipeline 1: Deepfake / AI-video forensics (EfficientNet-B7 ensemble)\n"
        "• Pipeline 2: Civic department routing (Gemini LLM + DistilBERT dual-model consensus)\n"
        "• Pipeline 3: Scene issue detection (YOLO12s road damage + TrashNet waste)\n"
        "• Pipeline 4: Unified full analysis (all 3 pipelines in one call)\n"
        "• Pipeline 5: Predictive hotspot analysis (Gemini + statistical fusion)\n"
        "• Pipeline 6: Quick image validate (single frame, lightweight)\n\n"
        "Every response includes trust_score (0-100) and civic_urgency_score (0-100)."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ACTIVE_PIPELINES = 6


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    scene_count = 0
    if scene_analyzer:
        scene_count = (1 if scene_analyzer.yolo_model else 0) + (1 if scene_analyzer.trash_model else 0)
    pv_loaded = priority_validator is not None and priority_validator.model is not None
    from .router import GEMINI_MODEL
    return HealthResponse(
        status="ok" if len(models) > 0 else "degraded",
        models_loaded=len(models),
        scene_models_loaded=scene_count,
        priority_validator_loaded=pv_loaded,
        device=device,
        pipelines_active=_ACTIVE_PIPELINES,
        version="2.1.0",
        deepfake_mode="real" if len(models) > 0 else "mock_fallback",
        routing_mode="gemini" if os.environ.get("GEMINI_API_KEY") else "keyword_fallback",
        gemini_model=GEMINI_MODEL,
        currency_mode=currency_detector.mode if currency_detector else "unavailable",
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _deepfake_verdict(fake_prob: float, faces_detected: int):
    if fake_prob > 0.65:
        verdict = "AI_GENERATED"
    elif fake_prob < 0.35:
        verdict = "AUTHENTIC"
    else:
        verdict = "INCONCLUSIVE"
    if faces_detected == 0:
        verdict = "INCONCLUSIVE"
    if fake_prob > 0.85 or fake_prob < 0.15:
        confidence = "HIGH"
    elif fake_prob > 0.65 or fake_prob < 0.35:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"
    return verdict, confidence


def _mock_deepfake():
    import random
    fp = random.uniform(0.05, 0.25)
    return fp, 1, 32


# ─── Pipeline 1: Deepfake Detection ──────────────────────────────────────────

@app.post("/classify", response_model=ClassifyResponse, tags=["Pipeline 1 — Deepfake"])
async def classify(file: UploadFile = File(...)):
    """
    Detects AI-generated or deepfake video content.
    Uses MTCNN face detection + EfficientNet-B7 ensemble.
    Returns trust_score and civic_urgency_score alongside forensic data.
    """
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only video files allowed.")

    temp_dir = "/tmp/kawach_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_filepath = os.path.join(temp_dir, f"cls_{uuid.uuid4().hex}_{file.filename}")
    start_time = time.time()

    try:
        with open(temp_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)

        if not models:
            print("[CLASSIFY] Weights not loaded — using mock values.")
            fake_prob, faces_detected, frames_analyzed = _mock_deepfake()
        else:
            fake_prob, faces_detected, frames_analyzed = predict_on_video(
                face_extractor=face_extractor,
                video_path=temp_filepath,
                batch_size=frames_per_video,
                input_size=input_size,
                models=models,
                device=device,
            )

        verdict, confidence = _deepfake_verdict(fake_prob, faces_detected)

        ts = compute_trust_score(
            verdict=verdict, fake_probability=fake_prob, confidence_level=confidence,
            routing_confidence="FALLBACK",  # no routing data in this endpoint
            scene_detected=False,
        )
        urgency = compute_civic_urgency_score(
            priority="NORMAL", escalation_required=False, visual_severity="LOW",
            priority_upgraded=False, verdict=verdict,
            faces_detected=faces_detected, scene_detected=False,
        )

        return ClassifyResponse(
            verdict=verdict,
            fake_probability=fake_prob,
            confidence_level=confidence,
            faces_detected=faces_detected,
            frames_analyzed=frames_analyzed,
            processing_time_ms=(time.time() - start_time) * 1000,
            model_count=len(models),
            trust_score=ts,
            civic_urgency_score=urgency,
        )

    except Exception as e:
        print(f"[CLASSIFY] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass


# ─── Pipeline 2: Civic Department Routing ────────────────────────────────────

@app.post("/route", response_model=DeptRoutingResponse, tags=["Pipeline 2 — Routing"])
async def route(request: RouteRequest):
    """
    Routes a civic report to the correct government department.
    Uses Gemini 1.5-flash (zero-shot) + DistilBERT dual-model priority consensus.
    Falls back to multi-keyword scored matching if Gemini API key is unavailable.
    Returns sub_category, estimated_resolution_days, trust_score, and civic_urgency_score.
    """
    try:
        result = route_report_text(
            title=request.title,
            description=request.description,
            category=request.category,
            priority_validator=priority_validator,
        )

        ts = compute_trust_score(
            verdict="AUTHENTIC", fake_probability=0.1,
            confidence_level="MEDIUM",
            routing_confidence=result["confidence"],
            scene_detected=False,
        )
        urgency = compute_civic_urgency_score(
            priority=result["priority"],
            escalation_required=result["escalation_required"],
            visual_severity="LOW",
            priority_upgraded=result.get("priority_upgraded", False),
            verdict="AUTHENTIC",
            faces_detected=0,
            scene_detected=False,
        )
        result["trust_score"] = ts
        result["civic_urgency_score"] = urgency

        return DeptRoutingResponse(**result)
    except Exception as e:
        print(f"[ROUTE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


# ─── Pipeline 3: Scene / Visual Issue Detection ───────────────────────────────

@app.post("/analyze-scene", response_model=SceneAnalysisResponse, tags=["Pipeline 3 — Scene"])
async def analyze_scene(file: UploadFile = File(...)):
    """
    Detects civic issues directly in video frames using computer vision.
    • YOLO12s (RDD2022): Pothole, road cracks, alligator cracks — with bbox coverage %
    • TrashNet (SigLIP): Garbage, plastic waste, litter detection
    • Temporal consistency: fraction of frames with detections (persistent vs. isolated)
    Returns visual evidence, dominant issue class, and suggested department.
    """
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm', '.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    temp_dir = "/tmp/kawach_scene"
    os.makedirs(temp_dir, exist_ok=True)
    temp_filepath = os.path.join(temp_dir, f"scene_{uuid.uuid4().hex}_{file.filename}")

    try:
        with open(temp_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)

        if scene_analyzer is None:
            return SceneAnalysisResponse(
                scene_detected=False,
                scene_summary="Scene analyzer not initialized.",
                detected_issues=[], frames_sampled=0,
                road_detections=0, waste_detections=0,
            )

        result = scene_analyzer.analyze_video(temp_filepath)

        top_conf = result.get("top_detection_confidence", 0.0)
        temporal = result.get("temporal_consistency", 0.0)

        ts = compute_trust_score(
            verdict="AUTHENTIC", fake_probability=0.1,
            confidence_level="MEDIUM",
            routing_confidence="FALLBACK",
            scene_detected=result["scene_detected"],
            top_scene_confidence=top_conf,
            temporal_consistency=temporal,
        )
        urgency = compute_civic_urgency_score(
            priority=result.get("visual_priority") or "NORMAL",
            escalation_required=False,
            visual_severity=result.get("visual_severity") or "LOW",
            priority_upgraded=False,
            verdict="AUTHENTIC",
            faces_detected=0,
            scene_detected=result["scene_detected"],
            temporal_consistency=temporal,
        )
        result["trust_score"] = ts
        result["civic_urgency_score"] = urgency

        return SceneAnalysisResponse(**result)

    except Exception as e:
        print(f"[SCENE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Scene analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass


# ─── Pipeline 4: Full Unified Analysis ───────────────────────────────────────

@app.post("/full-analysis", response_model=FullAnalysisResponse, tags=["Pipeline 4 — Unified"])
async def full_analysis(
    file: UploadFile = File(...),
    title: str = "Civic Incident",
    description: str = "No description provided.",
    category: str = "General",
):
    """
    ONE CALL — runs all three AI pipelines on a single video:
    1. Deepfake forensic verification (EfficientNet-B7 ensemble)
    2. Civic department routing (Gemini + DistilBERT dual-model consensus)
    3. Scene-level visual issue detection with temporal consistency (YOLO + TrashNet)

    Fuses all signals into trust_score and civic_urgency_score.
    Upgrades final priority if visual severity exceeds text-based priority.
    """
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only video files allowed.")

    temp_dir = "/tmp/kawach_full"
    os.makedirs(temp_dir, exist_ok=True)
    temp_filepath = os.path.join(temp_dir, f"full_{uuid.uuid4().hex}_{file.filename}")
    start_time = time.time()

    try:
        with open(temp_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)

        # Pipeline 1: Deepfake
        if models:
            fake_prob, faces_detected, frames_analyzed = predict_on_video(
                face_extractor=face_extractor,
                video_path=temp_filepath,
                batch_size=frames_per_video,
                input_size=input_size,
                models=models,
                device=device,
            )
        else:
            fake_prob, faces_detected, frames_analyzed = _mock_deepfake()

        verdict, confidence = _deepfake_verdict(fake_prob, faces_detected)

        # Pipeline 2: Routing
        routing = route_report_text(title, description, category, priority_validator)

        # Pipeline 3: Scene
        if scene_analyzer:
            scene = scene_analyzer.analyze_video(temp_filepath)
        else:
            scene = {
                "scene_detected": False,
                "scene_summary": "Scene analyzer not available.",
                "detected_issues": [], "frames_sampled": 0,
                "road_detections": 0, "waste_detections": 0,
                "suggested_dept": None, "visual_priority": None,
                "visual_severity": None, "temporal_consistency": 0.0,
                "dominant_class": None, "top_detection_confidence": 0.0,
            }

        # Resolve final priority — take max(routing, visual)
        rank = {"LOW": 1, "NORMAL": 2, "HIGH": 3, "CRITICAL": 4}
        visual_priority = scene.get("visual_priority") or "LOW"
        if rank.get(visual_priority, 0) > rank.get(routing["priority"], 0):
            routing["priority"] = visual_priority

        # Composite scores — full signal fusion
        temporal = scene.get("temporal_consistency", 0.0)
        top_conf = scene.get("top_detection_confidence", 0.0)

        ts = compute_trust_score(
            verdict=verdict,
            fake_probability=fake_prob,
            confidence_level=confidence,
            routing_confidence=routing["confidence"],
            scene_detected=scene["scene_detected"],
            top_scene_confidence=top_conf,
            temporal_consistency=temporal,
        )
        urgency = compute_civic_urgency_score(
            priority=routing["priority"],
            escalation_required=routing["escalation_required"],
            visual_severity=scene.get("visual_severity") or "LOW",
            priority_upgraded=routing.get("priority_upgraded", False),
            verdict=verdict,
            faces_detected=faces_detected,
            scene_detected=scene["scene_detected"],
            temporal_consistency=temporal,
        )

        return FullAnalysisResponse(
            # Deepfake
            verdict=verdict,
            fake_probability=fake_prob,
            confidence_level=confidence,
            faces_detected=faces_detected,
            frames_analyzed=frames_analyzed,
            # Routing
            department=routing["department"],
            department_name=routing["department_name"],
            routing_reason=routing["routing_reason"],
            priority=routing["priority"],
            escalation_required=routing["escalation_required"],
            routing_confidence=routing["confidence"],
            priority_upgraded=routing.get("priority_upgraded", False),
            distilbert_confidence=routing.get("distilbert_confidence", 0.0),
            sub_category=routing.get("sub_category"),
            estimated_resolution_days=routing.get("estimated_resolution_days"),
            # Scene
            scene_detected=scene["scene_detected"],
            scene_summary=scene["scene_summary"],
            detected_issues=scene["detected_issues"],
            road_detections=scene["road_detections"],
            waste_detections=scene["waste_detections"],
            visual_priority=scene.get("visual_priority"),
            visual_severity=scene.get("visual_severity"),
            temporal_consistency=temporal,
            dominant_class=scene.get("dominant_class"),
            top_detection_confidence=top_conf,
            # Composite
            trust_score=ts,
            civic_urgency_score=urgency,
            # Meta
            processing_time_ms=(time.time() - start_time) * 1000,
            model_count=len(models),
        )

    except Exception as e:
        print(f"[FULL-ANALYSIS] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass


# ─── Pipeline 5: Predictive Hotspot Analysis ─────────────────────────────────

@app.post("/predict-hotspot", response_model=HotspotResponse, tags=["Pipeline 5 — Predictive"])
async def predict_hotspot(request: HotspotRequest):
    """
    Analyzes patterns from recent civic reports in a geographic area
    to predict hotspot likelihood and emerging issues.

    Uses Gemini AI for deep trend analysis when available;
    falls back to weighted statistical scoring otherwise.

    Addresses the 'Predictive Insights' requirement of the problem statement.
    """
    reports = request.recent_reports
    n = len(reports)

    # ── Statistical baseline (always runs) ──────────────────────────────────
    priority_weights = {"CRITICAL": 4, "HIGH": 3, "NORMAL": 2, "LOW": 1}
    dept_counts: dict = {}
    weighted_score = 0.0

    for r in reports:
        dept_counts[r.department] = dept_counts.get(r.department, 0) + 1
        weighted_score += priority_weights.get(r.priority, 2)

    if n == 0:
        return HotspotResponse(
            hotspot_likelihood="LOW",
            risk_score=5.0,
            dominant_category="GENERAL",
            predicted_next_issue="Insufficient report data for trend analysis.",
            analysis="No reports provided. Submit reports from the area to enable hotspot prediction.",
            recommended_action="Encourage citizens in this locality to submit reports via KAWACH.",
            report_count=0,
            confidence="STATISTICAL",
        )

    dominant_category = max(dept_counts, key=dept_counts.get)
    avg_weight = weighted_score / n
    # risk_score: average weight scaled 0-40 + volume contribution 0-60
    risk_score = round(min(100.0, avg_weight * 10 + min(n * 3, 60)), 1)

    if risk_score >= 60:
        hotspot_likelihood = "HIGH"
    elif risk_score >= 35:
        hotspot_likelihood = "MEDIUM"
    else:
        hotspot_likelihood = "LOW"

    # Department-specific prediction heuristics
    next_issue_map = {
        "CONSTRUCTION": "Further road deterioration or structural damage as monsoon season approaches.",
        "SANITATION": "Secondary vector-borne disease risk from accumulated waste and stagnant water.",
        "WATER": "Waterlogging or contamination risk from repeated pipeline stress.",
        "ELECTRICITY": "Cascading power outages from transformer overload during peak hours.",
        "POLICE": "Potential escalation of criminal activity if unaddressed public safety gaps persist.",
        "TRAFFIC": "Increased accident frequency during peak hours due to unresolved signal/road issues.",
        "FIRE": "Elevated fire risk from unresolved gas/electrical hazards in the area.",
        "HEALTH": "Community health outbreak if source of contamination is not addressed.",
        "ENVIRONMENT": "Long-term ecosystem damage from chronic pollution in this zone.",
        "REVENUE": "Escalating land boundary disputes if administrative oversight is not increased.",
    }
    predicted_next_issue = next_issue_map.get(
        dominant_category,
        "Ongoing civic infrastructure stress — monitor for further deterioration."
    )

    stat_analysis = (
        f"Statistical analysis of {n} report(s) in a {request.radius_km}km radius "
        f"around ({request.lat:.4f}, {request.lng:.4f}) identifies {dominant_category} "
        f"as the dominant issue category. Risk score: {risk_score}/100."
    )
    stat_action = (
        f"Dispatch {dominant_category} department field team for area inspection. "
        f"Priority: {hotspot_likelihood}."
    )

    # ── Gemini deep analysis (if API key available and >1 report) ────────────
    api_key = os.environ.get("GEMINI_API_KEY")
    confidence_tag = "STATISTICAL"

    if api_key and n >= 2:
        try:
            import google.generativeai as genai
            from .router import GEMINI_MODEL
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(GEMINI_MODEL)

            report_lines = "\n".join(
                f"- Dept: {r.department}, Priority: {r.priority}, "
                f"Reason: {r.routing_reason[:80]}"
                for r in reports[:15]  # cap to 15 to stay within token budget
            )

            prompt = f"""You are an urban analytics AI for KAWACH, India's civic incident platform.
Analyze civic incident patterns in a {request.radius_km}km radius near lat={request.lat:.4f}, lng={request.lng:.4f}.

Recent reports ({n} total):
{report_lines}

Provide a concise JSON response:
{{
  "hotspot_likelihood": "HIGH | MEDIUM | LOW",
  "risk_score": <float 0-100>,
  "dominant_category": "<dept code>",
  "predicted_next_issue": "<one sentence prediction of the next likely civic issue>",
  "analysis": "<2 sentences: urban infrastructure pattern analysis>",
  "recommended_action": "<specific department action recommendation>"
}}"""

            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            data = json.loads(response.text.strip())

            g_likelihood = data.get("hotspot_likelihood", hotspot_likelihood).upper()
            if g_likelihood not in ("HIGH", "MEDIUM", "LOW"):
                g_likelihood = hotspot_likelihood

            g_risk = float(data.get("risk_score", risk_score))
            if not (0 <= g_risk <= 100):
                g_risk = risk_score

            return HotspotResponse(
                hotspot_likelihood=g_likelihood,
                risk_score=round(g_risk, 1),
                dominant_category=data.get("dominant_category", dominant_category),
                predicted_next_issue=data.get("predicted_next_issue", predicted_next_issue),
                analysis=data.get("analysis", stat_analysis),
                recommended_action=data.get("recommended_action", stat_action),
                report_count=n,
                confidence="AI",
            )
        except Exception as e:
            print(f"[HOTSPOT] Gemini analysis failed: {e} — using statistical result.")

    return HotspotResponse(
        hotspot_likelihood=hotspot_likelihood,
        risk_score=risk_score,
        dominant_category=dominant_category,
        predicted_next_issue=predicted_next_issue,
        analysis=stat_analysis,
        recommended_action=stat_action,
        report_count=n,
        confidence=confidence_tag,
    )


# ─── Pipeline 6: Quick Image Validate ────────────────────────────────────────

@app.post("/validate-report", response_model=QuickValidateResponse, tags=["Pipeline 6 — Quick Validate"])
async def validate_report(file: UploadFile = File(...)):
    """
    Lightweight single-frame civic issue validator.
    Accepts image (jpg/png/webp) or video (extracts 1 representative frame).
    Much faster than /analyze-scene — ideal for rapid mobile pre-submission checks.

    Returns detected issues, suggested department, and trust_score.
    """
    ext = file.filename.lower().rsplit(".", 1)[-1]
    image_exts = {"jpg", "jpeg", "png", "webp"}
    video_exts = {"mp4", "mov", "mkv", "webm", "avi"}

    if ext not in image_exts | video_exts:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    temp_dir = "/tmp/kawach_validate"
    os.makedirs(temp_dir, exist_ok=True)
    temp_filepath = os.path.join(temp_dir, f"val_{uuid.uuid4().hex}_{file.filename}")
    start_time = time.time()

    try:
        with open(temp_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)

        if scene_analyzer is None:
            return QuickValidateResponse(
                scene_detected=False, detected_issues=[], road_detections=0,
                waste_detections=0, processing_time_ms=(time.time() - start_time) * 1000,
            )

        if ext in image_exts:
            with open(temp_filepath, "rb") as f:
                frame_bytes = f.read()
            result = scene_analyzer.analyze_frame_bytes(frame_bytes)
        else:
            frames = scene_analyzer._extract_sample_frames(temp_filepath, n_frames=1)
            if frames:
                road = scene_analyzer._run_yolo_on_frames(frames)
                waste = scene_analyzer._run_trash_on_frames(frames)
                all_det = road + waste
                result = {
                    "scene_detected": len(all_det) > 0,
                    "road_detections": len(road),
                    "waste_detections": len(waste),
                    "top_detection_confidence": max((d["confidence"] for d in all_det), default=0.0),
                    "visual_priority": None,
                    "suggested_dept": None,
                    "raw_detections": all_det,
                }
            else:
                result = {
                    "scene_detected": False, "road_detections": 0,
                    "waste_detections": 0, "top_detection_confidence": 0.0,
                    "visual_priority": None, "suggested_dept": None, "raw_detections": [],
                }

        all_det = result.get("raw_detections", [])
        detected_issues = [f"{d['label']} ({d['confidence']*100:.0f}%)" for d in all_det]

        top_conf = result.get("top_detection_confidence", 0.0)
        ts = compute_trust_score(
            verdict="INCONCLUSIVE", fake_probability=0.5, confidence_level="LOW",
            routing_confidence="FALLBACK",
            scene_detected=result["scene_detected"],
            top_scene_confidence=top_conf,
        )

        return QuickValidateResponse(
            scene_detected=result["scene_detected"],
            detected_issues=detected_issues,
            road_detections=result["road_detections"],
            waste_detections=result["waste_detections"],
            suggested_dept=result.get("suggested_dept"),
            visual_priority=result.get("visual_priority"),
            processing_time_ms=(time.time() - start_time) * 1000,
            trust_score=ts,
        )

    except Exception as e:
        print(f"[VALIDATE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Quick validation failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass


# ─── Pipeline 7: Counterfeit Currency Detection ──────────────────────────────

@app.post("/classify-currency", tags=["Pipeline 7 — Counterfeit Currency"])
async def classify_currency(
    file: UploadFile = File(...),
    capture_mode: str = "visible",  # "visible" | "uv" — see currency_detector.py docstring
):
    """
    Real/fake screening verdict on a photographed Indian banknote. Directly
    implements the ET PS's "Counterfeit Currency Identification Agent" bullet:
    microprint analysis, security-thread verification, serial-number pattern
    validation (RBI's documented ascending-numeral feature), and UV feature
    checking — the last one honestly gated behind `capture_mode="uv"` since a
    normal-light photo cannot simulate a UV response.

    v2 pipeline (plan/currency_pipeline_v2_plan.md): image-quality gate
    (INSUFFICIENT_QUALITY + retake tip — bad lighting never reads as fake),
    note-presence gate (NOT_A_CURRENCY_NOTE — a white sheet/random object is
    never forced into a real-vs-fake score), one shared OCR pass feeding a
    text-integrity check (catches substituted wording like 'CHILDREN BANK'),
    then tiered fusion: structural checks (serial, text) can veto, weak
    proxies (thread band, sharpness, noise) only corroborate, and the CNN is
    advisory (its 0.30-0.70 range is treated as no-read). A single visible-
    light photo never yields HIGH-confidence GENUINE — that requires a
    passing UV capture. `model_mode` states exactly which sources ran.
    """
    ext = file.filename.lower().rsplit(".", 1)[-1]
    if ext not in {"jpg", "jpeg", "png", "webp", "bmp"}:
        raise HTTPException(status_code=400, detail="Invalid file type. Upload a note photo (jpg/png/webp).")
    if currency_detector is None:
        raise HTTPException(status_code=503, detail="Currency detector not initialized.")
    if capture_mode not in ("visible", "uv"):
        raise HTTPException(status_code=400, detail="capture_mode must be 'visible' or 'uv'.")

    import numpy as np
    import cv2

    start_time = time.time()
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    try:
        result = currency_detector.analyze(img, capture_mode=capture_mode)
    except Exception as e:
        print(f"[CURRENCY] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Currency analysis failed: {str(e)}")

    result["processing_time_ms"] = round((time.time() - start_time) * 1000, 1)
    return result
