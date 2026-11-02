"""Pydantic request / response schemas for HeritageAI API."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    image_id: str
    filename: str
    width: int
    height: int
    file_size_kb: float
    preview_url: str
    message: str


# ── Damage Analysis ───────────────────────────────────────────────────────────

class DamageAnalysisResponse(BaseModel):
    image_id: str
    mask_url: str
    overlay_url: str
    damage_percentage: float
    damage_regions: int
    damage_types: List[str]
    analysis_notes: str


# ── Restoration ───────────────────────────────────────────────────────────────

class RestoreRequest(BaseModel):
    image_id: str
    mask_data: Optional[str] = None          # base64 PNG from canvas editor
    use_detected_mask: bool = True
    model: str = Field(default="lama", pattern="^(lama|sd|classical)$")
    restoration_type: str = Field(
        default="general",
        pattern="^(general|painting|architecture|sculpture|manuscript)$",
    )
    prompt: Optional[str] = None
    quality: str = Field(default="standard", pattern="^(standard|high)$")


class RestoreResponse(BaseModel):
    restoration_id: str
    original_url: str
    result_url: str
    mask_url: str
    mask_overlay_url: Optional[str] = None
    raw_output_url: Optional[str] = None
    model_used: str
    processing_time_seconds: float
    damage_percentage: Optional[float]
    status: str
    message: str
    original_sharpness: Optional[float] = None
    restored_sharpness: Optional[float] = None


# ── Evaluation ────────────────────────────────────────────────────────────────

class EvaluateRequest(BaseModel):
    restoration_id: str
    reference_image_id: Optional[str] = None
    mode: str = Field(default="simulated", pattern="^(reference|simulated)$")


class MetricsResponse(BaseModel):
    restoration_id: str
    mode: str
    psnr: Optional[float]
    ssim: Optional[float]
    psnr_interpretation: str
    ssim_interpretation: str
    mode_explanation: str
    valid: bool


# ── History ───────────────────────────────────────────────────────────────────

class RestorationSummary(BaseModel):
    id: str
    created_at: datetime
    image_name: str
    model_used: str
    damage_pct: Optional[float]
    processing_time: Optional[float]
    psnr: Optional[float]
    ssim: Optional[float]
    status: str
    width: Optional[int]
    height: Optional[int]
    restoration_type: str
    original_url: Optional[str]
    result_url: Optional[str]

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    total: int
    restorations: List[RestorationSummary]
    stats: dict
