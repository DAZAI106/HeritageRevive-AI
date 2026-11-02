"""
HeritageAI — History Endpoint
GET /api/history
GET /api/restoration/{id}
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import RestorationRecord, get_db
from app.models.schemas import HistoryResponse, RestorationSummary
from app.utils.file_handler import get_file_url

router = APIRouter()


def _to_dict(r: RestorationRecord) -> Dict[str, Any]:
    return {
        "id":               r.id,
        "created_at":       r.created_at,
        "image_name":       r.image_name,
        "model_used":       r.model_used,
        "damage_pct":       r.damage_pct,
        "processing_time":  r.processing_time,
        "psnr":             r.psnr,
        "ssim":             r.ssim,
        "status":           r.status,
        "width":            r.width,
        "height":           r.height,
        "restoration_type": r.restoration_type,
        "original_url":     get_file_url(Path(r.original_path)) if r.original_path else None,
        "result_url":       get_file_url(Path(r.result_path))   if r.result_path   else None,
    }


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    limit:  int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0,  ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated restoration history with aggregate statistics."""
    # Paginated records
    stmt   = select(RestorationRecord).order_by(desc(RestorationRecord.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    records = result.scalars().all()

    # Total count
    total_result = await db.execute(select(func.count()).select_from(RestorationRecord))
    total = total_result.scalar_one()

    # Aggregate statistics from all records
    all_result = await db.execute(select(RestorationRecord))
    all_recs   = all_result.scalars().all()

    successful  = sum(1 for r in all_recs if r.status in ("completed", "completed_with_fallback"))
    times       = [r.processing_time for r in all_recs if r.processing_time]
    avg_time    = round(sum(times) / max(1, len(times)), 2)

    return HistoryResponse(
        total=total,
        restorations=[_to_dict(r) for r in records],
        stats={
            "total_processed":     total,
            "successful":          successful,
            "failed":              total - successful,
            "avg_processing_time": avg_time,
            "success_rate":        round(successful / max(1, total) * 100, 1),
        },
    )


@router.get("/restoration/{restoration_id}")
async def get_restoration(
    restoration_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return details for a single restoration."""
    stmt   = select(RestorationRecord).where(RestorationRecord.id == restoration_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Restoration not found.")
    return _to_dict(record)
