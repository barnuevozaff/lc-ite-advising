/**
 * Removes table rules (long horizontal and vertical lines) from a grayscale
 * image so the OCR reads the text in each cell instead of the grid.
 * `px` holds one gray value per pixel (0 = black). Returns a new array.
 */
export function removeRuledLines(px: Uint8ClampedArray, w: number, h: number, dark = 140): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px)
  const minRunX = Math.max(40, Math.round(w * 0.12))
  const minRunY = Math.max(40, Math.round(h * 0.03))
  const erase = new Uint8Array(w * h)
  // Horizontal runs.
  for (let y = 0; y < h; y++) {
    let start = -1
    for (let x = 0; x <= w; x++) {
      const isDark = x < w && px[y * w + x] < dark
      if (isDark && start < 0) start = x
      if (!isDark && start >= 0) {
        if (x - start >= minRunX) for (let i = start; i < x; i++) erase[y * w + i] = 1
        start = -1
      }
    }
  }
  // Vertical runs.
  for (let x = 0; x < w; x++) {
    let start = -1
    for (let y = 0; y <= h; y++) {
      const isDark = y < h && px[y * w + x] < dark
      if (isDark && start < 0) start = y
      if (!isDark && start >= 0) {
        if (y - start >= minRunY) for (let i = start; i < y; i++) erase[i * w + x] = 1
        start = -1
      }
    }
  }
  for (let i = 0; i < erase.length; i++) if (erase[i]) out[i] = 255
  return out
}
