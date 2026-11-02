/**
 * HeritageAI — Image Upload Component
 * Drag-and-drop uploader with file validation, preview, and metadata display.
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileWarning, Check } from 'lucide-react'
import { uploadImage } from '../../services/api'
import { useRestorationStore } from '../../store/restorationStore'

export default function ImageUploader() {
  const {
    uploadedImage, setUploadedImage, setMode, setStatus,
    setDamageAnalysis, setManualMaskData, setRestorationResult, setMetrics,
  } = useRestorationStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[], rejected: any[]) => {
    setError(null)

    if (rejected.length > 0) {
      const r = rejected[0]
      if (r.errors?.some((e: any) => e.code === 'file-too-large'))
        setError('File is too large. Maximum 20 MB.')
      else if (r.errors?.some((e: any) => e.code === 'file-invalid-type'))
        setError('Invalid file type. Only JPG, JPEG, and PNG accepted.')
      else
        setError('File rejected. Please try a different image.')
      return
    }

    if (accepted.length === 0) return
    const file = accepted[0]

    setUploading(true)
    setStatus('uploading')
    try {
      const data = await uploadImage(file)
      setUploadedImage(data)
      setDamageAnalysis(null)
      setManualMaskData(null)
      setRestorationResult(null)
      setMetrics(null)
      setStatus('idle')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed. Please try again.'
      setError(msg)
      setStatus('error', msg)
    } finally {
      setUploading(false)
    }
  }, [setUploadedImage, setMode, setStatus, setDamageAnalysis, setManualMaskData, setRestorationResult, setMetrics])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  })

  const handleRemove = () => {
    setUploadedImage(null)
    setDamageAnalysis(null)
    setManualMaskData(null)
    setRestorationResult(null)
    setMetrics(null)
    setError(null)
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {!uploadedImage ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive ? 'border-gold bg-gold/5 scale-[1.01]' : 'border-heritage-300 hover:border-gold hover:bg-parchment/30'}
                ${uploading ? 'pointer-events-none opacity-60' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                {uploading ? (
                  <>
                    <div className="spinner" />
                    <p className="text-muted">Uploading image…</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                      <Upload size={28} className="text-gold" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold mb-1">
                        {isDragActive ? 'Drop your image here' : 'Upload Heritage Image'}
                      </p>
                      <p className="text-sm text-muted">
                        Drag & drop or <span className="text-gold font-medium">browse</span> · JPG, JPEG, PNG · Max 20 MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && (
              <motion.div
                className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-accent-crimson/5 border border-accent-crimson/20 text-accent-crimson text-sm"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              >
                <FileWarning size={16} /> {error}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            className="card"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start gap-5">
              {/* Thumbnail */}
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-parchment">
                <img
                  src={uploadedImage.preview_url}
                  alt={uploadedImage.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-accent-forest" />
                  <span className="badge-success">Uploaded</span>
                </div>
                <h3 className="font-display font-bold text-lg truncate mb-2">{uploadedImage.filename}</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted">
                  <p>Dimensions: <span className="text-charcoal font-medium">{uploadedImage.width} × {uploadedImage.height} px</span></p>
                  <p>File size: <span className="text-charcoal font-medium">{uploadedImage.file_size_kb} KB</span></p>
                  <p>Image ID: <span className="text-charcoal font-mono text-xs">{uploadedImage.image_id.slice(0, 8)}…</span></p>
                </div>
              </div>

              {/* Remove */}
              <button onClick={handleRemove} className="btn-ghost p-2 text-muted hover:text-accent-crimson" title="Remove image">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
