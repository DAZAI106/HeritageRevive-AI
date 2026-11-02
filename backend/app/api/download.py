"""
HeritageAI — Download Endpoint
GET /api/download/{restoration_id}/{file_type}

file_type: result | mask | original | report
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import RestorationRecord, get_db
from app.services.report import generate_json_report

router = APIRouter()


@router.get("/download/{restoration_id}/{file_type}")
async def download_file(
    restoration_id: str,
    file_type:      str,
    db: AsyncSession = Depends(get_db),
):
    """
    Download restoration outputs.

    file_type:
      result   — Restored / inpainted image (PNG)
      mask     — Damage mask used for restoration (PNG)
      original — Original uploaded image (PNG)
      report   — JSON restoration report
    """
    stmt   = select(RestorationRecord).where(RestorationRecord.id == restoration_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Restoration not found.")

    short_id = restoration_id[:8]

    if file_type == "result":
        p = Path(record.result_path) if record.result_path else None
        if not p or not p.exists():
            raise HTTPException(status_code=404, detail="Result file not found.")
        return FileResponse(str(p), media_type="image/png",
                            filename=f"heritage_restored_{short_id}.png")

    elif file_type == "mask":
        p = Path(record.mask_path) if record.mask_path else None
        if not p or not p.exists():
            raise HTTPException(status_code=404, detail="Mask file not found.")
        return FileResponse(str(p), media_type="image/png",
                            filename=f"heritage_mask_{short_id}.png")

    elif file_type == "original":
        p = Path(record.original_path) if record.original_path else None
        if not p or not p.exists():
            raise HTTPException(status_code=404, detail="Original file not found.")
        return FileResponse(str(p), media_type="image/png",
                            filename=f"heritage_original_{short_id}.png")

    elif file_type == "report":
        dims = (record.width, record.height) if record.width else None
        report = generate_json_report(
            restoration_id   = record.id,
            image_name       = record.image_name,
            model_used       = record.model_used,
            restoration_type = record.restoration_type,
            damage_percentage= record.damage_pct,
            processing_time  = record.processing_time,
            psnr             = record.psnr,
            ssim             = record.ssim,
            dimensions       = dims,
            prompt           = record.prompt,
            error            = record.error_message,
        )
        return JSONResponse(
            content=report,
            headers={
                "Content-Disposition": f'attachment; filename="heritage_report_{short_id}.json"'
            },
        )

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid file_type. Choose one of: result, mask, original, report",
        )
