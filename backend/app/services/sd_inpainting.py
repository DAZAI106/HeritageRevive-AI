"""
HeritageAI — Stable Diffusion Inpainting Service

Uses Stable Diffusion v1.5 Inpainting via HuggingFace diffusers.
Best for large missing sections where creative reconstruction is appropriate.

Model:   stable-diffusion-v1-5/stable-diffusion-inpainting
HF Token: Optional (only for first download, then cached locally)
GPU:     Strongly recommended; CPU fallback available (slow ~3–10 min)
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from PIL import Image

from app.utils.image_utils import blend_restoration

logger = logging.getLogger(__name__)

SD_MODEL_ID      = "stable-diffusion-v1-5/stable-diffusion-inpainting"
SD_INFER_SIZE    = 512   # SD v1.5 native resolution
_sd_pipeline     = None


# ── Prompt helpers ────────────────────────────────────────────────────────────

_TYPE_PROMPTS = {
    "painting":     "masterpiece painting, original artistic style, brushstrokes, museum quality, consistent colors and textures, no watermark",
    "architecture": "historical architecture, stone texture, original style, structural consistency, weathered stone, no watermark",
    "sculpture":    "historical sculpture, stone or marble texture, original sculptural style, museum quality, no watermark",
    "manuscript":   "historical manuscript, aged parchment, paper texture, visual continuity, no text, no watermark",
    "general":      "historical heritage, original style, texture consistency, museum quality, no watermark",
}

_NEGATIVE_PROMPT = (
    "modern, anachronistic, low quality, blurry, pixelated, text, "
    "watermark, signature, artificial, cartoon, painting artifacts"
)


def _build_prompt(restoration_type: str, user_prompt: Optional[str]) -> str:
    base = _TYPE_PROMPTS.get(restoration_type, _TYPE_PROMPTS["general"])
    if user_prompt and user_prompt.strip():
        return f"{user_prompt.strip()}, {base}"
    return base


# ── Pipeline loading ──────────────────────────────────────────────────────────

def _inpaint_via_colab(
    colab_url: str,
    image_path: str,
    mask_path: str,
    prompt: str,
    steps: int,
) -> Image.Image:
    """Send inpainting job to Google Colab GPU inference worker."""
    import io
    import httpx
    from app.utils.image_utils import image_to_base64

    img = Image.open(image_path).convert("RGB")
    msk = Image.open(mask_path).convert("L")

    payload = {
        "image_base64": image_to_base64(img),
        "mask_base64": image_to_base64(msk),
        "prompt": prompt,
        "steps": steps,
    }

    url = colab_url.rstrip("/") + "/inpaint"
    logger.info(f"Dispatching SD inpainting to Colab GPU: {url}")
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    import base64
    result_bytes = base64.b64decode(data["restored_image_base64"])
    return Image.open(io.BytesIO(result_bytes)).convert("RGB")


def _load_pipeline():
    import torch
    from diffusers import StableDiffusionInpaintPipeline

    global _sd_pipeline
    if _sd_pipeline is not None:
        return _sd_pipeline

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu" and os.getenv("ALLOW_SD_CPU", "0") != "1":
        raise RuntimeError(
            "Stable Diffusion requires GPU acceleration (running 4.3GB weights on CPU takes >10 minutes "
            "and exceeds system memory). To use Stable Diffusion with free GPU acceleration, open the "
            "Google Colab notebook in 'colab/HeritageAI_SD_GPU_Inference.ipynb' and set COLAB_SD_URL in backend/.env, "
            "or select the LaMa model which runs locally in ~3 seconds on CPU."
        )

    token = os.getenv("HUGGINGFACE_TOKEN", "")
    dtype = torch.float16 if device == "cuda" else torch.float32

    logger.info(f"Loading Stable Diffusion Inpainting on {device} …")
    pipe = StableDiffusionInpaintPipeline.from_pretrained(
        SD_MODEL_ID,
        torch_dtype=dtype,
        token=token if token and not token.startswith("hf_your") else None,
        safety_checker=None,
        requires_safety_checker=False,
    )

    if device == "cuda":
        pipe = pipe.to(device)
        pipe.enable_attention_slicing()
    else:
        pipe = pipe.to("cpu")

    _sd_pipeline = pipe
    logger.info("Stable Diffusion pipeline ready.")
    return pipe


# ── Public inpainting function ────────────────────────────────────────────────

def inpaint_sd(
    image_path: str,
    mask_path: str,
    restoration_type: str = "general",
    prompt: Optional[str] = None,
    num_inference_steps: int = 30,
    guidance_scale: float = 7.5,
    return_raw: bool = False,
):
    """
    Run Stable Diffusion inpainting (via Colab GPU if COLAB_SD_URL is set, or local pipeline).

    Args:
        image_path:           Path to original image.
        mask_path:            Path to binary mask (white=inpaint).
        restoration_type:     Heritage category — affects prompt.
        prompt:               Optional user guidance text.
        num_inference_steps:  More steps → better quality, slower.
        guidance_scale:       Prompt adherence strength.
        return_raw:           If True, returns tuple of (final_blended, raw_generated).

    Returns:
        PIL Image (or tuple with raw generated if return_raw=True).
    """
    image = Image.open(str(image_path)).convert("RGB")
    mask  = Image.open(str(mask_path)).convert("L")
    orig_size = image.size

    full_prompt = _build_prompt(restoration_type, prompt)

    colab_url = os.getenv("COLAB_SD_URL", "").strip()
    if colab_url:
        result_img = _inpaint_via_colab(colab_url, image_path, mask_path, full_prompt, num_inference_steps)
        if result_img.size != orig_size:
            result_img = result_img.resize(orig_size, Image.LANCZOS)
        final = blend_restoration(image, result_img, mask)
        if return_raw:
            return final, result_img
        return final

    import torch
    if not torch.cuda.is_available() and os.getenv("ALLOW_SD_CPU", "0") != "1":
        raise RuntimeError(
            "Stable Diffusion requires an NVIDIA GPU for architectural reconstruction (4.3GB model takes >10 minutes on CPU). "
            "To use Stable Diffusion with free GPU acceleration, open the Google Colab worker ('colab/HeritageAI_SD_GPU_Inference.ipynb') "
            "and configure COLAB_SD_URL in backend/.env, or select LaMa for instant local reconstruction."
        )

    pipe = _load_pipeline()

    # Resize to SD native size (512x512)
    img_r  = image.resize((SD_INFER_SIZE, SD_INFER_SIZE), Image.LANCZOS)
    msk_r  = mask.resize((SD_INFER_SIZE,  SD_INFER_SIZE),  Image.NEAREST)

    logger.info(f"SD inpainting — prompt: {full_prompt[:80]} …")

    result = pipe(
        prompt=full_prompt,
        negative_prompt=_NEGATIVE_PROMPT,
        image=img_r,
        mask_image=msk_r,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        height=SD_INFER_SIZE,
        width=SD_INFER_SIZE,
    ).images[0]

    result_orig = result.resize(orig_size, Image.LANCZOS)
    final = blend_restoration(image, result_orig, mask)
    if return_raw:
        return final, result_orig
    return final
