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
from .schemas import ClassifyResponse, HealthResponse, RouteRequest, DeptRoutingResponse
from .router import route_report_text


# App state containers
device = "cuda" if torch.cuda.is_available() else "cpu"
models = []
face_extractor = None
input_size = 380
frames_per_video = 32

@asynccontextmanager
async def lifespan(app: FastAPI):
    global models, face_extractor
    print(f"Initializing KAWACH Video Classifier microservice on device: {device}...")
    
    # Initialize video reader and face extractor
    video_reader = VideoReader()
    # We sample 32 evenly-spaced frames from each video
    video_read_fn = lambda path: video_reader.read_frames(path, num_frames=frames_per_video)
    face_extractor = FaceExtractor(video_read_fn, device=device)
    
    # Load model weights from Classifier/weights directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    weights_dir = os.path.join(base_dir, "weights")
    models.extend(load_models(weights_dir, device))
    print(f"Loaded {len(models)} model(s) for inference.")
    
    yield
    # Clean up on shutdown
    models.clear()

app = FastAPI(
    title="KAWACH AI Video Classifier",
    description="Microservice to detect AI-generated and deepfake videos",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if len(models) > 0 else "degraded",
        models_loaded=len(models),
        device=device
    )

@app.post("/classify", response_model=ClassifyResponse)
async def classify(file: UploadFile = File(...)):
    # Verify file is a video
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only video files are allowed.")

    # Use /tmp for cross-platform compatibility (works on Linux/HuggingFace and Windows)
    temp_dir = "/tmp/kawach_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"classify_{uuid.uuid4().hex}_{file.filename}"
    temp_filepath = os.path.join(temp_dir, temp_filename)
    
    start_time = time.time()
    
    try:
        # Save uploaded file
        with open(temp_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
        
        # Ensure model is loaded
        if not models:
            raise HTTPException(status_code=503, detail="Models are not loaded. Service is degraded.")
            
        # Run prediction
        fake_prob, faces_detected, frames_analyzed = predict_on_video(
            face_extractor=face_extractor,
            video_path=temp_filepath,
            batch_size=frames_per_video,
            input_size=input_size,
            models=models,
            device=device
        )
        
        # Calculate verdict
        if fake_prob > 0.65:
            verdict = "AI_GENERATED"
        elif fake_prob < 0.35:
            verdict = "AUTHENTIC"
        else:
            verdict = "INCONCLUSIVE"
            
        # If no faces were detected, the classification cannot reliably run
        if faces_detected == 0:
            verdict = "INCONCLUSIVE"
            
        # Calculate confidence level
        if fake_prob > 0.85 or fake_prob < 0.15:
            confidence = "HIGH"
        elif fake_prob > 0.65 or fake_prob < 0.35:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"
            
        processing_time_ms = (time.time() - start_time) * 1000
        
        return ClassifyResponse(
            verdict=verdict,
            fake_probability=fake_prob,
            confidence_level=confidence,
            faces_detected=faces_detected,
            frames_analyzed=frames_analyzed,
            processing_time_ms=processing_time_ms,
            model_count=len(models)
        )
        
    except Exception as e:
        print(f"Error during video classification: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception as cleanup_error:
                print(f"Error cleaning up temp file {temp_filepath}: {cleanup_error}")

@app.post("/route", response_model=DeptRoutingResponse)
async def route(request: RouteRequest):
    try:
        result = route_report_text(
            title=request.title,
            description=request.description,
            category=request.category
        )
        return DeptRoutingResponse(**result)
    except Exception as e:
        print(f"Error during department routing: {e}")
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")

