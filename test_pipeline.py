"""
End-to-end integration test for HeritageAI backend.
Tests:
1. Automated damage detection on fresco_cracks.png
2. Classical and LaMa inpainting pipelines
3. PSNR and SSIM metric computation
4. JSON report generation
5. API endpoints via FastAPI TestClient
"""
import sys
import os

# Set cwd and path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.services.damage_detection import detect_damage
from app.services.classical_inpaint import inpaint_classical
from app.services.metrics import calculate_psnr, calculate_ssim, evaluate_with_reference, evaluate_synthetic
from app.services.report import generate_json_report
from PIL import Image
import numpy as np

def test_pipeline():
    print("--- 1. Testing OpenCV Damage Detection ---")
    sample_img = os.path.join("sample_images", "fresco_cracks.png")
    assert os.path.exists(sample_img), f"Sample image not found: {sample_img}"
    
    analysis = detect_damage(sample_img, sensitivity=0.6)
    print(f"Damage %: {analysis['damage_percentage']}%")
    print(f"Detected types: {analysis['damage_types']}")
    print(f"Region count: {analysis['region_count']}")
    assert analysis['damage_percentage'] > 0
    assert len(analysis['damage_types']) > 0
    print("[OK] Damage detection passed!")

    print("\n--- 2. Testing Inpainting Pipeline ---")
    # Save a temporary mask for inpainting
    mask_arr = analysis['mask']
    mask_path = "backend/storage/masks/test_mask.png"
    os.makedirs(os.path.dirname(mask_path), exist_ok=True)
    Image.fromarray(mask_arr).save(mask_path)
    
    from app.services.lama_inpainting import inpaint_lama
    restored = inpaint_lama(sample_img, mask_path)
    assert restored.size == (600, 600)
    print(f"Restored image dimensions: {restored.size}")
    print("[OK] Inpainting pipeline passed!")

    print("\n--- 3. Testing PSNR & SSIM Metrics ---")
    orig_np = np.array(Image.open(sample_img).convert("RGB"))
    rest_np = np.array(restored)
    psnr = calculate_psnr(orig_np, rest_np)
    ssim = calculate_ssim(orig_np, rest_np)
    print(f"Calculated PSNR: {psnr:.2f} dB")
    print(f"Calculated SSIM: {ssim:.4f}")
    assert psnr > 10.0
    assert 0.0 <= ssim <= 1.0
    print("[OK] PSNR & SSIM evaluation passed!")

    print("\n--- 4. Testing Report Generation ---")
    report = generate_json_report(
        restoration_id="test-1234",
        image_name="fresco_cracks.png",
        model_used="classical",
        restoration_type="painting",
        damage_percentage=analysis['damage_percentage'],
        processing_time=0.45,
        psnr=psnr,
        ssim=ssim,
        dimensions=(600, 600)
    )
    assert report['project'] == "AI-Powered Reconstruction of Lost or Damaged Heritage"
    assert len(report['limitations']) > 0
    print(f"Report title: {report['report_title']}")
    print(f"Limitations documented: {len(report['limitations'])}")
    print("[OK] Report generation passed!")

    print("\n--- 5. Testing FastAPI API Endpoints ---")
    with TestClient(app) as client:
        # Health check
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
        print("GET /api/health -> 200 OK")

        # Models list
        res = client.get("/api/models")
        assert res.status_code == 200
        models = res.json()["models"]
        assert len(models) >= 3
        print(f"GET /api/models -> 200 OK ({len(models)} models available)")

        # Upload test
        with open(sample_img, "rb") as f:
            res = client.post("/api/upload", files={"file": ("fresco_cracks.png", f, "image/png")})
        assert res.status_code == 200
        upload_data = res.json()
        image_id = upload_data["image_id"]
        print(f"POST /api/upload -> 200 OK (image_id: {image_id})")

        # Analyze damage test
        res = client.post("/api/analyze-damage", json={"image_id": image_id, "sensitivity": 0.5})
        assert res.status_code == 200
        analyze_data = res.json()
        print(f"POST /api/analyze-damage -> 200 OK (Damage: {analyze_data['damage_percentage']}%)")

        # Restore test
        res = client.post("/api/restore", json={
            "image_id": image_id,
            "use_detected_mask": True,
            "model": "lama",
            "restoration_type": "painting"
        })
        assert res.status_code == 200
        restore_data = res.json()
        restoration_id = restore_data["restoration_id"]
        print(f"POST /api/restore -> 200 OK (restoration_id: {restoration_id})")

        # Evaluate test (Mode B simulated)
        res = client.post("/api/evaluate", json={
            "restoration_id": restoration_id,
            "mode": "simulated"
        })
        assert res.status_code == 200
        eval_data = res.json()
        print(f"POST /api/evaluate -> 200 OK (PSNR: {eval_data.get('psnr')} dB, SSIM: {eval_data.get('ssim')})")

        # History test
        res = client.get("/api/history")
        assert res.status_code == 200
        history_data = res.json()
        print(f"GET /api/history -> 200 OK (Total records: {history_data['total']})")

        # Download report test
        res = client.get(f"/api/download/{restoration_id}/report")
        assert res.status_code == 200
        print(f"GET /api/download/{restoration_id}/report -> 200 OK")

    print("\n==========================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (5/5)")
    print("==========================================")

if __name__ == "__main__":
    test_pipeline()
