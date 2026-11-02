"""
HeritageAI — Safe file-handling utilities.
UUID-based naming prevents path traversal attacks.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "storage/uploads"))
MASK_DIR   = Path(os.getenv("MASK_DIR",   "storage/masks"))
RESULT_DIR = Path(os.getenv("RESULT_DIR", "storage/results"))
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def generate_id() -> str:
    return str(uuid.uuid4())


def validate_extension(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def get_upload_path(image_id: str, extension: str = ".png") -> Path:
    return UPLOAD_DIR / f"{image_id}{extension}"


def get_mask_path(image_id: str) -> Path:
    return MASK_DIR / f"{image_id}_mask.png"


def get_overlay_path(image_id: str) -> Path:
    return MASK_DIR / f"{image_id}_overlay.png"


def get_result_path(restoration_id: str) -> Path:
    return RESULT_DIR / f"{restoration_id}_result.png"


async def save_upload(file_bytes: bytes, image_id: str, extension: str) -> Path:
    """Persist uploaded bytes to disk under a UUID filename."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = get_upload_path(image_id, extension)
    async with aiofiles.open(path, "wb") as f:
        await f.write(file_bytes)
    return path


def get_file_url(path: Path) -> str:
    """Convert an absolute storage path to a browser-accessible URL path."""
    parts = path.parts
    try:
        idx = next(i for i, p in enumerate(parts) if p.lower() == "storage")
        return "/" + "/".join(parts[idx:])
    except StopIteration:
        return f"/{path.name}"
