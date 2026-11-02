/**
 * HeritageAI — About Project Page
 */
import { motion } from 'framer-motion'
import {
  Landmark, BrainCircuit, Layers, Code, FileText, AlertTriangle
} from 'lucide-react'

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function About() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title">About HeritageAI</h1>
        <p className="section-subtitle mt-1">AI-Powered Reconstruction of Lost or Damaged Heritage</p>
      </div>

      <motion.div className="space-y-6" initial="hidden" animate="visible">
        {/* Mission */}
        <motion.div variants={fadeUp} custom={0} className="card">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">Project Objective</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Historical monuments, paintings, manuscripts, and artifacts suffer damage from natural aging,
            environmental conditions, disasters, and human activities. HeritageAI is an AI-powered digital
            restoration platform that accepts damaged heritage images, analyzes the damage, and reconstructs
            missing or deteriorated regions using deep learning — while preserving the original artistic style,
            textures, and structural appearance.
          </p>
        </motion.div>

        {/* Tech stack */}
        <motion.div variants={fadeUp} custom={1} className="card">
          <div className="flex items-center gap-2 mb-3">
            <Code size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">Technology Stack</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Frontend</h3>
              <ul className="text-muted space-y-0.5">
                <li>React 18 + TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Framer Motion</li>
                <li>Lucide React Icons</li>
                <li>Recharts / React Compare Slider</li>
                <li>Zustand (state management)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Backend</h3>
              <ul className="text-muted space-y-0.5">
                <li>Python + FastAPI</li>
                <li>OpenCV + Pillow + NumPy</li>
                <li>scikit-image (PSNR/SSIM)</li>
                <li>SQLAlchemy + SQLite</li>
                <li>PyTorch (LaMa inference)</li>
                <li>HuggingFace Diffusers (SD)</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* AI Models */}
        <motion.div variants={fadeUp} custom={2} className="card">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">AI Models</h2>
          </div>
          <div className="space-y-3 text-sm text-muted">
            <div>
              <strong className="text-charcoal">LaMa (Large Mask Inpainting)</strong> — Primary model.
              Uses Fast Fourier Convolutions for global structure awareness. Excels at restoring
              repeating patterns (brick, tile, fabric), thin cracks, and moderate missing sections.
              Free, local, no prompt needed.
            </div>
            <div>
              <strong className="text-charcoal">Stable Diffusion v1.5 Inpainting</strong> — Optional.
              Prompt-guided creative reconstruction for large missing sections.
              Uses diffusion-based generative AI for context-aware fills.
            </div>
            <div>
              <strong className="text-charcoal">Classical OpenCV Inpainting</strong> — Fallback.
              Telea/Navier-Stokes algorithms. Instant, no GPU, always available.
              Best for thin scratches and small regions.
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div variants={fadeUp} custom={3} className="card">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">Quality Evaluation</h2>
          </div>
          <div className="text-sm text-muted space-y-2">
            <p><strong className="text-charcoal">PSNR (Peak Signal-to-Noise Ratio):</strong> Measures pixel-level reconstruction error. Higher dB = better. Typical range: 20–50 dB.</p>
            <p><strong className="text-charcoal">SSIM (Structural Similarity Index):</strong> Measures structural similarity in luminance, contrast, and structure. Range: 0–1 (1 = perfect match).</p>
            <p>Both require a reference (ground-truth) image. Two evaluation modes are provided: reference-based (Mode A) and simulated damage (Mode B).</p>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div variants={fadeUp} custom={4} className="card bg-gold/5 border-gold/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">Important Disclaimer</h2>
          </div>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            <li>AI-generated reconstructions are <strong>interpretations</strong>, not proof of historical accuracy.</li>
            <li>Reconstructed regions are clearly labeled and the original image is preserved unchanged.</li>
            <li>Automatic damage detection is an estimate — manual mask editing is recommended.</li>
            <li>Text in reconstructed manuscript regions is NOT historically accurate.</li>
            <li>This is an academic engineering project for demonstrating AI restoration capabilities.</li>
          </ul>
        </motion.div>

        {/* Attribution */}
        <motion.div variants={fadeUp} custom={5} className="card">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={20} className="text-gold" />
            <h2 className="font-display text-xl font-bold">Dataset & Attribution</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Sample heritage images are sourced from public-domain collections including Wikimedia Commons
            and museum open-access programs. The LaMa model weights are from the
            <a href="https://huggingface.co/smartywu/big-lama" className="text-gold hover:underline" target="_blank" rel="noreferrer"> smartywu/big-lama</a> repository
            on HuggingFace. Stable Diffusion Inpainting weights are from the
            <a href="https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-inpainting" className="text-gold hover:underline" target="_blank" rel="noreferrer"> SD v1.5 Inpainting</a> repository.
            All dataset and model licenses are respected.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
