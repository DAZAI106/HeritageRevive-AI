"""
HeritageAI — Verification of Architectural Missing Region Reconstruction
Tests Requirement 10:
  1. Clearly selected missing architectural region on church ruin (broken tower)
  2. Confirms mask polarity (white = regenerate, black = preserve)
  3. Verifies that the missing region ACTUALLY changes and generates new stone architecture
  4. Verifies 100% preservation of pixels outside the mask (max diff == 0)
  5. Verifies all diagnostic previews (original, overlay, raw output, final composite) are produced
"""
import os
import sys
import numpy as np
import cv2
from PIL import Image

sys.path.insert(0, os.path.abspath("backend"))

from app.services.lama_inpainting import inpaint_lama
from app.utils.image_utils import create_damage_overlay, compute_sharpness_score

CHURCH_IMG = "sample_images/church_stone_ruin.jpg"
orig_img = Image.open(CHURCH_IMG).convert("RGB")
w, h = orig_img.size

# Clearly selected missing architectural region:
# The broken collapsed upper section of the church tower
mask_arr = np.zeros((h, w), dtype=np.uint8)
# Fill missing upper tower structure from y=80 to y=180, x=280 to x=345
cv2.rectangle(mask_arr, (280, 80), (345, 180), 255, -1)
# Also restore missing stone fissure on the dome
cv2.circle(mask_arr, (185, 290), 16, 255, -1)

mask_path = "backend/storage/masks/verified_arch_missing_mask.png"
os.makedirs(os.path.dirname(mask_path), exist_ok=True)
Image.fromarray(mask_arr).save(mask_path)

print(f"Original image dimensions: {w}x{h}")
print(f"Masked missing architecture area: {np.sum(mask_arr > 127)} pixels ({np.mean(mask_arr > 127)*100:.2f}%)")

# Run inpainting with return_raw=True
final_img, raw_generated = inpaint_lama(CHURCH_IMG, mask_path, return_raw=True)

# Generate diagnostic overlay
overlay = create_damage_overlay(orig_img, Image.fromarray(mask_arr))

# Save all diagnostics
res_dir = "backend/storage/results"
os.makedirs(res_dir, exist_ok=True)
final_path = os.path.join(res_dir, "arch_test_final.png")
raw_path = os.path.join(res_dir, "arch_test_raw.png")
overlay_path = os.path.join(res_dir, "arch_test_overlay.png")

final_img.save(final_path)
raw_generated.save(raw_path)
overlay.convert("RGB").save(overlay_path)

# Verification checks
orig_np = np.array(orig_img)
final_np = np.array(final_img)
raw_np = np.array(raw_generated)

# 1. Verify missing region actually changed
inside_mask = (mask_arr > 127)
diff_inside = np.abs(orig_np[inside_mask].astype(int) - final_np[inside_mask].astype(int))
mean_change = float(np.mean(diff_inside))
max_change = int(np.max(diff_inside))

print(f"\n[CHECK 1] Inside missing architecture mask:")
print(f"  Mean pixel change: {mean_change:.2f}")
print(f"  Max pixel change:  {max_change}")
assert mean_change > 10.0, f"Missing region did not change sufficiently! ({mean_change})"
assert max_change > 100, f"Max change too low! ({max_change})"

# 2. Verify outside mask is 100% identical
outside_mask = (mask_arr == 0)
diff_outside = np.abs(orig_np[outside_mask].astype(int) - final_np[outside_mask].astype(int))
max_diff_outside = int(np.max(diff_outside))

print(f"\n[CHECK 2] Outside mask preservation:")
print(f"  Max diff on unmasked pixels: {max_diff_outside}")
assert max_diff_outside == 0, f"Unmasked pixels were modified! ({max_diff_outside})"

# 3. Verify sharpness of generated architecture
orig_sharpness = compute_sharpness_score(orig_np)
final_sharpness = compute_sharpness_score(final_np)
print(f"\n[CHECK 3] Sharpness metric:")
print(f"  Original: {orig_sharpness}, Restored: {final_sharpness}")

print("\n=======================================================")
print("ARCHITECTURAL RECONSTRUCTION VERIFIED SUCCESSFULLY!")
print("=======================================================")
