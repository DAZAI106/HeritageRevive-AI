"""
HeritageAI — Upload Endpoint
POST /api/upload
"""
from __future__ import annotations

import io
import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.models.schemas import UploadResponse
from app.utils.file_handler import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_MB,
    generate_id,
    get_file_url,
    get_upload_path,
    save_upload,
    validate_extension,
)

router = APIRouter()
_MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a heritage image for restoration.

    Validates:
    - Extension: JPG, JPEG, PNG only
    - Size: ≤ MAX_FILE_SIZE_MB (default 20 MB)
    - Content: must be a genuine image (verified by Pillow)

    Saves with a UUID filename to prevent path-traversal attacks.
    Returns image metadata and a preview URL.
    """
    # ── Extension check ───────────────────────────────────────────────────────
    fname = file.filename or "upload.jpg"
    if not validate_extension(fname):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{Path(fname).suffix}'. "
                   "Only JPG, JPEG, and PNG images are accepted.",
        )

    # ── Read ──────────────────────────────────────────────────────────────────
    contents = await file.read()

    # ── Size check ────────────────────────────────────────────────────────────
    if len(contents) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large ({len(contents) // 1024} KB). "
                   f"Maximum allowed size is {MAX_FILE_SIZE_MB} MB.",
        )

    # ── Image integrity check ─────────────────────────────────────────────────
    try:
        with Image.open(io.BytesIO(contents)) as probe:
            probe.verify()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        width, height = img.size
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="The file does not appear to be a valid image.",
        )

    # ── Persist ───────────────────────────────────────────────────────────────
    image_id = generate_id()
    ext      = Path(fname).suffix.lower()
    await save_upload(contents, image_id, ext)

    # Always store a PNG copy for consistent downstream processing
    png_path = get_upload_path(image_id, ".png")
    if ext != ".png":
        png_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(png_path), "PNG")

    src_path = png_path if png_path.exists() else get_upload_path(image_id, ext)
    return UploadResponse(
        image_id=image_id,
        filename=fname,
        width=width,
        height=height,
        file_size_kb=round(len(contents) / 1024, 2),
        preview_url=get_file_url(src_path),
        message="Image uploaded successfully.",
    )
