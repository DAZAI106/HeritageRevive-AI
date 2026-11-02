"""
HeritageAI — Classical OpenCV Inpainting

Uses Telea (fast-marching) or Navier-Stokes PDE inpainting algorithms.
STRICT USAGE RULE:
  Only for small scratches, dust, and thin cracks (thickness <= 10px).
  Never for large missing architectural blocks, roofs, or windows (which cause blur).
"""
from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from app.utils.image_utils import blend_restoration


def inpaint_classical(
    image_path: str,
    mask_path: str,
    radius: int = 3,
    max_damage_ratio: float = 0.12,
    return_raw: bool = False,
):
    """
    Apply OpenCV classical inpainting strictly to small scratches and cracks.

    Args:
        image_path: Path to the original image.
        mask_path:  Path to the binary mask (white=255 = inpaint, black=0 = keep).
        radius:     Neighbourhood radius (3 for thin cracks, 2 for hairline scratches).
        max_damage_ratio: Maximum allowable masked fraction before rejecting large missing regions.
        return_raw: If True, returns tuple of (final_blended, raw_generated).

    Returns:
        Restored PIL Image with exact preservation of pixels outside the mask.
    """
    orig_img = Image.open(str(image_path)).convert("RGB")
    orig_mask = Image.open(str(mask_path)).convert("L")

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise ValueError(f"Cannot load image: {image_path}")

    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValueError(f"Cannot load mask: {mask_path}")

    if mask.shape[:2] != img_bgr.shape[:2]:
        mask = cv2.resize(
            mask, (img_bgr.shape[1], img_bgr.shape[0]), interpolation=cv2.INTER_NEAREST
        )

    _, mask_bin = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    damage_ratio = float(np.sum(mask_bin > 0)) / mask_bin.size

    # Check for thick/large missing architectural regions
    dist = cv2.distanceTransform(mask_bin, cv2.DIST_L2, 3)
    max_thickness = float(np.max(dist)) if dist.size > 0 else 0.0

    if damage_ratio > max_damage_ratio or max_thickness > 16.0:
        raise ValueError(
            f"Classical inpainting is strictly designed for thin scratches and dust (current damage covers "
            f"{damage_ratio * 100:.1f}%, max thickness {max_thickness:.1f}px). "
            f"Using classical diffusion on large architectural regions causes severe blur. "
            f"Please select the LaMa AI model for structural and architectural reconstruction."
        )

    # Telea is preferred for thin cracks; NS for slightly wider scratches
    method = cv2.INPAINT_TELEA if max_thickness <= 5.0 else cv2.INPAINT_NS
    r = max(1, min(radius, 5))

    result_bgr = cv2.inpaint(img_bgr, mask_bin, r, method)
    result_rgb = Image.fromarray(cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB))

    # Guarantee bit-for-bit identity on pixels outside the mask
    final = blend_restoration(orig_img, result_rgb, orig_mask, sharpen_restored=False)
    if return_raw:
        return final, result_rgb
    return final

