import { describe, expect, it } from 'vitest'
import { seedOfferings, seedStudents } from '../data/seed'
import { gradeSummary } from './grades'
import { evaluateStudent } from './rules'

const students = Object.fromEntries(seedStudents().map((s) => [s.id, s]))
const ev = (id: string) => evaluateStudent(students[id], new Set(seedOfferings()), [])

describe('gradeSummary', () => {
  it('groups grades by term, oldest first, with a unit-weighted average of numeric grades', () => {
    const g = gradeSummary(ev('s-jerome'))
    expect(g.terms.map((t) => t.label)).toEqual(['First Semester, AY 2025–2026', 'Second Semester, AY 2025–2026'])
    const t1 = g.terms[0]
    const w = t1.rows.reduce((a, r) => a + (r.grade ?? 0) * r.units, 0) / t1.rows.reduce((a, r) => a + (r.grade !== undefined ? r.units : 0), 0)
    expect(t1.average).toBeCloseTo(w, 2)
  })

  it('counts passed, failed, INC and the units earned toward the curriculum', () => {
    const g = gradeSummary(ev('s-jerome'))
    expect(g.counts.failed).toBe(1)
    expect(g.unitsEarned).toBeGreaterThan(0)
    expect(g.unitsTotal).toBe(ev('s-jerome').curriculum.subjects.reduce((a, s) => a + s.units, 0))
    expect(g.progress).toBeCloseTo(g.unitsEarned / g.unitsTotal, 5)
    expect(gradeSummary(ev('s-kristine')).counts.inc).toBe(1)
  })

  it('labels remarks for INC, UW and DRP and leaves them out of averages', () => {
    const g = gradeSummary(ev('s-dominic'))
    const rows = g.terms.flatMap((t) => t.rows)
    expect(rows.find((r) => r.code === 'ITE P306')).toMatchObject({ remark: 'UW', grade: undefined })
    expect(rows.find((r) => r.code === 'FL 111')).toMatchObject({ remark: 'DRP', grade: undefined })
  })

  it('handles a student with no grades', () => {
    const g = gradeSummary(evaluateStudent({ ...students['s-bea'], records: [] }, new Set(), []))
    expect(g).toMatchObject({ terms: [], gwa: undefined, unitsEarned: 0, progress: 0 })
  })
})
