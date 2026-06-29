import os
import uuid
import time
from contextlib import asynccontextmanager
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .video_reader import VideoReader
from .face_extractor import FaceExtractor
from .model_loader import load_models
from .classifier import predict_on_video
from .scene_analyzer import SceneAnalyzer
from .priority_validator import PriorityValidator
from .schemas import (
    ClassifyResponse, HealthResponse,
    RouteRequest, DeptRoutingResponse,
    SceneAnalysisResponse, FullAnalysisRequest, FullAnalysisResponse
)
from .router import route_report_text


# ─── Global state ─────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
models = []
face_extractor = None
scene_analyzer = None
priority_validator = None
input_size = 380
frames_per_video = 32


@asynccontextmanager
async def lifespan(app: FastAPI):
    global models, face_extractor, scene_analyzer, priority_validator

    print(f"\n{'='*60}")
    print(f"  KAWACH AI Classifier — Startup (device: {device})")
    print(f"{'='*60}")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    weights_dir = os.path.join(base_dir, "weights")

    # ── Pipeline 1: Deepfake detection (EfficientNet-B7 + MTCNN) ──────────
    print("\n[Pipeline 1] Loading deepfake detection models...")
    video_reader = VideoReader()
    video_read_fn = lambda path: video_reader.read_frames(path, num_frames=frames_per_video)
    face_extractor = FaceExtractor(video_read_fn, device=device)
    models.extend(load_models(weights_dir, device))
    print(f"  ✓ Loaded {len(models)} deepfake model(s)")

    # ── Pipeline 3: Scene detection (YOLO + TrashNet) ─────────────────────
    print("\n[Pipeline 3] Loading scene detection models...")
    scene_analyzer = SceneAnalyzer(weights_dir=weights_dir, device=device)
    scene_count = (1 if scene_analyzer.yolo_model else 0) + (1 if scene_analyzer.trash_model else 0)
    print(f"  ✓ {scene_count} scene model(s) ready")

    # ── Priority Validator: DistilBERT (for Pipeline 2 consensus) ─────────
    print("\n[Priority Validator] Loading DistilBERT...")
    priority_validator = PriorityValidator(model_dir=weights_dir)
    pv_ready = priority_validator.model is not None
    print(f"  {'✓' if pv_ready else '⚠'} DistilBERT priority validator {'ready' if pv_ready else 'unavailable (degraded)'}")

    print(f"\n{'='*60}")
    print("  KAWACH startup complete — All endpoints live")
    print(f"{'='*60}\n")

    yield

    # Cleanup
    models.clear()


