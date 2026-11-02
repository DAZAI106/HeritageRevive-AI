"""
HeritageAI — Evaluation Endpoint
POST /api/evaluate
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import RestorationRecord, get_db
from app.models.schemas import EvaluateRequest, MetricsResponse
from app.services.metrics import evaluate_synthetic, evaluate_with_reference
from app.utils.file_handler import get_upload_path

router = APIRouter()


def _find_image(image_id: str) -> Optional[Path]:
    for ext in (".png", ".jpg", ".jpeg"):
        p = get_upload_path(image_id, ext)
        if p.exists():
            return p
    return None


@router.post("/evaluate", response_model=MetricsResponse)
async def evaluate_restoration(
    req: EvaluateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate PSNR and SSIM for a completed restoration.

    Mode A (reference): Provide reference_image_id (uploaded undamaged original).
                        Compares restored vs reference — scientifically valid.

    Mode B (simulated): Applies synthetic damage to the uploaded image,
                        restores it with AI, then compares vs original.
                        Tests the model's capability; does NOT measure your
                        actual restoration quality.

    Scores are NEVER fabricated.
    """
    # Fetch restoration record
    stmt   = select(RestorationRecord).where(RestorationRecord.id == req.restoration_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Restoration not found.")
    if not record.result_path:
        raise HTTPException(status_code=400, detail="Restoration has no output image yet.")

    try:
        if req.mode == "reference":
            if not req.reference_image_id:
                raise HTTPException(
                    status_code=400,
                    detail="reference_image_id is required for Mode A (reference-based evaluation).",
                )
            ref_path = _find_image(req.reference_image_id)
            if not ref_path:
                raise HTTPException(
                    status_code=404,
                    detail="Reference image not found. Please upload the undamaged original first.",
                )
            metrics = evaluate_with_reference(str(ref_path), record.result_path)

        else:  # simulated
            metrics = evaluate_synthetic(record.original_path, model=record.model_used)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    # Persist metrics to the record
    await db.execute(
        update(RestorationRecord)
        .where(RestorationRecord.id == req.restoration_id)
        .values(psnr=metrics["psnr"], ssim=metrics["ssim"])
    )
    await db.commit()

    return MetricsResponse(restoration_id=req.restoration_id, **metrics)
