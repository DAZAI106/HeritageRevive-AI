"""
HeritageAI — Restoration Report Generator

Produces a structured JSON report for each restoration.
Reports include model info, damage analysis, metrics, and limitations.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Tuple


_MODEL_DESCRIPTIONS = {
    "lama":      "LaMa (Large Mask Inpainting) — Fourier Convolution deep learning model for structural heritage restoration",
    "sd":        "Stable Diffusion v1.5 Inpainting — Diffusion-based generative AI for prompt-guided reconstruction",
    "classical": "Classical OpenCV Inpainting (Telea / Navier-Stokes) — Traditional computer vision algorithm",
}

_LIMITATIONS = [
    "AI-generated reconstructions are interpretations, not historical proof.",
    "Reconstructed regions are clearly labeled; the original uploaded image is preserved unchanged.",
    "Automatic damage detection may miss subtle or unusual damage types.",
    "Manual mask editing is recommended for best restoration accuracy.",
    "Text appearing in AI-reconstructed manuscript regions is NOT historically accurate.",
    "Restoration quality depends on the amount and type of original context visible.",
]


def generate_json_report(
    restoration_id:  str,
    image_name:      str,
    model_used:      str,
    restoration_type: str,
    damage_percentage: Optional[float],
    processing_time:  Optional[float],
    psnr:            Optional[float],
    ssim:            Optional[float],
    dimensions:      Optional[Tuple[int, int]],
    prompt:          Optional[str] = None,
    error:           Optional[str] = None,
) -> Dict[str, Any]:
    """Return a fully populated restoration report dictionary."""
    return {
        "report_title":    "HeritageAI Restoration Report",
        "project":         "AI-Powered Reconstruction of Lost or Damaged Heritage",
        "restoration_id":  restoration_id,
        "generated_at":    datetime.utcnow().isoformat() + "Z",
        "image": {
            "name":             image_name,
            "dimensions":       f"{dimensions[0]}x{dimensions[1]}" if dimensions else "unknown",
            "restoration_type": restoration_type,
        },
        "ai_model": {
            "id":          model_used,
            "description": _MODEL_DESCRIPTIONS.get(model_used, model_used),
        },
        "damage_analysis": {
            "estimated_damage_percentage": damage_percentage,
            "note": "Damage percentage is an automated estimate. Manual verification recommended.",
        },
        "restoration": {
            "processing_time_seconds": processing_time,
            "prompt_used":             prompt,
            "status":                  "error" if error else "completed",
            "error":                   error,
        },
        "quality_metrics": {
            "psnr_db": psnr,
            "ssim":    ssim,
            "validity_note": (
                "Metrics are valid only when compared against a ground-truth reference image. "
                "See the evaluation section for mode details."
            ) if psnr is not None else "No quality metrics were calculated for this restoration.",
        },
        "limitations": _LIMITATIONS,
    }
