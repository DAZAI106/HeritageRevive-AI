"""
HeritageAI — Restoration Endpoint
POST /api/restore
"""
from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import RestorationRecord, get_db
from app.models.schemas import RestoreRequest, RestoreResponse
from app.utils.file_handler import (
    generate_id,
    get_file_url,
    get_mask_path,
    get_result_path,
    get_upload_path,
)
from app.utils.image_utils import base64_to_image, compute_sharpness_score, create_damage_overlay

logger = logging.getLogger(__name__)
router = APIRouter()


def _find_image(image_id: str) -> Optional[Path]:
    for ext in (".png", ".jpg", ".jpeg"):
        p = get_upload_path(image_id, ext)
        if p.exists():
            return p
    return None


async def _resolve_mask(req: RestoreRequest, target_size: tuple[int, int]) -> Path:
    w, h = target_size
    if req.mask_data:
        mask_img = base64_to_image(req.mask_data).convert("L")
        if mask_img.size != (w, h):
            mask_img = mask_img.resize((w, h), Image.NEAREST)
        mask_path = get_mask_path(f"{req.image_id}_manual")
        mask_path.parent.mkdir(parents=True, exist_ok=True)
        mask_img.save(str(mask_path))
        return mask_path

    if req.use_detected_mask:
        auto = get_mask_path(req.image_id)
        if auto.exists():
            auto_img = Image.open(str(auto)).convert("L")
            if auto_img.size != (w, h):
                auto_img = auto_img.resize((w, h), Image.NEAREST)
                auto_img.save(str(auto))
            return auto

    raise HTTPException(
        status_code=400,
        detail="No mask provided. Please run damage analysis or draw a mask in the editor.",
    )


async def _run_model(
    model: str,
    image_path: str,
    mask_path: str,
    restoration_type: str,
    prompt: Optional[str],
    quality: str,
) -> tuple[Image.Image, Image.Image]:
    loop = asyncio.get_event_loop()

    if model == "lama":
        from app.services.lama_inpainting import inpaint_lama
        return await loop.run_in_executor(None, inpaint_lama, image_path, mask_path, True)

    if model == "sd":
        from app.services.sd_inpainting import inpaint_sd
        steps = 30 if quality == "high" else 20
        return await loop.run_in_executor(
            None, inpaint_sd, image_path, mask_path, restoration_type, prompt, steps, 7.5, True
        )

    if model == "classical":
        from app.services.classical_inpaint import inpaint_classical
        return await loop.run_in_executor(None, inpaint_classical, image_path, mask_path, 3, 0.12, True)

    raise ValueError(f"Unknown model: {model}")


@router.post("/restore", response_model=RestoreResponse)
async def restore_image(
    req: RestoreRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run AI inpainting restoration.

    Strict Quality Guarantees:
      • No silent substitution: If a selected model fails, returns the exact diagnostic error.
      • Bit-for-bit unmasked preservation: Only pixels explicitly marked in the mask are replaced.
      • Unsharp masking edge restoration: Recovers fine high-frequency texture and details.
      • Returns raw unblended output alongside composite and overlay for full transparency.
    """
    restoration_id = generate_id()
    start = time.time()

    # 1. Locate original image
    image_path = _find_image(req.image_id)
    if not image_path:
        raise HTTPException(status_code=404, detail="Uploaded image not found. Please upload again.")

    orig_img = Image.open(str(image_path)).convert("RGB")
    width, height = orig_img.size
    orig_np = np.array(orig_img)

    # 2. Resolve and validate mask
    mask_path = await _resolve_mask(req, (width, height))
    mask_img = Image.open(str(mask_path)).convert("L")
    mask_arr = np.array(mask_img)

    damage_px = int(np.sum(mask_arr > 127))
    if damage_px == 0:
        raise HTTPException(
            status_code=400,
            detail="The selected mask is empty (0 pixels). Please use the Mask Brush to paint the missing or damaged architectural area to reconstruct.",
        )
    damage_pct = round(float(damage_px) / float(mask_arr.size) * 100, 2)

    # 3. Create diagnostic mask overlay
    overlay_img = create_damage_overlay(orig_img, mask_img)
    overlay_path = mask_path.parent / f"{restoration_id}_overlay.png"
    overlay_img.convert("RGB").save(str(overlay_path), "PNG")

    # 4. Run selected inpainting model directly without silent substitution
    result_path = get_result_path(restoration_id)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path = result_path.parent / f"{restoration_id}_raw.png"

    try:
        restored, raw_generated = await _run_model(
            req.model, str(image_path), str(mask_path),
            req.restoration_type, req.prompt, req.quality,
        )
        restored.save(str(result_path), "PNG")
        raw_generated.save(str(raw_path), "PNG")
        status = "completed"
        error_msg = None

    except Exception as primary_err:
        logger.error(f"Inpainting model '{req.model}' error: {primary_err}")
        raise HTTPException(
            status_code=500,
            detail=f"Restoration with {req.model.upper()} failed: {primary_err}",
        )

    processing_time = round(time.time() - start, 2)

    # Compute sharpness comparison (Laplacian variance)
    rest_np = np.array(restored.convert("RGB"))
    orig_sharpness = compute_sharpness_score(orig_np)
    rest_sharpness = compute_sharpness_score(rest_np)

    # 4. Save to Database
    record = RestorationRecord(
        id=restoration_id,
        image_name=image_path.stem,
        original_path=str(image_path),
        mask_path=str(mask_path),
        result_path=str(result_path),
        model_used=req.model,
        processing_time=processing_time,
        damage_pct=damage_pct,
        status=status,
        width=width,
        height=height,
        restoration_type=req.restoration_type,
        prompt=req.prompt,
        error_message=error_msg,
    )
    db.add(record)
    await db.commit()

    return RestoreResponse(
        restoration_id=restoration_id,
        original_url=get_file_url(image_path),
        result_url=get_file_url(result_path),
        mask_url=get_file_url(mask_path),
        mask_overlay_url=get_file_url(overlay_path),
        raw_output_url=get_file_url(raw_path),
        model_used=req.model,
        processing_time_seconds=processing_time,
        damage_percentage=damage_pct,
        status=status,
        message=f"Restoration completed successfully using {req.model.upper()}.",
        original_sharpness=orig_sharpness,
        restored_sharpness=rest_sharpness,
    )
