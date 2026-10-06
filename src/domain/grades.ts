/**
 * Student-facing grade summary: grades per term, unit-weighted averages and
 * progress toward the curriculum. Derived from the record and the evaluation only.
 */
import { PASSING_GRADE } from './rules'
import { termLabel, termOrder } from './term'
import type { Evaluation, TermRef } from './types'

export interface GradeRow {
  key: string
  code: string
  title: string
  units: number
  /** Numeric final grade; undefined for INC, UW, DRP and credits. */
  grade?: number
  remark: 'Passed' | 'Failed' | 'INC' | 'UW' | 'DRP' | 'Credited'
}

export interface TermGrades {
  term: TermRef
  label: string
  rows: GradeRow[]
  average?: number
}

export interface GradeSummary {
  terms: TermGrades[]
  /** Unit-weighted average of every numeric grade. */
  gwa?: number
  counts: { passed: number; failed: number; inc: number }
  unitsEarned: number
  unitsTotal: number
  progress: number
}

function weighted(rows: GradeRow[]): number | undefined {
  const graded = rows.filter((r) => r.grade !== undefined)
  const units = graded.reduce((a, r) => a + r.units, 0)
  return units ? graded.reduce((a, r) => a + r.grade! * r.units, 0) / units : undefined
}

export function gradeSummary(ev: Evaluation): GradeSummary {
  const byTerm = new Map<string, TermGrades>()
  for (const r of ev.student.records) {
    const sub = ev.curriculum.subjects.find((s) => s.id === r.subjectId)
    if (!sub) continue
    const res = r.result
    const grade = res.kind === 'grade' ? res.value : res.kind === 'INC' ? res.completedGrade : undefined
    const remark: GradeRow['remark'] =
      res.kind === 'UW' ? 'UW' : res.kind === 'Dropped' ? 'DRP' : res.kind === 'Credited' ? 'Credited' : grade === undefined ? 'INC' : grade >= PASSING_GRADE ? 'Passed' : 'Failed'
    const k = `${r.term.ay}|${r.term.sem}`
    const t = byTerm.get(k) ?? { term: r.term, label: termLabel(r.term), rows: [] }
    t.rows.push({ key: r.id, code: sub.code, title: sub.title, units: sub.units, grade, remark })
    byTerm.set(k, t)
  }
  const terms = [...byTerm.values()].sort((a, b) => termOrder(a.term) - termOrder(b.term)).map((t) => ({ ...t, average: weighted(t.rows) }))
  const subjects = Object.values(ev.subjects)
  const unitsTotal = ev.curriculum.subjects.reduce((a, s) => a + s.units, 0)
  const unitsEarned = subjects.filter((x) => x.status === 'passed' || x.status === 'credited').reduce((a, x) => a + x.subject.units, 0)
  return {
    terms,
    gwa: weighted(terms.flatMap((t) => t.rows)),
    counts: {
      passed: subjects.filter((x) => x.status === 'passed').length,
      failed: subjects.filter((x) => x.status === 'failed').length,
      inc: subjects.filter((x) => x.status === 'pending').length,
    },
    unitsEarned,
    unitsTotal,
    progress: unitsTotal ? unitsEarned / unitsTotal : 0,
  }
}
