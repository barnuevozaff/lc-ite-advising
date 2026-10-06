import { describe, expect, it } from 'vitest'
import { removeRuledLines } from './lines'

// Tiny grayscale "image": 0 = black, 255 = white.
function img(w: number, h: number) {
  return { w, h, px: new Uint8ClampedArray(w * h).fill(255) }
}

describe('removeRuledLines', () => {
  it('erases long horizontal and vertical lines but keeps short text strokes', () => {
    const { w, h, px } = img(200, 120)
    for (let x = 0; x < w; x++) px[50 * w + x] = 0 // table rule across the width
    for (let y = 0; y < h; y++) px[y * w + 100] = 0 // column line down the height
    for (let y = 20; y < 32; y++) px[y * w + 30] = 0 // a letter stroke, 12 px tall
    for (let x = 40; x < 52; x++) px[25 * w + x] = 0 // a letter stroke, 12 px wide
    const out = removeRuledLines(px, w, h)
    expect(out[50 * w + 10]).toBe(255)
    expect(out[10 * w + 100]).toBe(255)
    expect(out[25 * w + 30]).toBe(0)
    expect(out[25 * w + 45]).toBe(0)
  })

  it('leaves a page without lines unchanged', () => {
    const { w, h, px } = img(50, 50)
    px[10 * w + 10] = 0
    expect(Array.from(removeRuledLines(px, w, h))).toEqual(Array.from(px))
  })
})
