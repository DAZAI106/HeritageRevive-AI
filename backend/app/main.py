"""
HeritageAI — Main FastAPI Application
AI-Powered Reconstruction of Lost or Damaged Heritage

Startup:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

# Ensure storage directories exist before anything else
for d in ["storage/uploads", "storage/masks", "storage/results", "weights"]:
    Path(d).mkdir(parents=True, exist_ok=True)

from app.db.database import init_db
from app.api import upload, analyze, restore, evaluate, history, download


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title="HeritageAI API",
    description="AI-Powered Reconstruction of Lost or Damaged Heritage",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving for stored images ────────────────────────────────────
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(upload.router,   prefix="/api", tags=["Upload"])
app.include_router(analyze.router,  prefix="/api", tags=["Analysis"])
app.include_router(restore.router,  prefix="/api", tags=["Restoration"])
app.include_router(evaluate.router, prefix="/api", tags=["Evaluation"])
app.include_router(history.router,  prefix="/api", tags=["History"])
app.include_router(download.router, prefix="/api", tags=["Download"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "HeritageAI API", "version": "1.0.0"}


@app.get("/api/models")
async def list_models():
    """Return available inpainting models and GPU status."""
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if gpu_available else None
    except ImportError:
        gpu_available = False
        gpu_name = None

    return {
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "models": [
            {
                "id": "lama",
                "name": "LaMa (Large Mask Inpainting)",
                "description": (
                    "Best for heritage restoration — cracks, scratches, texture repair. "
                    "Uses Fast Fourier Convolutions for global structure awareness. "
                    "No prompt needed. Works on CPU and GPU."
                ),
                "requires_prompt": False,
                "requires_gpu": False,
                "quality": "high",
                "speed": "medium",
                "recommended": True,
            },
            {
                "id": "sd",
                "name": "Stable Diffusion Inpainting",
                "description": (
                    "Prompt-guided creative reconstruction. Ideal for large missing sections. "
                    "Requires HuggingFace token for first download. GPU strongly recommended."
                ),
                "requires_prompt": False,
                "requires_gpu": False,
                "quality": "high",
                "speed": "slow",
                "recommended": False,
            },
            {
                "id": "classical",
                "name": "Classical Inpainting (OpenCV)",
                "description": (
                    "Telea / Navier-Stokes algorithm. Instant, no GPU, no download. "
                    "Best for thin scratches and small regions. Clearly labeled as classical."
                ),
                "requires_prompt": False,
                "requires_gpu": False,
                "quality": "medium",
                "speed": "fast",
                "recommended": False,
            },
        ],
    }
