"""
HeritageAI — LaMa (Large Mask Inpainting) Service

Uses the official TorchScript model of LaMa (Resolution-robust Large Mask Inpainting
with Fourier Convolutions, Suvorov et al.).
Global context awareness via Fast Fourier Convolutions allows seamless texture
and structural reconstruction of historical architecture, fresco, and art.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
import torch
from PIL import Image

from app.utils.image_utils import blend_restoration

logger = logging.getLogger(__name__)

LAMA_WEIGHTS_URL = "https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt"
WEIGHTS_DIR      = Path(os.getenv("WEIGHTS_DIR", str(Path(__file__).resolve().parent.parent.parent / "weights")))
LAMA_MODEL_PATH  = WEIGHTS_DIR / "big-lama.pt"

_lama_model  = None
_lama_device = None


def _ensure_weights() -> Path:
    """Download LaMa TorchScript model if not already present."""
    if not LAMA_MODEL_PATH.exists():
        logger.info(f"Downloading LaMa model to {LAMA_MODEL_PATH} from {LAMA_WEIGHTS_URL} ...")
        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        from torch.hub import download_url_to_file
        download_url_to_file(LAMA_WEIGHTS_URL, str(LAMA_MODEL_PATH), progress=True)
        logger.info("LaMa model downloaded successfully.")
    return LAMA_MODEL_PATH


def _get_model() -> Tuple[torch.jit.ScriptModule, torch.device]:
    global _lama_model, _lama_device
    if _lama_model is None:
        model_path = _ensure_weights()
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Loading LaMa model on {device} from {model_path} ...")
        model = torch.jit.load(str(model_path), map_location=device)
        model.eval()
        _lama_model = model
        _lama_device = device
        logger.info("LaMa model ready.")
    return _lama_model, _lama_device


def _ceil_modulo(x: int, mod: int) -> int:
    if x % mod == 0:
        return x
    return (x // mod + 1) * mod


def _pad_img_to_modulo(img: np.ndarray, mod: int = 8) -> np.ndarray:
    channels, height, width = img.shape
    out_height = _ceil_modulo(height, mod)
    out_width = _ceil_modulo(width, mod)
    return np.pad(
        img,
        ((0, 0), (0, out_height - height), (0, out_width - width)),
        mode="symmetric",
    )


def inpaint_lama(
    image_path: str,
    mask_path: str,
    return_raw: bool = False,
):
    """
    Run deep learning LaMa inpainting on the damaged image and mask.

    Args:
        image_path: Path to original damaged image.
        mask_path:  Path to binary mask (white=255 -> reconstruct, black=0 -> keep).
        return_raw: If True, returns tuple of (final_blended, raw_generated).

    Returns:
        Restored PIL Image (or tuple with raw generated if return_raw=True).
    """
    orig_img = Image.open(str(image_path)).convert("RGB")
    orig_mask = Image.open(str(mask_path)).convert("L")
    orig_w, orig_h = orig_img.size

    # Ensure mask dimensions match image dimensions exactly
    if orig_mask.size != (orig_w, orig_h):
        orig_mask = orig_mask.resize((orig_w, orig_h), Image.NEAREST)

    # Cap maximum dimension to 1024 for inference speed on CPU
    max_dim = 1024
    if max(orig_w, orig_h) > max_dim:
        scale = max_dim / max(orig_w, orig_h)
        inf_w = int(orig_w * scale)
        inf_h = int(orig_h * scale)
        img_res = orig_img.resize((inf_w, inf_h), Image.LANCZOS)
        mask_res = orig_mask.resize((inf_w, inf_h), Image.NEAREST)
    else:
        img_res = orig_img
        mask_res = orig_mask

    # Prepare numpy arrays (strictly binary mask: >127 = 1.0, <=127 = 0.0)
    img_np = np.array(img_res, dtype=np.float32) / 255.0
    mask_np = (np.array(mask_res, dtype=np.float32) > 127).astype(np.float32)

    # CHW conversion
    img_chw = np.transpose(img_np, (2, 0, 1))
    mask_chw = mask_np[np.newaxis, ...]

    # Pad spatial dimensions to modulo 8
    img_padded = _pad_img_to_modulo(img_chw, mod=8)
    mask_padded = _pad_img_to_modulo(mask_chw, mod=8)

    model, device = _get_model()

    img_tensor = torch.from_numpy(img_padded).unsqueeze(0).to(device)
    mask_tensor = (torch.from_numpy(mask_padded).unsqueeze(0) > 0).float().to(device)

    with torch.no_grad():
        out = model(img_tensor, mask_tensor)

    # Convert back to PIL
    out_np = out[0].permute(1, 2, 0).detach().cpu().numpy()
    out_np = np.clip(out_np * 255.0, 0, 255).astype(np.uint8)

    # Crop out padding
    cur_h, cur_w = img_res.height, img_res.width
    out_cropped = out_np[:cur_h, :cur_w]
    raw_pil = Image.fromarray(out_cropped)

    # Upscale to original image size if resized
    if (raw_pil.width, raw_pil.height) != (orig_w, orig_h):
        raw_pil = raw_pil.resize((orig_w, orig_h), Image.LANCZOS)

    # Blend: replace strictly the masked region, leaving 100% of undamaged areas intact
    final = blend_restoration(orig_img, raw_pil, orig_mask)

    if return_raw:
        return final, raw_pil
    return final
