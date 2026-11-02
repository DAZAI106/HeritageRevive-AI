/**
 * HeritageAI — Zustand global state store
 * Manages the restoration workflow state across components
 */
import { create } from 'zustand'

export type RestorationModel = 'lama' | 'sd' | 'classical'
export type RestorationStatus = 'idle' | 'uploading' | 'analyzing' | 'restoring' | 'done' | 'error'
export type RestorationMode = 'upload' | 'analyze' | 'mask' | 'restore' | 'compare' | 'evaluate'

export interface UploadedImage {
  image_id: string
  filename: string
  width: number
  height: number
  file_size_kb: number
  preview_url: string
}

export interface DamageAnalysis {
  mask_url: string
  overlay_url: string
  damage_percentage: number
  damage_regions: number
  damage_types: string[]
  analysis_notes: string
}

export interface RestorationResult {
  restoration_id: string
  original_url: string
  result_url: string
  mask_url: string
  mask_overlay_url?: string | null
  raw_output_url?: string | null
  model_used: string
  processing_time_seconds: number
  status: string
  message: string
  original_sharpness?: number | null
  restored_sharpness?: number | null
}

export interface EvaluationMetrics {
  mode: string
  psnr: number | null
  ssim: number | null
  psnr_interpretation: string
  ssim_interpretation: string
  mode_explanation: string
}

interface RestorationStore {
  // Workflow step
  currentMode: RestorationMode
  setMode: (m: RestorationMode) => void

  // Status
  status: RestorationStatus
  errorMessage: string | null
  setStatus: (s: RestorationStatus, err?: string | null) => void

  // Data
  uploadedImage: UploadedImage | null
  damageAnalysis: DamageAnalysis | null
  manualMaskData: string | null  // base64 PNG from canvas
  restorationResult: RestorationResult | null
  metrics: EvaluationMetrics | null

  // Settings
  selectedModel: RestorationModel
  restorationType: string
  prompt: string
  quality: 'standard' | 'high'

  // Setters
  setUploadedImage: (img: UploadedImage | null) => void
  setDamageAnalysis: (a: DamageAnalysis | null) => void
  setManualMaskData: (data: string | null) => void
  setRestorationResult: (r: RestorationResult | null) => void
  setMetrics: (m: EvaluationMetrics | null) => void
  setModel: (m: RestorationModel) => void
  setRestorationType: (t: string) => void
  setPrompt: (p: string) => void
  setQuality: (q: 'standard' | 'high') => void

  // Reset
  resetWorkflow: () => void
}

export const useRestorationStore = create<RestorationStore>((set) => ({
  currentMode:       'upload',
  status:            'idle',
  errorMessage:      null,
  uploadedImage:     null,
  damageAnalysis:    null,
  manualMaskData:    null,
  restorationResult: null,
  metrics:           null,
  selectedModel:     'lama',
  restorationType:   'general',
  prompt:            '',
  quality:           'standard',

  setMode:             (m) => set({ currentMode: m }),
  setStatus:           (s, err = null) => set({ status: s, errorMessage: err }),
  setUploadedImage:    (img) => set({ uploadedImage: img }),
  setDamageAnalysis:   (a)   => set({ damageAnalysis: a }),
  setManualMaskData:   (d)   => set({ manualMaskData: d }),
  setRestorationResult:(r)   => set({ restorationResult: r }),
  setMetrics:          (m)   => set({ metrics: m }),
  setModel:            (m)   => set({ selectedModel: m }),
  setRestorationType:  (t)   => set({ restorationType: t }),
  setPrompt:           (p)   => set({ prompt: p }),
  setQuality:          (q)   => set({ quality: q }),

  resetWorkflow: () => set({
    currentMode:       'upload',
    status:            'idle',
    errorMessage:      null,
    uploadedImage:     null,
    damageAnalysis:    null,
    manualMaskData:    null,
    restorationResult: null,
    metrics:           null,
    prompt:            '',
  }),
}))
