/**
 * HeritageAI — Canvas Mask Editor
 *
 * Interactive HTML5 Canvas overlay for manually marking damaged regions.
 * Features: brush, eraser, adjustable size, undo/redo, zoom, clear, reset.
 * White pixels = regions to reconstruct; black pixels = keep unchanged.
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Paintbrush, Eraser, ZoomIn, ZoomOut, Undo2, Redo2,
  Trash2, RotateCcw, Check, Minus, Plus
} from 'lucide-react'
import clsx from 'clsx'
import { useRestorationStore } from '../../store/restorationStore'

const MIN_BRUSH = 4
const MAX_BRUSH = 80
const MAX_UNDO  = 30

export default function MaskEditor() {
  const { uploadedImage, setManualMaskData, setMode, damageAnalysis } = useRestorationStore()

  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const imgRef        = useRef<HTMLImageElement | null>(null)

  const [tool, setTool]         = useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrush]   = useState(20)
  const [zoom, setZoom]         = useState(1)
  const [drawing, setDrawing]   = useState(false)

  const [undoStack, setUndoStack] = useState<ImageData[]>([])
  const [redoStack, setRedoStack] = useState<ImageData[]>([])

  const [canvasW, setCanvasW] = useState(0)
  const [canvasH, setCanvasH] = useState(0)

  // Load image and size canvas
  useEffect(() => {
    if (!uploadedImage) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img

      // Fit inside 720 px max width
      const maxW = 720
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      setCanvasW(w)
      setCanvasH(h)

      const cvs = canvasRef.current
      if (!cvs) return
      cvs.width  = w
      cvs.height = h
      const ctx = cvs.getContext('2d')!
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      // Save initial state to undo stack
      setUndoStack([ctx.getImageData(0, 0, w, h)])
      setRedoStack([])
    }
    img.src = uploadedImage.preview_url
  }, [uploadedImage])

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    const data = ctx.getImageData(0, 0, cvs.width, cvs.height)
    setUndoStack(prev => [...prev.slice(-MAX_UNDO), data])
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    const cvs = canvasRef.current
    if (!cvs || undoStack.length <= 1) return
    const ctx = cvs.getContext('2d')!
    const current = ctx.getImageData(0, 0, cvs.width, cvs.height)
    setRedoStack(prev => [...prev, current])
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    ctx.putImageData(prev, 0, 0)
  }, [undoStack])

  const redo = useCallback(() => {
    const cvs = canvasRef.current
    if (!cvs || redoStack.length === 0) return
    const ctx = cvs.getContext('2d')!
    const current = ctx.getImageData(0, 0, cvs.width, cvs.height)
    setUndoStack(prev => [...prev, current])
    const next = redoStack[redoStack.length - 1]
    setRedoStack(s => s.slice(0, -1))
    ctx.putImageData(next, 0, 0)
  }, [redoStack])

  // ── Drawing handlers ───────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top)  / zoom,
    }
  }

  const paint = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = tool === 'brush' ? '#ffffff' : '#000000'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    pushUndo()
    setDrawing(true)
    const { x, y } = getPos(e)
    paint(x, y)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const { x, y } = getPos(e)
    paint(x, y)
  }

  const onMouseUp = () => setDrawing(false)

  // ── Clear / Reset ──────────────────────────────────────────────────────────
  const clearMask = () => {
    pushUndo()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasW, canvasH)
  }

  const loadDetectedMask = () => {
    if (!damageAnalysis?.mask_url || !canvasRef.current) return
    const maskImg = new Image()
    maskImg.crossOrigin = 'anonymous'
    maskImg.onload = () => {
      const cvs = canvasRef.current
      if (!cvs) return
      pushUndo()
      const ctx = cvs.getContext('2d')!
      ctx.drawImage(maskImg, 0, 0, canvasW, canvasH)
    }
    maskImg.src = damageAnalysis.mask_url
  }

  // ── Apply mask ─────────────────────────────────────────────────────────────
  const applyMask = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const dataUrl = cvs.toDataURL('image/png')
    setManualMaskData(dataUrl)
    setMode('restore')
  }

  if (!uploadedImage) return null

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="card flex flex-wrap items-center gap-3">
        {/* Tool selectors */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-1">
          <button
            onClick={() => setTool('brush')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              tool === 'brush' ? 'bg-gold text-white' : 'text-muted hover:bg-parchment'
            )}
          >
            <Paintbrush size={14} /> Brush
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              tool === 'eraser' ? 'bg-charcoal text-white' : 'text-muted hover:bg-parchment'
            )}
          >
            <Eraser size={14} /> Eraser
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <button onClick={() => setBrush(v => Math.max(MIN_BRUSH, v - 4))} className="btn-ghost p-1"><Minus size={14} /></button>
          <span className="text-xs text-muted w-10 text-center">{brushSize}px</span>
          <button onClick={() => setBrush(v => Math.min(MAX_BRUSH, v + 4))} className="btn-ghost p-1"><Plus size={14} /></button>
          <input
            type="range" min={MIN_BRUSH} max={MAX_BRUSH} value={brushSize}
            onChange={e => setBrush(+e.target.value)}
            className="w-24 accent-gold"
          />
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={undoStack.length <= 1} className="btn-ghost p-1.5" title="Undo"><Undo2 size={16} /></button>
        <button onClick={redo} disabled={redoStack.length === 0} className="btn-ghost p-1.5" title="Redo"><Redo2 size={16} /></button>

        <div className="w-px h-6 bg-border" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="btn-ghost p-1.5" title="Zoom Out"><ZoomOut size={16} /></button>
        <span className="text-xs text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="btn-ghost p-1.5" title="Zoom In"><ZoomIn size={16} /></button>

        <div className="w-px h-6 bg-border" />

        <button onClick={clearMask} className="btn-ghost p-1.5 text-accent-crimson" title="Clear Mask"><Trash2 size={16} /></button>
        <button onClick={() => { setManualMaskData(null); setMode('analyze') }} className="btn-ghost p-1.5" title="Reset"><RotateCcw size={16} /></button>

        {damageAnalysis?.mask_url && (
          <button
            onClick={loadDetectedMask}
            className="btn-secondary text-xs py-1 px-2.5"
            title="Import auto-detected cracks so you can add missing structures over them"
          >
            Import Detected Mask
          </button>
        )}

        <div className="flex-1" />

        <button onClick={applyMask} className="btn-primary text-sm">
          <Check size={16} /> Apply Mask
        </button>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="relative overflow-auto bg-heritage-900/5 flex items-center justify-center p-4"
          style={{ maxHeight: '70vh' }}
        >
          <div
            className="relative"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
          >
            {/* Background image */}
            <img
              src={uploadedImage.preview_url}
              alt="Heritage"
              className="block rounded"
              style={{ width: canvasW, height: canvasH }}
              draggable={false}
            />
            {/* Mask canvas overlay */}
            <canvas
              ref={canvasRef}
              className={clsx(
                'absolute top-0 left-0 rounded opacity-50',
                tool === 'brush' ? 'brush-cursor' : 'eraser-cursor'
              )}
              style={{ width: canvasW, height: canvasH }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
        </div>
      </div>

      {/* ── Tip ──────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted text-center">
        <strong>Brush</strong> = mark damaged areas (white). <strong>Eraser</strong> = remove marks (black).
        Click <strong>Apply Mask</strong> when ready.
      </p>
    </div>
  )
}
