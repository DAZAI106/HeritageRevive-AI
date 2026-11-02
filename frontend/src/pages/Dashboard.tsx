/**
 * HeritageAI — Dashboard Page
 * Shows real aggregate statistics from the database, recent restorations,
 * available models, and quick-action buttons.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ImagePlus, Clock, CheckCircle, XCircle,
  ArrowRight, Wand2, BrainCircuit
} from 'lucide-react'
import { getHistory, listModels } from '../services/api'

interface Stats {
  total_processed: number
  successful: number
  failed: number
  avg_processing_time: number
  success_rate: number
}

interface RestorationItem {
  id: string; image_name: string; model_used: string; status: string
  created_at: string; processing_time: number | null; original_url: string | null
}

interface ModelInfo {
  id: string; name: string; description: string; recommended: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RestorationItem[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [gpuAvailable, setGpuAvailable] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [histData, modelData] = await Promise.all([
          getHistory(5, 0),
          listModels(),
        ])
        setStats(histData.stats)
        setRecent(histData.restorations)
        setModels(modelData.models)
        setGpuAvailable(modelData.gpu_available)
      } catch { /* backend may not be running yet */ }
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats
    ? [
        { label: 'Images Processed', value: stats.total_processed, icon: ImagePlus, color: 'text-gold' },
        { label: 'Successful',       value: stats.successful,       icon: CheckCircle, color: 'text-accent-forest' },
        { label: 'Failed',           value: stats.failed,           icon: XCircle, color: 'text-accent-crimson' },
        { label: 'Avg. Time',        value: `${stats.avg_processing_time}s`, icon: Clock, color: 'text-accent-slate' },
      ]
    : []

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle mt-1">Overview of your restoration activity</p>
        </div>
        <button onClick={() => navigate('/restore')} className="btn-primary">
          <Wand2 size={18} /> New Restoration
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* ── Stats Grid ─────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted">{s.label}</p>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-3xl font-bold font-display">{s.value}</p>
              </motion.div>
            ))}
          </div>

          {stats && stats.total_processed === 0 && (
            <motion.div
              className="card text-center py-16 mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <ImagePlus size={48} className="mx-auto text-heritage-300 mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">No Restorations Yet</h3>
              <p className="text-muted mb-6">Upload your first damaged heritage image to begin.</p>
              <button onClick={() => navigate('/restore')} className="btn-primary">
                <Wand2 size={18} /> Start First Restoration
              </button>
            </motion.div>
          )}

          {/* ── Recent Restorations ────────────────────────────────── */}
          {recent.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Recent Restorations</h2>
                <button onClick={() => navigate('/history')} className="btn-ghost text-sm">
                  View All <ArrowRight size={14} />
                </button>
              </div>

              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-parchment/60 text-muted text-left">
                      <th className="px-5 py-3 font-medium">Image</th>
                      <th className="px-5 py-3 font-medium">Model</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(r => (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/restore?id=${r.id}`)}
                        className="border-t border-border hover:bg-parchment/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 font-medium truncate max-w-[200px]">{r.image_name}</td>
                        <td className="px-5 py-3"><span className="badge-gold">{r.model_used}</span></td>
                        <td className="px-5 py-3">
                          <span className={r.status.includes('completed') ? 'badge-success' : r.status === 'failed' ? 'badge-error' : 'badge-muted'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted">{r.processing_time ? `${r.processing_time}s` : '—'}</td>
                        <td className="px-5 py-3 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Available Models ────────────────────────────────────── */}
          <div>
            <h2 className="font-display text-xl font-bold mb-4">Available AI Models</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {models.map((m, i) => (
                <motion.div
                  key={m.id}
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={18} className="text-gold" />
                    <h3 className="font-display font-bold">{m.name}</h3>
                    {m.recommended && <span className="badge-gold text-[10px]">Recommended</span>}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{m.description}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              GPU: {gpuAvailable ? '✅ Available — AI models will run faster' : '❌ Not detected — models will run on CPU (slower but functional)'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
