"""
HeritageAI — Image Quality Metrics Service (PSNR & SSIM)

ACADEMIC NOTE
─────────────
PSNR and SSIM require a ground-truth (undamaged) reference image.
Comparing a restored image against the *damaged* input does NOT
measure restoration quality — it only measures pixel change.

Two valid evaluation modes are implemented:

  Mode A (reference):   User uploads the undamaged original →
                        compare restored vs reference.

  Mode B (simulated):   Synthetic damage is applied to the uploaded image →
                        AI restores it → compare restored vs original.
                        This tests the AI on a controlled experiment,
                        NOT on the user's actual heritage damage.

Scores are NEVER fabricated or randomised.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Dict, Optional

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as _ssim
from skimage.metrics import peak_signal_noise_ratio as _psnr

logger = logging.getLogger(__name__)


# ── Core metric functions ─────────────────────────────────────────────────────

def calculate_psnr(reference: np.ndarray, restored: np.ndarray) -> float:
    """
    Peak Signal-to-Noise Ratio in dB.
    Higher is better. Typical range for restoration: 20–45 dB.
    Returns float('inf') when the images are identical.
    """
    if reference.shape != restored.shape:
        raise ValueError(f"Shape mismatch: {reference.shape} vs {restored.shape}")
    ref = reference.astype(np.float64)
    res = restored.astype(np.float64)
    mse = np.mean((ref - res) ** 2)
    if mse == 0:
        return float("inf")
    return round(20.0 * np.log10(255.0 / np.sqrt(mse)), 4)


def calculate_ssim(reference: np.ndarray, restored: np.ndarray) -> float:
    """
    Structural Similarity Index — 0 (no similarity) to 1 (perfect match).
    """
    if reference.shape != restored.shape:
        raise ValueError(f"Shape mismatch: {reference.shape} vs {restored.shape}")
    val = _ssim(reference, restored, channel_axis=2, data_range=255)
    return round(float(val), 4)


# ── Interpretation helpers ────────────────────────────────────────────────────

def _interp_psnr(v: Optional[float]) -> str:
    if v is None:
        return "Not calculated"
    if v == float("inf"):
        return "Perfect reconstruction (identical to reference)"
    if v >= 40:
        return "Excellent — very close to reference image"
    if v >= 35:
        return "Good — minor perceptible differences"
    if v >= 30:
        return "Acceptable — some visible differences from reference"
    if v >= 25:
        return "Moderate — noticeable reconstruction differences"
    return "Significant differences from reference"


def _interp_ssim(v: Optional[float]) -> str:
    if v is None:
        return "Not calculated"
    if v >= 0.95:
        return "Near-perfect structural similarity"
    if v >= 0.85:
        return "High structural similarity — structure well preserved"
    if v >= 0.70:
        return "Good structural similarity — main structures preserved"
    if v >= 0.50:
        return "Moderate structural similarity"
    return "Low structural similarity — significant reconstruction differences"


# ── Public evaluation functions ───────────────────────────────────────────────

def evaluate_with_reference(reference_path: str, restored_path: str) -> Dict:
    """
    Mode A: Reference-based evaluation.
    Compares restored image against user-provided undamaged original.
    This is the scientifically valid evaluation method.
    """
    ref = np.array(Image.open(reference_path).convert("RGB"), dtype=np.uint8)
    res = Image.open(restored_path).convert("RGB")

    if res.size != (ref.shape[1], ref.shape[0]):
        res = res.resize((ref.shape[1], ref.shape[0]), Image.LANCZOS)
    res = np.array(res, dtype=np.uint8)

    psnr = calculate_psnr(ref, res)
    ssim = calculate_ssim(ref, res)

    return {
        "mode":               "reference",
        "psnr":               psnr,
        "ssim":               ssim,
        "psnr_interpretation": _interp_psnr(psnr),
        "ssim_interpretation": _interp_ssim(ssim),
        "mode_explanation": (
            "Mode A — Reference-based evaluation. "
            "The restored image is compared against the original undamaged image you provided. "
            "This is the scientifically valid way to measure AI restoration quality."
        ),
        "valid": True,
    }


def evaluate_synthetic(original_path: str, model: str = "lama") -> Dict:
    """
    Mode B: Simulated damage evaluation.

    Steps:
      1. Load the user's uploaded image (treated as ground truth).
      2. Apply a synthetic damage mask (random cracks + holes).
      3. Zero-out the masked pixels to simulate damage.
      4. Run the selected AI model to restore the damaged copy.
      5. Compare restored vs original → calculate PSNR & SSIM.

    This measures how well the AI model can recover from known, controlled damage
    on THIS image. It does NOT measure the quality of the user's actual restoration.
    """
    original = Image.open(str(original_path)).convert("RGB")
    orig_arr = np.array(original, dtype=np.uint8)
    h, w     = orig_arr.shape[:2]

    # Generate reproducible synthetic mask
    syn_mask = _synthetic_mask(h, w)
    mask_img = Image.fromarray(syn_mask)

    # Apply damage (zero out masked pixels)
    damaged_arr = orig_arr.copy()
    damaged_arr[syn_mask > 127] = 0
    damaged_img = Image.fromarray(damaged_arr)

    # Write to temp files for inpainting services
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fi:
        damaged_img.save(fi.name)
        dmg_path = fi.name

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fm:
        mask_img.save(fm.name)
        msk_path = fm.name

    try:
        restored = _run_inpaint(model, dmg_path, msk_path)
        if restored.size != (w, h):
            restored = restored.resize((w, h), Image.LANCZOS)

        res_arr  = np.array(restored.convert("RGB"), dtype=np.uint8)
        psnr     = calculate_psnr(orig_arr, res_arr)
        ssim     = calculate_ssim(orig_arr, res_arr)

    finally:
        for p in [dmg_path, msk_path]:
            try:
                os.remove(p)
            except Exception:
                pass

    return {
        "mode":               "simulated",
        "psnr":               psnr,
        "ssim":               ssim,
        "psnr_interpretation": _interp_psnr(psnr),
        "ssim_interpretation": _interp_ssim(ssim),
        "mode_explanation": (
            "Mode B — Simulated damage evaluation. "
            "Artificial damage (random cracks and holes) was applied to your uploaded image, "
            "then restored by the AI. PSNR and SSIM measure recovery accuracy against the original. "
            "This does NOT evaluate your actual heritage restoration — it tests the model on "
            "controlled synthetic damage specific to this image."
        ),
        "valid": True,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _synthetic_mask(h: int, w: int) -> np.ndarray:
    """Generate a realistic synthetic damage mask for Mode B."""
    import cv2

    mask = np.zeros((h, w), dtype=np.uint8)
    rng  = np.random.default_rng(seed=42)

    # Random crack-like line segments
    for _ in range(rng.integers(4, 9)):
        x1 = rng.integers(0, w)
        y1 = rng.integers(0, h)
        length = rng.integers(int(min(h, w) * 0.1), int(min(h, w) * 0.35))
        angle  = rng.uniform(0, np.pi)
        x2     = int(x1 + length * np.cos(angle))
        y2     = int(y1 + length * np.sin(angle))
        thick  = int(rng.integers(2, 7))
        cv2.line(mask, (x1, y1), (x2, y2), 255, thick)

    # Random circular holes / stain patches
    for _ in range(rng.integers(1, 4)):
        cx = rng.integers(int(w * 0.1), int(w * 0.9))
        cy = rng.integers(int(h * 0.1), int(h * 0.9))
        r  = rng.integers(int(min(h, w) * 0.03), int(min(h, w) * 0.10))
        cv2.circle(mask, (int(cx), int(cy)), int(r), 255, -1)

    # Slight dilation
    k    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.dilate(mask, k, iterations=1)
    return mask


def _run_inpaint(model: str, image_path: str, mask_path: str):
    """Dispatch to the appropriate inpainting service."""
    if model == "lama":
        try:
            from app.services.lama_inpainting import inpaint_lama
            return inpaint_lama(image_path, mask_path)
        except Exception as e:
            logger.warning(f"LaMa failed in synthetic eval, falling back: {e}")

    from app.services.classical_inpaint import inpaint_classical
    return inpaint_classical(image_path, mask_path)
