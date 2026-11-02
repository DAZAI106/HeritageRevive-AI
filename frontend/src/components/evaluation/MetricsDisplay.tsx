/**
 * HeritageAI — Metrics Display Component
 * Shows PSNR and SSIM results with gauge visualizations and explanations.
 */
import { motion } from 'framer-motion'
import { BarChart2, Info, TrendingUp } from 'lucide-react'
import type { EvaluationMetrics } from '../../store/restorationStore'

interface Props {
  metrics: EvaluationMetrics
}

function GaugeChart({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const color =
    pct >= 80 ? '#4A7C59' :    // forest green
    pct >= 50 ? '#C9A84C' :    // gold
    '#8B2E2E'                  // crimson

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#E8E0D0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold font-display" style={{ color }}>{value === Infinity ? '∞' : value.toFixed(2)}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider">{unit}</p>
        </div>
      </div>
      <p className="text-sm font-medium mt-2">{label}</p>
    </div>
  )
}

export default function MetricsDisplay({ metrics }: Props) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    >
      {/* ── Mode explanation ──────────────────────────────────── */}
      <div className="card bg-gold/5 border-gold/20">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-gold mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium mb-1">Evaluation Mode: {metrics.mode === 'reference' ? 'A — Reference-based' : 'B — Simulated Damage'}</p>
            <p className="text-xs text-muted leading-relaxed">{metrics.mode_explanation}</p>
          </div>
        </div>
      </div>

      {/* ── Gauges ────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 size={18} className="text-gold" />
          <h3 className="font-display font-bold text-lg">Quality Metrics</h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-12">
          {metrics.psnr != null && (
            <GaugeChart value={metrics.psnr} max={50} label="PSNR" unit="dB" />
          )}
          {metrics.ssim != null && (
            <GaugeChart value={metrics.ssim * 100} max={100} label="SSIM" unit="%" />
          )}
        </div>

        {/* ── Interpretations ─────────────────────────────────── */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {metrics.psnr != null && (
            <div className="p-4 rounded-xl bg-parchment/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-gold" />
                <p className="text-sm font-medium">PSNR: {metrics.psnr === Infinity ? '∞' : metrics.psnr.toFixed(2)} dB</p>
              </div>
              <p className="text-xs text-muted">{metrics.psnr_interpretation}</p>
            </div>
          )}
          {metrics.ssim != null && (
            <div className="p-4 rounded-xl bg-parchment/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-gold" />
                <p className="text-sm font-medium">SSIM: {metrics.ssim.toFixed(4)}</p>
              </div>
              <p className="text-xs text-muted">{metrics.ssim_interpretation}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Formulas ──────────────────────────────────────────── */}
      <div className="card">
        <h4 className="font-display font-bold text-sm mb-3">About These Metrics</h4>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-muted leading-relaxed">
          <div>
            <p className="font-medium text-charcoal mb-1">PSNR (Peak Signal-to-Noise Ratio)</p>
            <p>Measures pixel-level reconstruction error. Higher = better. Range: 20–50 dB typically. Above 40 dB is excellent.</p>
          </div>
          <div>
            <p className="font-medium text-charcoal mb-1">SSIM (Structural Similarity Index)</p>
            <p>Measures structural similarity in luminance, contrast, and structure. Range: 0–1. Above 0.85 is high similarity.</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
