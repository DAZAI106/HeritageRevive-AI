/**
 * HeritageAI — Landing Page
 * Museum-inspired, professional design with hero section, How It Works,
 * Features, AI explanation, sample restorations, and footer.
 */
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Landmark, Upload, ScanSearch, Wand2, ImageDown, ArrowRight,
  BrainCircuit, Layers, Shield, Sparkles, Eye, Download,
  Github, Mail, ChevronRight
} from 'lucide-react'

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ivory">
      {/* ═══════ NAVBAR ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-ivory/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
              <Landmark size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-charcoal">HeritageAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-muted hover:text-charcoal transition-colors">How It Works</a>
            <a href="#features" className="text-sm text-muted hover:text-charcoal transition-colors">Features</a>
            <a href="#technology" className="text-sm text-muted hover:text-charcoal transition-colors">Technology</a>
          </div>
          <button onClick={() => navigate('/restore')} className="btn-primary text-sm">
            Start Restoring <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-dark-gradient opacity-[0.03]" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-heritage-200/30 rounded-full blur-3xl" />

        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 rounded-full text-gold text-sm font-medium mb-8 border border-gold/20">
            <Sparkles size={14} />
            AI-Powered Digital Heritage Restoration
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-charcoal leading-tight mb-6">
            Restoring History Through{' '}
            <span className="bg-clip-text text-transparent bg-gold-gradient">
              Artificial Intelligence
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload damaged heritage images — monuments, paintings, manuscripts, sculptures — and
            let advanced AI reconstruct missing and deteriorated regions while preserving
            authentic historical character.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/restore')} className="btn-primary text-lg px-8 py-4">
              <Wand2 size={20} /> Start Restoration
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary text-lg px-8 py-4">
              Open Dashboard
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="py-24 px-6 bg-parchment/50">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Process</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="section-title mb-4">How It Works</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="section-subtitle max-w-xl mx-auto">
              Four straightforward steps from damaged image to AI-restored heritage.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-4 gap-8"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {[
              { icon: Upload,     title: 'Upload',   desc: 'Upload your damaged heritage photograph, painting, or manuscript scan.' },
              { icon: ScanSearch, title: 'Analyze',   desc: 'AI detects cracks, scratches, stains, fading, and missing sections automatically.' },
              { icon: Wand2,      title: 'Restore',   desc: 'Deep learning inpainting reconstructs damaged regions while preserving authentic style.' },
              { icon: ImageDown,  title: 'Download',  desc: 'Compare before / after, evaluate with PSNR & SSIM, and download results.' },
            ].map((step, i) => (
              <motion.div key={step.title} variants={fadeUp} custom={i} className="card-hover text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <step.icon size={24} className="text-gold" />
                </div>
                <p className="text-xs text-gold font-semibold uppercase tracking-widest mb-2">Step {i + 1}</p>
                <h3 className="font-display text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Capabilities</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="section-title mb-4">Key Features</motion.h2>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-6" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { icon: BrainCircuit, title: 'AI Inpainting',            desc: 'LaMa and Stable Diffusion models reconstruct missing regions with contextual awareness.' },
              { icon: Layers,       title: 'Multi-Type Detection',     desc: 'Detects cracks, scratches, stains, fading, holes, and missing sections automatically.' },
              { icon: Eye,          title: 'Interactive Mask Editor',  desc: 'Brush / eraser tool with zoom, undo, and adjustable size for precise region selection.' },
              { icon: Sparkles,     title: 'Style Preservation',       desc: 'Preserves original textures, brushstrokes, stone patterns, and color palettes.' },
              { icon: Shield,       title: 'Original Preserved',       desc: 'The uploaded image is never altered. AI changes only the masked regions.' },
              { icon: Download,     title: 'Reports & Metrics',        desc: 'PSNR, SSIM evaluation, downloadable restored images, masks, and JSON reports.' },
            ].map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i} className="card-hover">
                <f.icon size={22} className="text-gold mb-3" />
                <h3 className="font-display text-lg font-bold mb-1">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ TECHNOLOGY ═══════ */}
      <section id="technology" className="py-24 px-6 bg-parchment/50">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Under the Hood</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="section-title mb-4">AI Technology</motion.h2>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-6" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { title: 'LaMa', badge: 'Primary', desc: 'Large Mask Inpainting with Fast Fourier Convolutions. Excels at structural repair — brick patterns, decorative borders, architectural textures. Free, local, no prompt needed.' },
              { title: 'Stable Diffusion', badge: 'Optional', desc: 'Prompt-guided diffusion model for creative reconstruction of large missing sections. Ideal when context is insufficient for pure texture repair.' },
              { title: 'OpenCV Classical', badge: 'Fallback', desc: 'Telea / Navier-Stokes algorithms for instant inpainting of small scratches. Always available, zero downloads, clearly labeled.' },
            ].map((m, i) => (
              <motion.div key={m.title} variants={fadeUp} custom={i} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-display text-lg font-bold">{m.title}</h3>
                  <span className="badge-gold">{m.badge}</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="mt-8 card bg-gold/5 border-gold/20"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            <p className="text-sm text-muted leading-relaxed">
              <strong className="text-charcoal">⚠️ Important:</strong>{' '}
              AI-generated reconstructions are <strong>interpretations</strong>, not proof of historical accuracy.
              Reconstructed regions are clearly labeled, and the original uploaded image is always preserved unchanged.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="section-title mb-4">Ready to Restore Heritage?</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="section-subtitle mb-8">
            Upload a damaged historical image and see AI reconstruction in action.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <button onClick={() => navigate('/restore')} className="btn-primary text-lg px-10 py-4">
              Launch Restoration Workspace <ChevronRight size={20} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-charcoal text-heritage-400 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Landmark size={20} className="text-gold" />
            <p className="font-display text-white text-lg font-bold">HeritageAI</p>
          </div>
          <p className="text-sm text-center">
            AI-Powered Reconstruction of Lost or Damaged Heritage · Academic Engineering Project
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:contact@heritageai.dev" className="hover:text-white transition-colors"><Mail size={18} /></a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Github size={18} /></a>
          </div>
        </div>
      </footer>
    </div>
  )
}
