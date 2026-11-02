/**
 * HeritageAI — Before / After Comparison Component
 *
 * Provides:
 *  1. Interactive split slider
 *  2. 3-way side-by-side view (Original, Damage Mask, Restored) at identical dimensions
 *  3. Sharpness score comparison (Laplacian edge energy)
 *  4. Direct full-resolution PNG download
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { Columns, SlidersHorizontal, ZoomIn, ZoomOut, Sparkles, Download, Layers } from 'lucide-react'
import clsx from 'clsx'
import { triggerDownload } from '../../services/api'

interface Props {
  originalUrl: string
  restoredUrl: string
  maskUrl?: string
  maskOverlayUrl?: string | null
  rawOutputUrl?: string | null
  restorationId?: string
  originalSharpness?: number | null
  restoredSharpness?: number | null
}

export default function BeforeAfter({
  originalUrl,
  restoredUrl,
  maskUrl,
  maskOverlayUrl,
  rawOutputUrl,
  restorationId,
  originalSharpness,
  restoredSharpness,
}: Props) {
  const [viewMode, setViewMode] = useState<'slider' | 'diagnostic' | 'side'>('diagnostic')
  const [zoom, setZoom] = useState(1)

  return (
    <div className="space-y-4">
      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <button
            onClick={() => setViewMode('diagnostic')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'diagnostic' ? 'bg-gold text-white shadow-sm' : 'text-muted hover:bg-parchment'
            )}
          >
            <Layers size={14} /> Diagnostic View (4-Panel)
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'slider' ? 'bg-gold text-white shadow-sm' : 'text-muted hover:bg-parchment'
            )}
          >
            <SlidersHorizontal size={14} /> Split Slider
          </button>
          <button
            onClick={() => setViewMode('side')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'side' ? 'bg-gold text-white shadow-sm' : 'text-muted hover:bg-parchment'
            )}
          >
            <Columns size={14} /> Side-by-Side
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="btn-ghost p-1.5" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="btn-ghost p-1.5" title="Zoom In">
            <ZoomIn size={16} />
          </button>

          {restorationId && (
            <button
              onClick={() => triggerDownload(restorationId, 'result')}
              className="btn-primary text-xs py-1.5 px-3 ml-2 flex items-center gap-1.5"
            >
              <Download size={13} /> Full PNG
            </button>
          )}
        </div>
      </div>

      {/* ── Sharpness Metric Bar ───────────────────────────────── */}
      {(originalSharpness != null || restoredSharpness != null) && (
        <div className="card p-3 bg-white border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted">
            <Sparkles size={14} className="text-gold" />
            <span>Edge Sharpness Metric (Laplacian variance):</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>Original: <strong>{originalSharpness ?? 'N/A'}</strong></span>
            <span>Restored: <strong className="text-accent-forest">{restoredSharpness ?? 'N/A'}</strong></span>
          </div>
        </div>
      )}

      {/* ── Main Comparison Display ────────────────────────────── */}
      <motion.div
        className="card p-0 overflow-hidden bg-parchment/20 border border-border rounded-xl"
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {viewMode === 'slider' && (
          <div className="slider-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original Image" />}
              itemTwo={<ReactCompareSliderImage src={restoredUrl} alt="Restored Image" />}
              position={50}
              style={{ width: '100%', height: 'auto', maxHeight: '72vh' }}
            />
          </div>
        )}

        {viewMode === 'diagnostic' && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-heritage-900/5"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {/* 1. Original */}
            <div className="flex flex-col rounded-lg overflow-hidden border border-border bg-white shadow-sm">
              <div className="px-3 py-1.5 bg-parchment text-xs font-semibold text-charcoal border-b border-border flex justify-between">
                <span>1. Original Damaged</span>
                <span className="text-muted font-normal">Native</span>
              </div>
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden">
                <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* 2. Mask Overlay */}
            <div className="flex flex-col rounded-lg overflow-hidden border border-border bg-white shadow-sm">
              <div className="px-3 py-1.5 bg-parchment text-xs font-semibold text-charcoal border-b border-border flex justify-between">
                <span>2. Mask Overlay</span>
                <span className="text-accent-crimson font-medium">Red = Missing Area</span>
              </div>
              <div className="aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
                <img src={maskOverlayUrl || maskUrl} alt="Mask Overlay" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* 3. Raw AI Generated */}
            <div className="flex flex-col rounded-lg overflow-hidden border border-border bg-white shadow-sm">
              <div className="px-3 py-1.5 bg-parchment text-xs font-semibold text-charcoal border-b border-border flex justify-between">
                <span>3. Raw AI Output</span>
                <span className="text-muted font-normal">Unblended Neural Net</span>
              </div>
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden">
                <img src={rawOutputUrl || restoredUrl} alt="Raw AI Output" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* 4. Final Preserved Composite */}
            <div className="flex flex-col rounded-lg overflow-hidden border border-gold/50 bg-white shadow-sm ring-2 ring-gold/40">
              <div className="px-3 py-1.5 bg-gold/15 text-xs font-semibold text-charcoal border-b border-gold/30 flex justify-between">
                <span className="text-charcoal font-bold">4. Final Composite</span>
                <span className="badge-gold text-[10px]">Restored</span>
              </div>
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden">
                <img src={restoredUrl} alt="Restored Composite" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'side' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-heritage-900/5"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <div className="flex flex-col rounded-lg overflow-hidden border border-border bg-white shadow-sm">
              <div className="px-3 py-1.5 bg-parchment text-xs font-semibold text-charcoal border-b border-border">
                Original Input
              </div>
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden">
                <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="flex flex-col rounded-lg overflow-hidden border border-gold/40 bg-white shadow-sm ring-1 ring-gold/30">
              <div className="px-3 py-1.5 bg-gold/15 text-xs font-semibold text-charcoal border-b border-gold/30 flex justify-between">
                <span>Restored Output</span>
                <span className="badge-gold text-[10px]">AI Restored</span>
              </div>
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden">
                <img src={restoredUrl} alt="Restored" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Subtitle hints ────────────────────────────────────── */}
      {viewMode === 'slider' && (
        <div className="flex justify-between text-xs text-muted px-2">
          <span>← Original</span>
          <span>Drag slider to compare sharpness</span>
          <span>Restored →</span>
        </div>
      )}
    </div>
  )
}