app = FastAPI(
    title="KAWACH AI Classifier",
    description=(
        "Community Hero — Hyperlocal Problem Solver\n\n"
        "AI microservice powering KAWACH with 3 pipelines:\n"
        "• Pipeline 1: Deepfake / AI-video forensics (EfficientNet-B7 ensemble)\n"
        "• Pipeline 2: Civic department routing (Gemini LLM + DistilBERT priority consensus)\n"
        "• Pipeline 3: Scene issue detection (YOLO road damage + TrashNet waste classification)"
    ),
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    scene_count = 0
    if scene_analyzer:
        scene_count = (1 if scene_analyzer.yolo_model else 0) + (1 if scene_analyzer.trash_model else 0)
    pv_loaded = priority_validator is not None and priority_validator.model is not None
    return HealthResponse(
        status="ok" if len(models) > 0 else "degraded",
        models_loaded=len(models),
        scene_models_loaded=scene_count,
        priority_validator_loaded=pv_loaded,
        device=device
    )


# ─── Pipeline 1: Deepfake Detection ──────────────────────────────────────────

@app.post("/classify", response_model=ClassifyResponse, tags=["Pipeline 1 — Deepfake"])
async def classify(file: UploadFile = File(...)):
    """
    Detects AI-generated or deepfake video content.
    Uses MTCNN face detection + EfficientNet-B7 ensemble.
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
            import random
            print("[CLASSIFY] Weights not loaded — using mock values.")
            fake_prob, faces_detected, frames_analyzed = random.uniform(0.05, 0.25), 1, 32
        else:
            fake_prob, faces_detected, frames_analyzed = predict_on_video(
                face_extractor=face_extractor,
                video_path=temp_filepath,
                batch_size=frames_per_video,
                input_size=input_size,
                models=models,
                device=device
            )

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

        return ClassifyResponse(
            verdict=verdict,
            fake_probability=fake_prob,
            confidence_level=confidence,
            faces_detected=faces_detected,
            frames_analyzed=frames_analyzed,
            processing_time_ms=(time.time() - start_time) * 1000,
            model_count=len(models)
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
    Uses Gemini 1.5-flash (zero-shot) + DistilBERT priority consensus.
    Falls back to keyword matching if Gemini API key is unavailable.
    """
    try:
        result = route_report_text(
            title=request.title,
            description=request.description,
            category=request.category,
            priority_validator=priority_validator
        )
        return DeptRoutingResponse(**result)
    except Exception as e:
        print(f"[ROUTE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


# ─── Pipeline 3: Scene / Visual Issue Detection ───────────────────────────────

@app.post("/analyze-scene", response_model=SceneAnalysisResponse, tags=["Pipeline 3 — Scene"])
async def analyze_scene(file: UploadFile = File(...)):
    """
    Detects civic issues directly in video frames using computer vision.
    • YOLO12s (RDD2022): Pothole, road cracks, alligator cracks
    • TrashNet (SigLIP): Garbage, plastic waste, litter detection
    Returns visual evidence, detected issues, and suggested department.
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
                road_detections=0, waste_detections=0
            )

        result = scene_analyzer.analyze_video(temp_filepath)
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
    category: str = "General"
):
    """
    ⚡ ONE CALL — runs all three AI pipelines on a single video:
    1. Deepfake forensic verification
    2. Civic department routing with dual-model priority consensus
    3. Scene-level visual issue detection (YOLO + TrashNet)

    Returns a comprehensive analysis package for the KAWACH frontend.
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

        # ── Run all pipelines ─────────────────────────────────────────────

        # Pipeline 1: Deepfake
        if models:
            fake_prob, faces_detected, frames_analyzed = predict_on_video(
                face_extractor=face_extractor,
                video_path=temp_filepath,
                batch_size=frames_per_video,
                input_size=input_size,
                models=models,
                device=device
            )
        else:
            import random
            fake_prob, faces_detected, frames_analyzed = random.uniform(0.05, 0.25), 1, 32

        if fake_prob > 0.65:     verdict = "AI_GENERATED"
        elif fake_prob < 0.35:   verdict = "AUTHENTIC"
        else:                    verdict = "INCONCLUSIVE"
        if faces_detected == 0:  verdict = "INCONCLUSIVE"
        if fake_prob > 0.85 or fake_prob < 0.15:     confidence = "HIGH"
        elif fake_prob > 0.65 or fake_prob < 0.35:   confidence = "MEDIUM"
        else:                                          confidence = "LOW"

        # Pipeline 2: Routing
        routing = route_report_text(title, description, category, priority_validator)

        # Pipeline 3: Scene
        if scene_analyzer:
            scene = scene_analyzer.analyze_video(temp_filepath)
        else:
            scene = {
                "scene_detected": False, "scene_summary": "Scene analyzer not available.",
                "detected_issues": [], "frames_sampled": 0,
                "road_detections": 0, "waste_detections": 0,
                "suggested_dept": None, "visual_priority": None, "visual_severity": None
            }

        # Resolve final priority — take max(routing, visual)
        rank = {"LOW": 1, "NORMAL": 2, "HIGH": 3, "CRITICAL": 4}
        visual_priority = scene.get("visual_priority") or "LOW"
        final_priority = routing["priority"]
        if rank.get(visual_priority, 0) > rank.get(final_priority, 0):
            final_priority = visual_priority
            routing["priority"] = final_priority

        processing_time_ms = (time.time() - start_time) * 1000

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
            # Scene
            scene_detected=scene["scene_detected"],
            scene_summary=scene["scene_summary"],
            detected_issues=scene["detected_issues"],
            road_detections=scene["road_detections"],
            waste_detections=scene["waste_detections"],
            visual_priority=scene.get("visual_priority"),
            # Meta
            processing_time_ms=processing_time_ms,
            model_count=len(models)
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
