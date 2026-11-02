# HeritageAI — AI-Powered Reconstruction of Lost or Damaged Heritage

A complete web application for digitally restoring damaged historical monuments, paintings,
sculptures, manuscripts, and other cultural heritage images using AI-based image inpainting.

![HeritageAI](https://img.shields.io/badge/HeritageAI-Restoration_Platform-C9A84C?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖼️ Image Upload | Drag-and-drop, validation, preview with metadata |
| 🔍 Damage Detection | OpenCV multi-technique analysis (cracks, scratches, stains, fading, holes) |
| 🎨 Manual Mask Editor | HTML5 Canvas brush/eraser with undo, zoom, adjustable size |
| 🤖 AI Inpainting | LaMa (primary), Stable Diffusion (optional), OpenCV (fallback) |
| ⚖️ Before/After | Interactive slider + side-by-side comparison |
| 📊 Quality Metrics | PSNR & SSIM with Mode A (reference) and Mode B (simulated) |
| 📥 Download & Export | Restored image, mask, JSON report |
| 📋 History | SQLite-backed restoration log with statistics |
| 🖥️ Dashboard | Real-time aggregate statistics from the database |

---

## 🏗️ Architecture

```
React + Vite + TypeScript + Tailwind  ──(REST API)──>  FastAPI + Python
                                                         ├── LaMa (primary, local, free)
                                                         ├── Stable Diffusion (optional)
                                                         ├── OpenCV (fallback)
                                                         └── SQLite (history)
```

---

## 🚀 Getting Started (Windows)

### Prerequisites

- **Python 3.10+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Git** (optional)

### 1. Clone / Extract

```powershell
cd C:\Users\sk\.gemini\antigravity\scratch\heritageai
```

### 2. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
copy .env.example .env

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend runs at **http://localhost:8000**.
API docs at **http://localhost:8000/docs**.

> **First run note:** LaMa model weights (~107 MB) are automatically downloaded
> from HuggingFace on the first restoration request. Internet required once.

### 3. Frontend Setup

Open a **new terminal**:

```powershell
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies API calls to the backend.

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload image (multipart/form-data) |
| `POST` | `/api/analyze-damage` | Run damage detection |
| `POST` | `/api/restore` | Run AI inpainting |
| `POST` | `/api/evaluate` | Calculate PSNR/SSIM |
| `GET`  | `/api/history` | Paginated restoration list |
| `GET`  | `/api/restoration/{id}` | Single restoration details |
| `GET`  | `/api/download/{id}/{type}` | Download result/mask/original/report |
| `GET`  | `/api/models` | Available AI models + GPU status |
| `GET`  | `/api/health` | Health check |

Full interactive docs: **http://localhost:8000/docs**

---

## 🤖 AI Models

### LaMa (Primary — Recommended)

- **Paper:** Large Mask Inpainting with Fourier Convolutions (2022)
- **Weights:** `smartywu/big-lama` on HuggingFace (~107 MB)
- **Best for:** Structural repair, repeating patterns, cracks, scratches
- **Requirements:** Python, PyTorch (CPU or GPU)
- **Cost:** Free forever

### Stable Diffusion v1.5 Inpainting (Optional)

- **Weights:** `stable-diffusion-v1-5/stable-diffusion-inpainting` (~4 GB)
- **Best for:** Large missing sections with prompt-guided reconstruction
- **Requirements:** HuggingFace token (free), GPU strongly recommended
- **Cost:** Free (local inference)

### Classical OpenCV (Fallback)

- **Algorithm:** Telea (Fast Marching) / Navier-Stokes
- **Best for:** Thin scratches, small holes
- **Requirements:** None beyond OpenCV
- **Cost:** Free, instant

---

## 📊 Quality Metrics

### PSNR (Peak Signal-to-Noise Ratio)
Measures pixel-level reconstruction error. Higher dB = better quality.
- 40+ dB: Excellent
- 30–40 dB: Good
- 20–30 dB: Moderate

### SSIM (Structural Similarity Index)
Measures structural similarity. Range 0–1 (1 = perfect).
- 0.95+: Near-perfect
- 0.85+: High similarity
- 0.70+: Good

### Evaluation Modes

| Mode | How It Works | When to Use |
|---|---|---|
| **A (Reference)** | Upload undamaged original → compare vs restored | When you have the undamaged version |
| **B (Simulated)** | Apply synthetic damage → restore → compare vs original | To test the AI model's capability |

> ⚠️ Comparing restored vs damaged input does NOT measure quality. Both modes use a valid reference.

---

## 📁 Project Structure

```
heritageai/
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/          # Landing, Dashboard, Restoration, Evaluation, History, About
│   │   ├── components/     # upload/, editor/, comparison/, evaluation/, layout/
│   │   ├── services/       # Axios API layer
│   │   └── store/          # Zustand state management
│   └── package.json
├── backend/                # FastAPI + Python
│   ├── app/
│   │   ├── api/            # Endpoint routers
│   │   ├── services/       # AI models, detection, metrics, reports
│   │   ├── models/         # Pydantic schemas
│   │   ├── db/             # SQLite + SQLAlchemy
│   │   └── utils/          # File handling, image processing
│   ├── storage/            # Uploaded/generated files
│   ├── weights/            # Cached model weights
│   └── requirements.txt
└── README.md
```

---

## ⚠️ Important Disclaimer

- AI-generated reconstructions are **interpretations**, not proof of historical accuracy.
- Reconstructed regions are labeled and the original image is always preserved unchanged.
- Automatic damage detection is an estimate — manual mask editing is recommended.
- Text in AI-reconstructed manuscript regions is **NOT** historically accurate.
- This is an academic engineering project for demonstrating AI restoration capabilities.

---

## 🔐 Security

- File type and size validation on every upload
- UUID-based filenames prevent path traversal
- API keys stored in environment variables, never in frontend code
- CORS configured for development origins
- Temporary files cleaned up automatically

---

## 📜 License

Academic project. Sample images from public-domain sources (Wikimedia Commons, museum open access).
LaMa and Stable Diffusion model weights are subject to their respective licenses.

---

## 🙏 Acknowledgments

- **LaMa** — Roman Suvorov et al., "Resolution-robust Large Mask Inpainting with Fourier Convolutions"
- **Stable Diffusion** — Stability AI / CompVis / Runway ML
- **OpenCV** — Open Source Computer Vision Library
- **FastAPI** — Sebastián Ramírez
- **React** — Meta / Facebook
