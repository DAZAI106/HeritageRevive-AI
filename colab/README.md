# HeritageAI — Free Google Colab GPU Stable Diffusion Worker

This guide explains how to run Stable Diffusion v1.5 Inpainting with free GPU acceleration using Google Colab and connect it to your local HeritageAI app.

## Steps:
1. Open Google Colab: https://colab.research.google.com
2. Upload the `HeritageAI_SD_GPU_Inference.ipynb` file located in this directory.
3. In Colab, go to **Runtime > Change runtime type** and select **T4 GPU** (free tier).
4. Run all cells in the notebook.
5. The notebook will print a public URL (e.g. `https://xxxx.loca.lt` or `https://xxxx.ngrok-free.app`).
6. Copy that URL into your `backend/.env` file:
   ```env
   COLAB_SD_URL=https://xxxx.loca.lt
   ```
7. When you click **Restore** with **Stable Diffusion** in HeritageAI, requests will be automatically processed on the free Colab GPU in ~2 seconds!
