/**
 * HeritageAI — Restoration Workspace Page
 *
 * This is the main workspace that ties all modules together:
 *   upload → analyze → mask editor → restore → compare → evaluate → download
 *
 * Uses a step-based workflow driven by the Zustand store.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, ScanSearch, Paintbrush, Wand2, GitCompare,
  BarChart2, Download, ChevronRight, AlertTriangle,
  Settings2, Sparkles, RefreshCw, FileText
} from 'lucide-react'
import clsx from 'clsx'

import { useRestorationStore, type RestorationMode } from '../store/restorationStore'
import { analyzeImage, restoreImage, evaluateRestoration, triggerDownload } from '../services/api'
import ImageUploader   from '../components/upload/ImageUploader'
import MaskEditor      from '../components/editor/MaskEditor'
import BeforeAfter     from '../components/comparison/BeforeAfter'
import MetricsDisplay  from '../components/evaluation/MetricsDisplay'

const STEPS: { id: RestorationMode; label: string; icon: typeof Upload }[] = [
  { id: 'upload',   label: 'Upload',   icon: Upload },
  { id: 'analyze',  label: 'Analyze',  icon: ScanSearch },
  { id: 'mask',     label: 'Mask',     icon: Paintbrush },
  { id: 'restore',  label: 'Restore',  icon: Wand2 },
  { id: 'compare',  label: 'Compare',  icon: GitCompare },
  { id: 'evaluate', label: 'Evaluate', icon: BarChart2 },
]

export default function Restoration() {
  const store = useRestorationStore()
  const {
    currentMode, setMode, status, errorMessage, setStatus,
    uploadedImage, damageAnalysis, setDamageAnalysis,
    manualMaskData, restorationResult, setRestorationResult,
    metrics, setMetrics,
    selectedModel, setModel, restorationType, setRestorationType,
    prompt, setPrompt, quality, setQuality,
  } = store

  const [sensitivity, setSensitivity] = useState(0.5)

  // ── Step availability check ────────────────────────────────────────────────
  const isStepAvailable = (id: RestorationMode) => {
    if (id === 'upload') return true
    if (id === 'analyze') return !!uploadedImage
    if (id === 'mask') return !!uploadedImage
    if (id === 'restore') return !!uploadedImage && (!!damageAnalysis || !!manualMaskData)
    if (id === 'compare') return !!restorationResult
    if (id === 'evaluate') return !!restorationResult
    return false
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!uploadedImage) return
    setStatus('analyzing')
    try {
      const data = await analyzeImage(uploadedImage.image_id, sensitivity)
      setDamageAnalysis(data)
      setStatus('idle')
    } catch (err: any) {
      setStatus('error', err?.response?.data?.detail || 'Analysis failed.')
    }
  }

  const handleRestore = async () => {
    if (!uploadedImage) return
    setStatus('restoring')
    try {
      const payload = {
        image_id: uploadedImage.image_id,
        mask_data: manualMaskData || undefined,
        use_detected_mask: !manualMaskData && !!damageAnalysis,
        model: selectedModel,
        restoration_type: restorationType,
        prompt: prompt || undefined,
        quality,
      }
      const data = await restoreImage(payload)
      setRestorationResult(data)
      setMode('compare')
      setStatus('idle')
    } catch (err: any) {
      setStatus('error', err?.response?.data?.detail || 'Restoration failed.')
    }
  }

  const handleEvaluate = async () => {
    if (!restorationResult) return
    setStatus('analyzing')
    try {
      const data = await evaluateRestoration(restorationResult.restoration_id, 'simulated')
      setMetrics(data)
      setStatus('idle')
    } catch (err: any) {
      setStatus('error', err?.response?.data?.detail || 'Evaluation failed.')
    }
  }

  const isLoading = status === 'uploading' || status === 'analyzing' || status === 'restoring'

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="section-title">Restoration Workspace</h1>
        <p className="section-subtitle mt-1">Upload, analyze, mask, restore, and evaluate heritage images</p>
      </div>

      {/* ── Step bar ──────────────────────────────────────────────────── */}
      <div className="card mb-8">
        <div className="flex items-center justify-between overflow-x-auto gap-1 min-w-0">
          {STEPS.map((step, i) => {
            const active    = currentMode === step.id
            const available = isStepAvailable(step.id)
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => available && setMode(step.id)}
                  disabled={!available}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    active   ? 'bg-gold text-white shadow-gold'
                    : available ? 'text-charcoal hover:bg-parchment'
                    : 'text-heritage-300 cursor-not-allowed'
                  )}
                >
                  <step.icon size={16} />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={16} className="text-heritage-300 mx-1 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === 'error' && errorMessage && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-accent-crimson/5 border border-accent-crimson/20 text-accent-crimson text-sm flex items-center gap-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          >
            <AlertTriangle size={18} />
            <p className="flex-1">{errorMessage}</p>
            <button onClick={() => setStatus('idle')} className="btn-ghost p-1 text-accent-crimson">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step content ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* ═══ UPLOAD ═══ */}
          {currentMode === 'upload' && (
            <div className="space-y-6">
              <ImageUploader />
              {uploadedImage && (
                <div className="flex justify-end gap-3">
                  <button onClick={() => setMode('mask')} className="btn-secondary">
                    <Paintbrush size={16} /> Manual Mask
                  </button>
                  <button onClick={() => { setMode('analyze'); handleAnalyze() }} className="btn-primary" disabled={isLoading}>
                    {status === 'analyzing' ? <><div className="spinner" /> Analyzing…</> : <><ScanSearch size={16} /> Analyze Damage</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ ANALYZE ═══ */}
          {currentMode === 'analyze' && (
            <div className="space-y-6">
              {/* Sensitivity control */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold">Detection Sensitivity</h3>
                  <span className="text-sm text-muted">{(sensitivity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05} value={sensitivity}
                  onChange={e => setSensitivity(+e.target.value)}
                  className="w-full accent-gold"
                />
                <p className="text-xs text-muted mt-2">Higher = more sensitive (may detect false positives). Lower = fewer detections.</p>
                <button onClick={handleAnalyze} className="btn-secondary mt-3" disabled={isLoading}>
                  {status === 'analyzing' ? <><div className="spinner" /> Re-analyzing…</> : <><RefreshCw size={14} /> Re-analyze</>}
                </button>
              </div>

              {/* Results */}
              {damageAnalysis && (
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="font-display font-bold mb-3">Detection Results</h3>
                    <div className="grid sm:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-parchment/50">
                        <p className="text-xs text-muted">Damage Area</p>
                        <p className="text-2xl font-bold font-display text-gold">{damageAnalysis.damage_percentage}%</p>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/50">
                        <p className="text-xs text-muted">Regions Found</p>
                        <p className="text-2xl font-bold font-display">{damageAnalysis.damage_regions}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/50">
                        <p className="text-xs text-muted">Damage Types</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {damageAnalysis.damage_types.map(t => (
                            <span key={t} className="badge-gold text-[10px]">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted">{damageAnalysis.analysis_notes}</p>
                  </div>

                  {/* Image comparison */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="card p-3 text-center">
                      <p className="text-xs text-muted mb-2">Original</p>
                      <img src={uploadedImage?.preview_url} alt="Original" className="rounded-lg w-full" />
                    </div>
                    <div className="card p-3 text-center">
                      <p className="text-xs text-muted mb-2">Detected Damage</p>
                      <img src={damageAnalysis.overlay_url} alt="Overlay" className="rounded-lg w-full" />
                    </div>
                    <div className="card p-3 text-center">
                      <p className="text-xs text-muted mb-2">Damage Mask</p>
                      <img src={damageAnalysis.mask_url} alt="Mask" className="rounded-lg w-full bg-black" />
                    </div>
                  </div>

                  <div className="card bg-gold/5 border-gold/20">
                    <p className="text-sm text-muted">
                      <strong className="text-charcoal">💡 Note:</strong>{' '}
                      Automated detection is an estimate. Use the <strong>Manual Mask Editor</strong> to
                      refine the selection for best restoration results.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setMode('mask')} className="btn-secondary">
                      <Paintbrush size={16} /> Edit Mask Manually
                    </button>
                    <button onClick={() => setMode('restore')} className="btn-primary">
                      Proceed to Restore <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ MASK EDITOR ═══ */}
          {currentMode === 'mask' && (
            <MaskEditor />
          )}

          {/* ═══ RESTORE ═══ */}
          {currentMode === 'restore' && (
            <div className="space-y-6">
              {/* Restoration controls */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 size={18} className="text-gold" />
                  <h3 className="font-display font-bold">Restoration Settings</h3>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Model */}
                  <div>
                    <label className="label">AI Model</label>
                    <select value={selectedModel} onChange={e => setModel(e.target.value as any)} className="input">
                      <option value="lama">LaMa (Recommended)</option>
                      <option value="sd">Stable Diffusion</option>
                      <option value="classical">Classical (OpenCV)</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="label">Heritage Type</label>
                    <select value={restorationType} onChange={e => setRestorationType(e.target.value)} className="input">
                      <option value="general">General</option>
                      <option value="painting">Painting</option>
                      <option value="architecture">Architecture</option>
                      <option value="sculpture">Sculpture</option>
                      <option value="manuscript">Manuscript</option>
                    </select>
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="label">Quality</label>
                    <select value={quality} onChange={e => setQuality(e.target.value as any)} className="input">
                      <option value="standard">Standard</option>
                      <option value="high">High (slower)</option>
                    </select>
                  </div>
                </div>

                {/* Architecture Reconstruction Prompt */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Semantic Architectural Restoration Prompt</label>
                    <span className="text-xs text-muted">Guidance for missing walls, domes, arches & structures</span>
                  </div>
                  <textarea
                    rows={2}
                    className="input w-full text-sm font-sans"
                    placeholder="e.g. Reconstruct the missing section of this historical stone temple using the surrounding architectural style, matching stone masonry, wall geometry, roof structure, lighting, perspective and original color palette. Preserve all existing architecture."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                  {/* Preset Quick Prompts */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-muted font-medium">Quick Prompts:</span>
                    <button
                      type="button"
                      onClick={() => setPrompt("Reconstruct the missing section of this historical stone monument using the surrounding architectural style, matching stone masonry, wall geometry, roof structure, lighting, perspective and original color palette. Preserve all existing architecture.")}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-parchment hover:bg-gold/20 text-charcoal border border-border transition-colors"
                    >
                      🏛️ Stone Architecture & Masonry
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("Rebuild the collapsed dome, arch, and upper masonry following classical historical proportions with natural weathered stone textures.")}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-parchment hover:bg-gold/20 text-charcoal border border-border transition-colors"
                    >
                      🏰 Missing Dome & Arch
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("Seamlessly reconstruct missing fresco pigment and plaster layer, matching surrounding Renaissance artistic style, palette, and brushstroke texture.")}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-parchment hover:bg-gold/20 text-charcoal border border-border transition-colors"
                    >
                      🎨 Fresco & Painting
                    </button>
                  </div>
                </div>
              </div>

              {/* Mask preview */}
              {(manualMaskData || damageAnalysis) && (
                <div className="card">
                  <h4 className="font-display font-bold text-sm mb-3">Mask to be Used for Reconstruction</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 rounded-lg border border-border bg-black overflow-hidden flex-shrink-0">
                      <img
                        src={manualMaskData || damageAnalysis?.mask_url}
                        alt="Mask" className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-sm text-muted">
                      <p>Source: <strong>{manualMaskData ? 'Manual Editor (Custom Selection)' : 'Auto-detected'}</strong></p>
                      {damageAnalysis && !manualMaskData && (
                        <p>Damage area: <strong>{damageAnalysis.damage_percentage}%</strong></p>
                      )}
                      <p className="text-xs text-charcoal mt-1">
                        White areas will be <strong>reconstructed by AI</strong>. Black areas will remain <strong>100% untouched</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => setMode('mask')} className="btn-secondary">
                  <Paintbrush size={16} /> Edit Mask
                </button>
                <button onClick={handleRestore} className="btn-primary" disabled={isLoading}>
                  {status === 'restoring' ? (
                    <><div className="spinner" /> Restoring… This may take a moment</>
                  ) : (
                    <><Sparkles size={16} /> Start AI Reconstruction</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══ COMPARE ═══ */}
          {currentMode === 'compare' && restorationResult && (
            <div className="space-y-6">
              <BeforeAfter
                originalUrl={restorationResult.original_url}
                restoredUrl={restorationResult.result_url}
                maskUrl={restorationResult.mask_url}
                maskOverlayUrl={restorationResult.mask_overlay_url}
                rawOutputUrl={restorationResult.raw_output_url}
                restorationId={restorationResult.restoration_id}
                originalSharpness={restorationResult.original_sharpness}
                restoredSharpness={restorationResult.restored_sharpness}
              />

              {/* Restoration summary */}
              <div className="card">
                <h3 className="font-display font-bold mb-3">Restoration Summary</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-parchment/50">
                    <p className="text-xs text-muted">Model Used</p>
                    <p className="font-medium">{restorationResult.model_used}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-parchment/50">
                    <p className="text-xs text-muted">Processing Time</p>
                    <p className="font-medium">{restorationResult.processing_time_seconds}s</p>
                  </div>
                  <div className="p-3 rounded-xl bg-parchment/50">
                    <p className="text-xs text-muted">Status</p>
                    <span className={restorationResult.status.includes('completed') ? 'badge-success' : 'badge-error'}>
                      {restorationResult.status}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-parchment/50">
                    <p className="text-xs text-muted">Dimensions</p>
                    <p className="font-medium">{uploadedImage?.width} × {uploadedImage?.height} px</p>
                  </div>
                </div>
                {restorationResult.status === 'completed_with_fallback' && (
                  <p className="mt-3 text-xs text-muted bg-gold/5 p-2 rounded-lg">
                    ⚠️ {restorationResult.message}
                  </p>
                )}
              </div>

              <div className="card bg-gold/5 border-gold/20">
                <p className="text-sm text-muted">
                  <strong className="text-charcoal">⚠️ Important:</strong>{' '}
                  AI-reconstructed regions are <em>interpretations</em>, not proof of historical accuracy.
                  The original uploaded image has been preserved unchanged.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button onClick={() => triggerDownload(restorationResult.restoration_id, 'result')} className="btn-secondary">
                  <Download size={16} /> Download Restored
                </button>
                <button onClick={() => triggerDownload(restorationResult.restoration_id, 'mask')} className="btn-ghost text-sm">
                  <Download size={14} /> Mask
                </button>
                <button onClick={() => triggerDownload(restorationResult.restoration_id, 'report')} className="btn-ghost text-sm">
                  <FileText size={14} /> Report
                </button>
                <button onClick={() => { setMode('evaluate'); handleEvaluate() }} className="btn-primary">
                  <BarChart2 size={16} /> Evaluate Quality
                </button>
              </div>
            </div>
          )}

          {/* ═══ EVALUATE ═══ */}
          {currentMode === 'evaluate' && (
            <div className="space-y-6">
              {status === 'analyzing' ? (
                <div className="card text-center py-16">
                  <div className="spinner mx-auto mb-4" />
                  <p className="text-muted">Running quality evaluation…</p>
                  <p className="text-xs text-muted mt-2">Applying synthetic damage, restoring, and comparing against original.</p>
                </div>
              ) : metrics ? (
                <MetricsDisplay metrics={metrics} />
              ) : (
                <div className="card text-center py-12">
                  <BarChart2 size={48} className="mx-auto text-heritage-300 mb-4" />
                  <p className="text-muted mb-4">Run evaluation to calculate PSNR and SSIM metrics.</p>
                  <button onClick={handleEvaluate} className="btn-primary">
                    <BarChart2 size={16} /> Run Simulated Evaluation (Mode B)
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
