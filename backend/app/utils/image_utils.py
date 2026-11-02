"""
HeritageAI — Image utility functions.
Handles resize, unsharp masking, blending, and visualization with strict quality preservation.
"""
from __future__ import annotations

import base64
import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image

DIVISOR = 8
MAX_INFERENCE_DIM = 1024


def load_image_rgb(path: str) -> Image.Image:
    return Image.open(path).convert("RGB")


def load_mask_gray(path: str) -> Image.Image:
    return Image.open(path).convert("L")


def pil_to_numpy(img: Image.Image) -> np.ndarray:
    return np.array(img)


def numpy_to_pil(arr: np.ndarray) -> Image.Image:
    if arr.dtype != np.uint8:
        arr = arr.clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def compute_sharpness_score(img_rgb: np.ndarray) -> float:
    """
    Computes image sharpness using the variance of the Laplacian.
    Higher values indicate crisper edges and fine detail preservation.
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    return round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2)


def apply_unsharp_mask(
    image_rgb: np.ndarray,
    sigma: float = 1.0,
    strength: float = 0.75,
    threshold: float = 3.0,
) -> np.ndarray:
    """
    Controlled OpenCV unsharp masking to restore crisp micro-contrast
    and edge sharpness without creating halos or amplifying flat noise.

    Args:
        image_rgb: RGB uint8 array
        sigma: Gaussian blur radius
        strength: Sharpening weight (0.3 to 1.5)
        threshold: Minimum gradient difference required to sharpen (prevents flat noise halos)
    """
    blurred = cv2.GaussianBlur(image_rgb, (0, 0), sigma)
    diff = image_rgb.astype(np.float32) - blurred.astype(np.float32)
    # Only amplify high-frequency details where gradient exceeds threshold
    edge_mask = (np.abs(diff) > threshold).astype(np.float32)
    sharpened = image_rgb.astype(np.float32) + diff * strength * edge_mask
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def blend_restoration(
    original: Image.Image,
    restored: Image.Image,
    mask: Image.Image,
    sharpen_restored: bool = True,
) -> Image.Image:
    """
    Composites the inpainted result back over the original image.

    Guarantees:
      1. Pixels where mask == 0 (unmasked) are 100% BIT-FOR-BIT IDENTICAL to the original.
      2. Reconstructed areas receive controlled unsharp masking to recover fine edges and texture.
      3. A tiny 1.5px Gaussian feather at the mask border eliminates edge seam lines.
    """
    orig_w, orig_h = original.size

    # Ensure restored matches original native resolution exactly
    if (restored.width, restored.height) != (orig_w, orig_h):
        restored = restored.resize((orig_w, orig_h), Image.LANCZOS)

    # Ensure mask matches original native resolution
    if (mask.width, mask.height) != (orig_w, orig_h):
        mask_r = mask.resize((orig_w, orig_h), Image.NEAREST).convert("L")
    else:
        mask_r = mask.convert("L")

    orig_arr = np.array(original.convert("RGB"), dtype=np.uint8)
    rest_arr = np.array(restored.convert("RGB"), dtype=np.uint8)
    mask_arr = np.array(mask_r, dtype=np.uint8)

    # If sharpening enabled, sharpen the inpainted result before blending
    if sharpen_restored:
        rest_arr = apply_unsharp_mask(rest_arr, sigma=1.0, strength=0.75, threshold=3.0)

    # Binary mask: 1.0 where mask > 127, 0.0 elsewhere
    _, mask_bin = cv2.threshold(mask_arr, 127, 255, cv2.THRESH_BINARY)

    # 1.5-pixel feathering strictly along the boundary to avoid hard seam lines
    feathered_mask = cv2.GaussianBlur(mask_bin.astype(np.float32), (3, 3), 0.8) / 255.0
    alpha = feathered_mask[:, :, np.newaxis]

    # Perfect composite: exactly original where alpha is 0
    blended = orig_arr.astype(np.float32) * (1.0 - alpha) + rest_arr.astype(np.float32) * alpha
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    # Explicit hard preservation: where mask was strictly 0, force exact original values
    unmasked_indices = (mask_bin == 0)
    blended[unmasked_indices] = orig_arr[unmasked_indices]

    return Image.fromarray(blended)


def base64_to_image(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64)))


def image_to_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode()


def create_damage_overlay(
    original: Image.Image,
    mask: Image.Image,
    color: Tuple[int, int, int] = (220, 50, 50),
    alpha: float = 0.45,
) -> Image.Image:
    size = original.size
    mask_r = mask.resize(size, Image.NEAREST).convert("L")

    orig_arr = np.array(original.convert("RGB"), dtype=np.float32)
    mask_arr = np.array(mask_r, dtype=np.float32) / 255.0

    overlay = orig_arr.copy()
    for c_idx, c_val in enumerate(color):
        overlay[:, :, c_idx] = (
            orig_arr[:, :, c_idx] * (1 - mask_arr * alpha)
            + c_val * mask_arr * alpha
        )

    result = np.concatenate(
        [overlay.clip(0, 255).astype(np.uint8),
         np.full((*size[::-1], 1), 255, dtype=np.uint8)],
        axis=2,
    )
    return Image.fromarray(result, "RGBA")
