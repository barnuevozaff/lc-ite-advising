import type { CurriculumVersion, Placement, Semester, TermRef, YearLevel } from './types'

/** The term loads are evaluated for (set by the dean): 1st sem, 2nd sem, or 3 = Summer. */
export type ActiveTerm = { ay: string; sem: Placement }
export const DEFAULT_TERM: ActiveTerm = { ay: '2026–2027', sem: 1 }
/** The active term. A live binding: the store updates it when the dean starts a new term. */
export let CURRENT_TERM: ActiveTerm = DEFAULT_TERM
export function setCurrentTerm(t: ActiveTerm) {
  CURRENT_TERM = t
}

export const YEAR_LABEL: Record<YearLevel, string> = {
  1: 'First Year',
  2: 'Second Year',
  3: 'Third Year',
  4: 'Fourth Year',
}
export const SEM_LABEL: Record<Placement, string> = { 1: 'First Semester', 2: 'Second Semester', 3: 'Summer' }

type AnyTerm = TermRef | ActiveTerm

/** 1, 2 or 3 (Summer), whether the term is a record term ('Summer') or the active term (3). */
export function placementOf(t: AnyTerm): Placement {
  return t.sem === 'Summer' || t.sem === 3 ? 3 : t.sem
}

/** The active term as a record term, e.g. to compare with grade records. */
export function asTermRef(t: ActiveTerm): TermRef {
  return { ay: t.ay, sem: t.sem === 3 ? 'Summer' : (t.sem as Semester) }
}

export function termLabel(t: AnyTerm, short = false): string {
  const p = placementOf(t)
  const sem = p === 3 ? 'Summer' : short ? (p === 1 ? '1st Sem' : '2nd Sem') : SEM_LABEL[p]
  return `${sem}, AY ${t.ay}`
}

export function termOrder(t: AnyTerm): number {
  const start = parseInt(t.ay.slice(0, 4), 10)
  return start * 10 + placementOf(t)
}

/** Shift an academic-year label like "2025–2026" by n years. */
export function shiftAY(ay: string, n: number): string {
  const start = parseInt(ay.slice(0, 4), 10) + n
  return `${start}–${start + 1}`
}

/**
 * Curriculum version is determined by the Academic Year in which the student
 * first entered the program, never by the current school year.
 */
export function curriculumVersionForEntryAY(entryAY: string): CurriculumVersion {
  return parseInt(entryAY.slice(0, 4), 10) >= 2025 ? '2025–2026' : '2018–2019'
}

export const ENTRY_AY_OPTIONS = ['2021–2022', '2022–2023', '2023–2024', '2024–2025', '2025–2026', '2026–2027']
