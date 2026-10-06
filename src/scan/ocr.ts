import { removeRuledLines } from './lines'

/**
 * In-browser OCR with tesseract.js. The image stays on the device; only the
 * OCR engine and English language data are downloaded once and cached.
 */

/**
 * Scale so the long edge is about 2000 px (small screenshots are enlarged,
 * phone photos reduced) on a white background. No contrast filter: it turned
 * printed text into noise in testing.
 */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(2.5, 2000 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  // Grid lines around table cells confuse OCR: erase long rules before reading.
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const gray = new Uint8ClampedArray(c.width * c.height)
  for (let i = 0; i < gray.length; i++) gray[i] = (data.data[i * 4] * 299 + data.data[i * 4 + 1] * 587 + data.data[i * 4 + 2] * 114) / 1000
  const clean = removeRuledLines(gray, c.width, c.height)
  for (let i = 0; i < clean.length; i++) data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = clean[i]
  ctx.putImageData(data, 0, 0)
  return c
}

export class OcrCancelled extends Error {}

export async function recognise(file: Blob, onProgress: (p: number) => void, signal: AbortSignal): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  if (signal.aborted) throw new OcrCancelled()
  // Engine and English data are served from /ocr so scanning works offline.
  const base = `${location.origin}${import.meta.env.BASE_URL}ocr`
  const worker = await createWorker('eng', 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  const stop = () => void worker.terminate()
  signal.addEventListener('abort', stop)
  try {
    if (signal.aborted) throw new OcrCancelled()
    const { data } = await worker.recognize(await prepare(file))
    if (signal.aborted) throw new OcrCancelled()
    return data.text
  } catch (e) {
    if (signal.aborted) throw new OcrCancelled()
    throw e
  } finally {
    signal.removeEventListener('abort', stop)
    await worker.terminate().catch(() => {})
  }
}
