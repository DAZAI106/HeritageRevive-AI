/**
 * HeritageAI — Evaluation Page
 * Standalone page for quality metrics — also accessible from the restoration workflow.
 * Supports Mode A (reference) and Mode B (simulated).
 */
import { useState } from 'react'
import { BarChart2, Upload, FlaskConical } from 'lucide-react'
import { uploadImage, evaluateRestoration } from '../services/api'
import { useRestorationStore, type EvaluationMetrics } from '../store/restorationStore'
import MetricsDisplay from '../components/evaluation/MetricsDisplay'

export default function Evaluation() {
  const { restorationResult } = useRestorationStore()
  const [mode, setMode]     = useState<'reference' | 'simulated'>('simulated')
  const [refId, setRefId]   = useState<string | null>(null)
  const [refName, setRefName] = useState('')
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await uploadImage(file)
      setRefId(data.image_id)
      setRefName(data.filename)
    } catch {
      setError('Failed to upload reference image.')
    }
  }

  const handleEvaluate = async () => {
    if (!restorationResult) {
      setError('No restoration available. Complete a restoration first.')
      return
    }
    if (mode === 'reference' && !refId) {
      setError('Please upload a reference (undamaged) image first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await evaluateRestoration(
        restorationResult.restoration_id,
        mode,
        mode === 'reference' ? refId! : undefined,
      )
      setMetrics(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title">Quality Evaluation</h1>
        <p className="section-subtitle mt-1">Calculate PSNR and SSIM metrics for your restoration</p>
      </div>

      {!restorationResult ? (
        <div className="card text-center py-16">
          <BarChart2 size={48} className="mx-auto text-heritage-300 mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">No Restoration Available</h3>
          <p className="text-muted">Complete a restoration in the Workspace first, then return here to evaluate it.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="card">
            <h3 className="font-display font-bold mb-4">Evaluation Mode</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('simulated')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === 'simulated' ? 'border-gold bg-gold/5' : 'border-border hover:border-heritage-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical size={18} className="text-gold" />
                  <p className="font-medium">Mode B — Simulated Damage</p>
                </div>
                <p className="text-xs text-muted">Applies synthetic damage, restores it, compares to original. Tests the AI model's capability.</p>
              </button>
              <button
                onClick={() => setMode('reference')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === 'reference' ? 'border-gold bg-gold/5' : 'border-border hover:border-heritage-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={18} className="text-gold" />
                  <p className="font-medium">Mode A — Reference-based</p>
                </div>
                <p className="text-xs text-muted">Upload the undamaged original as ground truth. Scientifically valid evaluation.</p>
              </button>
            </div>

            {mode === 'reference' && (
              <div className="mt-4">
                <label className="label">Upload Undamaged Reference Image</label>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handleRefUpload} className="input" />
                {refName && <p className="text-xs text-accent-forest mt-1">✓ Reference uploaded: {refName}</p>}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-accent-crimson">{error}</p>
            )}

            <button onClick={handleEvaluate} disabled={loading} className="btn-primary mt-4">
              {loading ? <><div className="spinner" /> Evaluating…</> : <><BarChart2 size={16} /> Calculate Metrics</>}
            </button>
          </div>

          {/* Results */}
          {metrics && <MetricsDisplay metrics={metrics} />}
        </div>
      )}
    </div>
  )
}
