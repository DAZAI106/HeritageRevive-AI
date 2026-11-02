/**
 * HeritageAI — Restoration History Page
 * Displays paginated restoration records from the database.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { History as HistoryIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getHistory, triggerDownload } from '../services/api'

interface RestorationItem {
  id: string; image_name: string; model_used: string; status: string
  created_at: string; processing_time: number | null
  width: number | null; height: number | null; restoration_type: string
  psnr: number | null; ssim: number | null
  original_url: string | null; result_url: string | null
}

export default function History() {
  const [items, setItems]       = useState<RestorationItem[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<RestorationItem | null>(null)
  const limit = 10

  const load = async () => {
    setLoading(true)
    try {
      const data = await getHistory(limit, page * limit)
      setItems(data.restorations)
      setTotal(data.total)
    } catch { /* backend may not be running */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Restoration History</h1>
          <p className="section-subtitle mt-1">{total} total restoration{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-ghost"><RefreshCw size={16} /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <HistoryIcon size={48} className="mx-auto text-heritage-300 mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">No Restorations Yet</h3>
          <p className="text-muted">Completed restorations will appear here.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-parchment/60 text-muted text-left">
                  <th className="px-5 py-3 font-medium">Image</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">PSNR / SSIM</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr
                    key={r.id}
                    className="border-t border-border hover:bg-parchment/30 cursor-pointer transition-colors"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-5 py-3 font-medium truncate max-w-[160px]">{r.image_name}</td>
                    <td className="px-5 py-3"><span className="badge-muted">{r.restoration_type}</span></td>
                    <td className="px-5 py-3"><span className="badge-gold">{r.model_used}</span></td>
                    <td className="px-5 py-3">
                      <span className={r.status.includes('completed') ? 'badge-success' : r.status === 'failed' ? 'badge-error' : 'badge-muted'}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{r.processing_time ? `${r.processing_time}s` : '—'}</td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {r.psnr ? `${r.psnr.toFixed(1)} dB` : '—'} / {r.ssim ? r.ssim.toFixed(3) : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {r.status.includes('completed') && (
                        <button
                          onClick={e => { e.stopPropagation(); triggerDownload(r.id, 'result') }}
                          className="btn-ghost text-xs p-1"
                        >
                          ⬇ Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-muted">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-ghost">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail modal ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-charcoal/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div
            className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold mb-4">{selected.image_name}</h3>
            {selected.result_url && selected.original_url && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted mb-1">Original</p>
                  <img src={selected.original_url} className="rounded-lg w-full" alt="Original" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Restored</p>
                  <img src={selected.result_url} className="rounded-lg w-full" alt="Restored" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-muted">Model:</span> <strong>{selected.model_used}</strong></div>
              <div><span className="text-muted">Status:</span> <strong>{selected.status}</strong></div>
              <div><span className="text-muted">Type:</span> <strong>{selected.restoration_type}</strong></div>
              <div><span className="text-muted">Time:</span> <strong>{selected.processing_time}s</strong></div>
              {selected.psnr && <div><span className="text-muted">PSNR:</span> <strong>{selected.psnr.toFixed(2)} dB</strong></div>}
              {selected.ssim && <div><span className="text-muted">SSIM:</span> <strong>{selected.ssim.toFixed(4)}</strong></div>}
            </div>
            <div className="flex gap-3">
              {selected.status.includes('completed') && (
                <>
                  <button onClick={() => triggerDownload(selected.id, 'result')} className="btn-primary text-sm">Download Restored</button>
                  <button onClick={() => triggerDownload(selected.id, 'report')} className="btn-secondary text-sm">Download Report</button>
                </>
              )}
              <button onClick={() => setSelected(null)} className="btn-ghost text-sm ml-auto">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
