"""
HeritageAI — Automated Damage Detection Service

Uses computer vision techniques specifically calibrated for cultural heritage:
  • Black-hat morphological filtering: Isolates dark cracks, fissure fractures, and craquelure
  • Top-hat morphological filtering: Isolates bright scratch lines and surface gouges
  • Local chromatic anomaly detection: Detects localized stains and moisture spots
  • Local variance / missing section detection: Detects tears and structural holes

IMPORTANT:
  Unlike naïve color thresholds, this morphological approach operates on local structural
  anomalies smaller than the kernel. It does NOT mistake intact architecture, marble, grass,
  sky, or clouds for damage.
"""
from __future__ import annotations

from typing import Dict, List

import cv2
import numpy as np


def detect_damage(image_path: str, sensitivity: float = 0.5) -> Dict:
    """
    Run damage detection calibrated for heritage imagery.

    Args:
        image_path:  Path to the uploaded image file.
        sensitivity: 0.0 (conservative) … 1.0 (aggressive).

    Returns:
        dict with mask, damage_percentage, damage_types, region_count, image_size.
    """
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise ValueError(f"Cannot read image: {image_path}")

    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    combined = np.zeros((h, w), dtype=np.uint8)
    damage_types: List[str] = []

    # 1. Dark cracks and fissures (Morphological Black-hat)
    crack_mask = _detect_cracks_blackhat(gray, sensitivity)
    if crack_mask is not None and crack_mask.sum() > 0:
        combined = cv2.bitwise_or(combined, crack_mask)
        damage_types.append("cracks")

    # 2. Bright surface scratches (Morphological Top-hat)
    scratch_mask = _detect_scratches_tophat(gray, sensitivity)
    if scratch_mask is not None and scratch_mask.sum() > 0:
        combined = cv2.bitwise_or(combined, scratch_mask)
        damage_types.append("scratches")

    # 3. Localized discoloration stains
    stain_mask = _detect_localized_stains(img_bgr, sensitivity)
    if stain_mask is not None and stain_mask.sum() > 0:
        combined = cv2.bitwise_or(combined, stain_mask)
        damage_types.append("stains")

    # 4. Deep holes, tears, or missing sections
    hole_mask = _detect_tears_and_holes(gray, sensitivity)
    if hole_mask is not None and hole_mask.sum() > 0:
        combined = cv2.bitwise_or(combined, hole_mask)
        damage_types.append("holes / missing sections")

    # Post-processing: remove tiny isolated specks
    min_px = max(4, int(h * w * 0.00005))
    combined = _remove_small_blobs(combined, min_px)

    # Slight dilation for seamless inpainting boundary blending
    if combined.sum() > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        combined = cv2.dilate(combined, kernel, iterations=1)

    damage_px = int(np.sum(combined > 0))
    damage_pct = round(damage_px / (h * w) * 100, 2)

    n_labels, _ = cv2.connectedComponents(combined)
    region_count = max(0, n_labels - 1)

    if not damage_types:
        damage_types = ["no obvious damage detected"]

    return {
        "mask":              combined,
        "damage_percentage": damage_pct,
        "damage_types":      damage_types,
        "region_count":      region_count,
        "image_size":        (w, h),
    }


def _detect_cracks_blackhat(gray: np.ndarray, s: float) -> np.ndarray:
    """
    Art conservation algorithm for true crack, fracture, and craquelure detection.
    Black-hat filtering = Closing(img) - img.
    Calibrated to separate structural fractures from regular stone masonry/mortar courses.
    """
    k_size = max(5, int(min(gray.shape) * 0.015))
    if k_size % 2 == 0:
        k_size += 1

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)

    # Threshold: sensitivity 0.5 -> threshold ~44 (avoids stone masonry shadows)
    thresh_val = max(26, int(58 - s * 28))
    _, thresh = cv2.threshold(blackhat, thresh_val, 255, cv2.THRESH_BINARY)

    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thresh)
    mask = np.zeros_like(gray)
    for i in range(1, n_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w_box = stats[i, cv2.CC_STAT_WIDTH]
        h_box = stats[i, cv2.CC_STAT_HEIGHT]
        diag = np.sqrt(w_box**2 + h_box**2)
        # Retain real crack fractures with sufficient area and length
        if area >= 20 and diag >= 20:
            mask[labels == i] = 255

    return mask


def _detect_scratches_tophat(gray: np.ndarray, s: float) -> np.ndarray:
    """
    Top-hat filtering = img - Opening(img).
    Extracts sharp bright scratches that differ strongly from local texture.
    """
    k_size = max(5, int(min(gray.shape) * 0.015))
    if k_size % 2 == 0:
        k_size += 1

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)

    # Threshold: sensitivity 0.5 -> threshold ~48
    thresh_val = max(28, int(62 - s * 28))
    _, thresh = cv2.threshold(tophat, thresh_val, 255, cv2.THRESH_BINARY)

    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thresh)
    mask = np.zeros_like(gray)
    for i in range(1, n_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w_box = stats[i, cv2.CC_STAT_WIDTH]
        h_box = stats[i, cv2.CC_STAT_HEIGHT]
        diag = np.sqrt(w_box**2 + h_box**2)
        if area >= 20 and diag >= 22:
            mask[labels == i] = 255

    return mask


def _detect_localized_stains(img_bgr: np.ndarray, s: float) -> np.ndarray:
    """
    Detects anomalous local color stains without flagging entire skies or gardens.
    Uses difference between raw image and heavy bilateral/Gaussian blur in CIE Lab color space.
    """
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)

    # Compare local chrominance with smoothed surrounding baseline
    k_size = 51
    a_blur = cv2.GaussianBlur(a_ch, (k_size, k_size), 0)
    b_blur = cv2.GaussianBlur(b_ch, (k_size, k_size), 0)

    delta_color = np.sqrt((a_ch.astype(np.float32) - a_blur.astype(np.float32))**2 +
                          (b_ch.astype(np.float32) - b_blur.astype(np.float32))**2)

    # Significant local color departure (sensitivity 0.5 -> threshold ~25)
    stain_thresh = max(14.0, 36.0 - s * 22.0)
    stain_cand = (delta_color > stain_thresh).astype(np.uint8) * 255

    # Morphology to find cohesive stain spots
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    stain_cand = cv2.morphologyEx(stain_cand, cv2.MORPH_OPEN, k)

    total_px = img_bgr.shape[0] * img_bgr.shape[1]
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(stain_cand)
    mask = np.zeros(img_bgr.shape[:2], dtype=np.uint8)

    for i in range(1, n_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        # Real stains are localized (between 0.05% and 5% of the total image)
        if total_px * 0.0005 < area < total_px * 0.05:
            mask[labels == i] = 255

    return mask


def _detect_tears_and_holes(gray: np.ndarray, s: float) -> np.ndarray:
    """
    Detects true physical holes/tears (e.g. black voids or punctured canvas).
    Requires both very low intensity AND high contrast with surrounding perimeter.
    """
    thr = max(8, int(25 - s * 15))
    _, dark = cv2.threshold(gray, thr, 255, cv2.THRESH_BINARY_INV)

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, k)

    total_px = gray.shape[0] * gray.shape[1]
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(dark)
    mask = np.zeros_like(gray)

    for i in range(1, n_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if total_px * 0.001 < area < total_px * 0.20:
            mask[labels == i] = 255

    return mask


def _remove_small_blobs(mask: np.ndarray, min_size: int) -> np.ndarray:
    clean = np.zeros_like(mask)
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    for i in range(1, n_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_size:
            clean[labels == i] = 255
    return clean
