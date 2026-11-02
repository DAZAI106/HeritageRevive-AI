"""
HeritageAI — Damage Analysis Endpoint
POST /api/analyze-damage
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from PIL import Image

from app.models.schemas import DamageAnalysisResponse
from app.services.damage_detection import detect_damage
from app.utils.file_handler import (
    get_file_url,
    get_mask_path,
    get_overlay_path,
    get_upload_path,
)
from app.utils.image_utils import create_damage_overlay

router = APIRouter()


class AnalyzeRequest(BaseModel):
    image_id:    str
    sensitivity: float = Field(default=0.5, ge=0.0, le=1.0)


def _find_image(image_id: str):
    for ext in (".png", ".jpg", ".jpeg"):
        p = get_upload_path(image_id, ext)
        if p.exists():
            return p
    return None


@router.post("/analyze-damage", response_model=DamageAnalysisResponse)
async def analyze_damage(req: AnalyzeRequest):
    """
    Run automated multi-technique damage detection on an uploaded image.

    Techniques used:
      • Crack detection — Canny edges + morphology + elongation filter
      • Scratch detection — Hough line transform
      • Stain detection — HSV saturation blob analysis
      • Fading detection — Brightness + local variance
      • Hole detection — Dark region connected components

    Returns a binary mask, visual overlay, damage %, region count, and damage types.

    NOTE: Automated detection is an estimate. Use the manual mask editor
    for precise region selection before restoration.
    """
    image_path = _find_image(req.image_id)
    if not image_path:
        raise HTTPException(status_code=404, detail="Image not found. Please upload first.")

    try:
        result = detect_damage(str(image_path), sensitivity=req.sensitivity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Damage detection failed: {e}")

    # Save binary mask
    mask_path = get_mask_path(req.image_id)
    mask_path.parent.mkdir(parents=True, exist_ok=True)
    mask_img  = Image.fromarray(result["mask"])
    mask_img.save(str(mask_path))

    # Save coloured overlay
    original     = Image.open(str(image_path)).convert("RGB")
    overlay_img  = create_damage_overlay(original, mask_img)
    overlay_path = get_overlay_path(req.image_id)
    overlay_img.save(str(overlay_path))

    pct = result["damage_percentage"]

    if pct < 1.0:
        notes = ("Minimal damage detected automatically. The image may be intact, "
                 "or damage may be too subtle for automated detection. "
                 "Use the manual mask editor to mark specific regions.")
    elif pct < 10.0:
        notes = (f"Moderate damage detected ({pct:.1f}% of image area). "
                 "Review the mask and refine with the manual editor before restoring.")
    elif pct < 30.0:
        notes = (f"Significant damage detected ({pct:.1f}% of image area). "
                 "LaMa inpainting is recommended for best results.")
    else:
        notes = (f"Extensive damage detected ({pct:.1f}% of image area). "
                 "Consider using Stable Diffusion inpainting for large missing sections.")

    return DamageAnalysisResponse(
        image_id=req.image_id,
        mask_url=get_file_url(mask_path),
        overlay_url=get_file_url(overlay_path),
        damage_percentage=pct,
        damage_regions=result["region_count"],
        damage_types=result["damage_types"],
        analysis_notes=notes,
    )
