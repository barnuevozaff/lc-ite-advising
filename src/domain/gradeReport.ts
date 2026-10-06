/**
 * Turns OCR text of a printed Report of Grades into reviewable rows.
 * Codes are matched only against the student's own curriculum, so OCR noise
 * can be repaired without guessing outside it. Nothing here is saved; the dean
 * reviews every row first.
 */
import { PASSING_GRADE } from './rules'
import { shiftAY, termOrder, type ActiveTerm } from './term'
import type { Curriculum, CurriculumVersion, Program, RecordEntry, RecordResult, Semester, Student, TermRef } from './types'

export type ScannedResult = { kind: 'grade'; value: number } | { kind: 'INC' } | { kind: 'UW' } | { kind: 'Dropped' }

export interface ScannedRow {
  key: string
  lineNo: number
  raw: string
  subjectId: string
  term: TermRef | null
  result: ScannedResult | null
  confidence: 'high' | 'check'
  issues: string[]
}

export interface ScannedReport {
  rows: ScannedRow[]
  unmatched: { lineNo: number; raw: string }[]
}

/** Fold characters OCR commonly confuses so "1TE C1O2a" compares equal to "ITE C102a". */
export function foldCode(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/0/g, 'O')
    .replace(/[1L]/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B')
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

const REMARK: Record<string, ScannedResult> = { INC: { kind: 'INC' }, UW: { kind: 'UW' }, DRP: { kind: 'Dropped' }, DROPPED: { kind: 'Dropped' } }

function readResult(tokens: string[]): ScannedResult | null {
  for (const t of tokens) {
    const r = REMARK[t.toUpperCase().replace(/[^A-Z]/g, '')]
    if (r) return r
    if (/^\d{2,3}(\.\d{1,2})?$/.test(t)) {
      const v = Number(t)
      if (v >= 50 && v <= 100) return { kind: 'grade', value: v }
    }
  }
  return null
}

function readTerm(line: string): TermRef | null {
  const u = line.toUpperCase()
  const sem: Semester | 'Summer' | null = /\b(FIRST|1ST)\s+SEM/.test(u) ? 1 : /\b(SECOND|2ND)\s+SEM/.test(u) ? 2 : /\bSUMMER\b/.test(u) ? 'Summer' : null
  const ay = u.match(/(20\d{2})\s*[-–]\s*(20\d{2})/)
  return sem && ay ? { ay: `${ay[1]}–${ay[2]}`, sem } : null
}

type CodeMatch = { id: string; used: number; exact: boolean; shared?: boolean } | 'ambiguous' | null

/** Tries the first 1–4 tokens as a subject code; exact (after folding) first, then a unique one-edit match. */
function matchCode(tokens: string[], codes: { id: string; folded: string; title: string }[]): CodeMatch {
  const max = Math.min(4, tokens.length)
  for (let k = max; k >= 1; k--) {
    const f = foldCode(tokens.slice(0, k).join(''))
    const hits = codes.filter((c) => c.folded === f)
    if (hits.length === 1) return { id: hits[0].id, used: k, exact: true }
    if (hits.length > 1) {
      // The same code printed twice in a prospectus: the title on the line decides.
      const rest = tokens.slice(k).join(' ').toLowerCase()
      const score = (t: string) => t.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && rest.includes(w)).length
      const best = [...hits].sort((a, b) => score(b.title) - score(a.title))[0]
      return { id: best.id, used: k, exact: true, shared: true }
    }
  }
  for (let k = max; k >= 2; k--) {
    const f = foldCode(tokens.slice(0, k).join(''))
    if (f.length < 4) continue
    const near = codes.filter((c) => distance(c.folded, f) === 1)
    if (near.length === 1) return { id: near[0].id, used: k, exact: false }
    if (near.length > 1) return 'ambiguous'
  }
  return null
}

