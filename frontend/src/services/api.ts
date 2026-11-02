/**
 * HeritageAI — Axios API service layer
 * All backend communication goes through this module.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300_000, // 5 min — AI inference can be slow
})

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

// ── Damage analysis ───────────────────────────────────────────────────────────

export async function analyzeImage(imageId: string, sensitivity = 0.5) {
  const res = await api.post('/analyze-damage', { image_id: imageId, sensitivity })
  return res.data
}

// ── Restore ───────────────────────────────────────────────────────────────────

export interface RestorePayload {
  image_id:          string
  mask_data?:        string   // base64 PNG
  use_detected_mask: boolean
  model:             string
  restoration_type:  string
  prompt?:           string
  quality:           string
}

export async function restoreImage(payload: RestorePayload) {
  const res = await api.post('/restore', payload)
  return res.data
}

// ── Evaluate ──────────────────────────────────────────────────────────────────

export async function evaluateRestoration(
  restorationId: string,
  mode: 'reference' | 'simulated',
  referenceImageId?: string
) {
  const res = await api.post('/evaluate', {
    restoration_id:     restorationId,
    mode,
    reference_image_id: referenceImageId,
  })
  return res.data
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getHistory(limit = 20, offset = 0) {
  const res = await api.get('/history', { params: { limit, offset } })
  return res.data
}

export async function getRestoration(id: string) {
  const res = await api.get(`/restoration/${id}`)
  return res.data
}

// ── Download ──────────────────────────────────────────────────────────────────

export function downloadUrl(restorationId: string, type: 'result' | 'mask' | 'original' | 'report') {
  return `/api/download/${restorationId}/${type}`
}

export async function triggerDownload(restorationId: string, type: 'result' | 'mask' | 'original' | 'report') {
  const url  = downloadUrl(restorationId, type)
  const res  = await fetch(url)
  const blob = await res.blob()
  const ext  = type === 'report' ? 'json' : 'png'
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `heritage_${type}_${restorationId.slice(0, 8)}.${ext}`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Models ────────────────────────────────────────────────────────────────────

export async function listModels() {
  const res = await api.get('/models')
  return res.data
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function healthCheck() {
  const res = await api.get('/health')
  return res.data
}

export default api