/** "XYZ 999", "CS ELEC 3", "GE1O1": a short letter prefix with a digit right after it. */
function looksLikeCode(tokens: string[]): boolean {
  const [a = '', b = '', c = ''] = tokens
  if (/^[A-Za-z]{1,6}\d/.test(a)) return true
  return /^[A-Za-z]{1,6}$/.test(a) && (/\d/.test(b) || (/^[A-Za-z]{1,6}$/.test(b) && /\d/.test(c)))
}

export function parseGradeReport(text: string, curriculum: Curriculum): ScannedReport {
  const codes = curriculum.subjects.map((s) => ({ id: s.id, folded: foldCode(s.code), title: s.title }))
  const rows: ScannedRow[] = []
  const unmatched: ScannedReport['unmatched'] = []
  let term: TermRef | null = null

  text.split(/\r?\n/).forEach((line, i) => {
    const raw = line.trim()
    if (!raw) return
    const t = readTerm(raw)
    if (t) {
      term = t
      return
    }
    const tokens = raw.split(/\s+/)
    const m = matchCode(tokens, codes)
    if (!m || m === 'ambiguous') {
      // Only lines that look like a subject row are worth showing; legends and prose are skipped.
      if (readResult(tokens) && looksLikeCode(tokens)) unmatched.push({ lineNo: i + 1, raw })
      return
    }
    const result = readResult(tokens.slice(m.used))
    const issues: string[] = []
    if (!m.exact) issues.push('Code partly read')
    if (m.shared) issues.push('Code used twice in the prospectus')
    if (!result) issues.push('Grade not read')
    if (!term) issues.push('Term not read')
    rows.push({ key: String(i + 1), lineNo: i + 1, raw, subjectId: m.id, term, result, confidence: issues.length ? 'check' : 'high', issues })
  })

  const groups = new Map<string, ScannedRow[]>()
  for (const r of rows) {
    const k = `${r.subjectId}|${r.term?.ay}|${r.term?.sem}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  for (const g of groups.values())
    if (g.length > 1)
      for (const r of g) {
        r.issues.push('Listed twice')
        r.confidence = 'check'
      }

  return { rows, unmatched }
}

/** A grade typed by the dean: 50–100, or INC / UW / DRP. */
export function readGradeInput(v: string): RecordResult | null {
  const t = v.trim().toUpperCase()
  if (t === 'INC') return { kind: 'INC' }
  if (t === 'UW') return { kind: 'UW' }
  if (t === 'DRP') return { kind: 'Dropped' }
  if (!/^\d{2,3}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n >= 50 && n <= 100 ? { kind: 'grade', value: n } : null
}

export const termKey = (t: TermRef) => `${t.ay}|${t.sem}`

export function parseTermKey(k: string): TermRef | null {
  const [ay, sem] = k.split('|')
  if (!ay || !sem) return null
  return { ay, sem: sem === 'Summer' ? 'Summer' : (Number(sem) as Semester) }
}

/** Every term from the entry academic year up to `until`, newest first. */
export function termOptions(entryAY: string, until: TermRef | ActiveTerm): TermRef[] {
  const out: TermRef[] = []
  for (let ay = entryAY; termOrder({ ay, sem: 1 }) <= termOrder(until); ay = shiftAY(ay, 1))
    for (const sem of [1, 2, 'Summer'] as const) if (termOrder({ ay, sem }) <= termOrder(until)) out.push({ ay, sem })
  return out.reverse()
}

/* ---------------- Report header ---------------- */

export interface ScannedHeader {
  lastName?: string
  firstName?: string
  studentNo?: string
  program?: Program
  curriculumVersion?: CurriculumVersion
}

const titleCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

/** Student details printed above the grades. Only fields that were read are returned. */
export function parseReportHeader(text: string): ScannedHeader {
  const h: ScannedHeader = {}
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const name = line.match(/\bname\s*:?\s*([^,]+?)\s*,\s*(.+?)(?=\s+student\b|$)/i)
    if (name && h.lastName === undefined) {
      h.lastName = titleCase(name[1])
      h.firstName = titleCase(name[2])
    }
    const no = line.match(/student\s*no\.?\s*:?\s*(\d{4})\s*[-–]\s*(\d{3,6})/i)
    if (no && h.studentNo === undefined) h.studentNo = `${no[1]}-${no[2]}`
    if (/\bprogram\b/i.test(line) && h.program === undefined) {
      if (/\bBS\s*CS\b|computer\s+science/i.test(line)) h.program = 'BSCS'
      else if (/\bBS\s*IT\b|information\s+technology/i.test(line)) h.program = 'BSIT'
    }
    const cur = line.match(/curriculum\s*:?\s*(20\d{2})\s*[-–]\s*(20\d{2})/i)
    if (cur && h.curriculumVersion === undefined) {
      const v = `${cur[1]}–${cur[2]}`
      if (v === '2018–2019' || v === '2025–2026') h.curriculumVersion = v
    }
  }
  return h
}

/** Earliest academic year among scanned terms: the best guess for the entry year. */
export function earliestAY(terms: (TermRef | null)[]): string | undefined {
  const known = terms.filter((t): t is TermRef => !!t)
  if (!known.length) return undefined
  return known.reduce((a, b) => (termOrder({ ay: b.ay, sem: 1 }) < termOrder({ ay: a.ay, sem: 1 }) ? b : a)).ay
}

const sameTerm = (a: TermRef, b: TermRef) => a.ay === b.ay && a.sem === b.sem

/** Same subject in the same term replaces the existing entry; anything else is kept. */
export function mergeScannedRecords(
  existing: RecordEntry[],
  rows: { subjectId: string; term: TermRef; result: RecordResult }[],
): { keep: RecordEntry[]; add: Omit<RecordEntry, 'id'>[]; replaced: RecordEntry[] } {
  const replaced = existing.filter((e) => rows.some((r) => r.subjectId === e.subjectId && sameTerm(r.term, e.term)))
  return {
    keep: existing.filter((e) => !replaced.includes(e)),
    add: rows.map((r) => ({ subjectId: r.subjectId, term: r.term, result: r.result })),
    replaced,
  }
}

/* ---------------- Sample Report of Grades (synthetic, for testing scans) ---------------- */

export interface ReportRow {
  key: string
  code: string
  title: string
  units: number
  grade: string
  remark: string
}

const SEM_HEADING = { 1: 'FIRST SEMESTER', 2: 'SECOND SEMESTER', Summer: 'SUMMER' } as const

/** Rows of a printed Report of Grades, grouped by term in chronological order. Credited entries are not printed. */
export function reportSections(student: Student, curriculum: Curriculum): { heading: string; rows: ReportRow[] }[] {
  const byTerm = new Map<string, { term: TermRef; rows: ReportRow[] }>()
  for (const r of student.records) {
    const sub = curriculum.subjects.find((x) => x.id === r.subjectId)
    if (!sub || r.result.kind === 'Credited') continue
    const res = r.result
    const [grade, remark] =
      res.kind === 'grade'
        ? [String(res.value), res.value >= PASSING_GRADE ? 'PASSED' : 'FAILED']
        : res.kind === 'INC'
          ? res.completedGrade === undefined
            ? ['INC', 'INCOMPLETE']
            : [String(res.completedGrade), res.completedGrade >= PASSING_GRADE ? 'PASSED' : 'FAILED']
          : res.kind === 'UW'
            ? ['UW', 'UNAUTHORIZED WITHDRAWAL']
            : ['DRP', 'DROPPED']
    const k = `${r.term.ay}|${r.term.sem}`
    const g = byTerm.get(k) ?? { term: r.term, rows: [] }
    g.rows.push({ key: r.id, code: sub.code, title: sub.title, units: sub.units, grade, remark })
    byTerm.set(k, g)
  }
  return [...byTerm.values()]
    .sort((a, b) => termOrder(a.term) - termOrder(b.term))
    .map((g) => ({ heading: `${SEM_HEADING[g.term.sem]}, A.Y. ${g.term.ay}`, rows: g.rows }))
}
