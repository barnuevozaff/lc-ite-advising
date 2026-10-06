/**
 * Curriculum administration helpers: prerequisite edits recorded by the
 * dean, cycle prevention, and curriculum/offering filters.
 * Pure functions; the rule-based evaluation reads the effective curricula.
 */
import type { Curriculum, CurriculumSubject, Placement, Prerequisite, Program, YearLevel } from './types'

/** A recorded change to a subject's prerequisites, backed by an approval reference. */
export interface PrerequisiteOverride {
  prerequisites: Prerequisite[]
  reference: string
  at: string
}

/** Curricula with recorded prerequisite changes applied. Codes, titles, units and placement stay as encoded. */
export function applyPrerequisiteOverrides(curricula: Curriculum[], overrides: Record<string, PrerequisiteOverride>): Curriculum[] {
  if (!Object.keys(overrides).length) return curricula
  return curricula.map((c) => ({
    ...c,
    subjects: c.subjects.map((s) => (overrides[s.id] ? { ...s, prerequisites: overrides[s.id].prerequisites } : s)),
  }))
}

/**
 * True when making `candidateId` a prerequisite of `subjectId` would create a
 * circular relationship, i.e. the candidate already depends (directly or
 * through a chain) on the subject. Also true for the subject itself.
 */
export function wouldCreateCycle(curriculum: Curriculum, subjectId: string, candidateId: string): boolean {
  if (candidateId === subjectId) return true
  const byId = new Map(curriculum.subjects.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const stack = [candidateId]
  while (stack.length) {
    const id = stack.pop()!
    if (id === subjectId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const p of byId.get(id)?.prerequisites ?? []) if (p.kind === 'subject') stack.push(p.subjectId)
  }
  return false
}

export function programsOf(curricula: Curriculum[]): Program[] {
  return [...new Set(curricula.map((c) => c.program))].sort()
}

/** Versions available for a program, newest first. */
export function versionsFor(curricula: Curriculum[], program: Program | string) {
  return curricula
    .filter((c) => c.program === program)
    .map((c) => c.version)
    .sort((a, b) => b.localeCompare(a))
}

/** Resolve a program/version selection, falling back to a valid curriculum when the pair is invalid. */
export function resolveCurriculum(curricula: Curriculum[], program?: string | null, version?: string | null): Curriculum {
  const programs = programsOf(curricula)
  const p = program && programs.includes(program as Program) ? program : programs[0]
  const versions = versionsFor(curricula, p)
  const v = version && versions.includes(version as Curriculum['version']) ? version : versions[0]
  return curricula.find((c) => c.program === p && c.version === v)!
}

export function totals(subjects: CurriculumSubject[]) {
  return { subjects: subjects.length, units: subjects.reduce((n, s) => n + s.units, 0) }
}

export interface SubjectFilter {
  q?: string
  year?: YearLevel | null
  semester?: Placement | null
  /** Offerings view only. */
  status?: 'offered' | 'notOffered' | null
}

export function filterSubjects(subjects: CurriculumSubject[], f: SubjectFilter, offered: ReadonlySet<string> = new Set()) {
  const q = f.q?.trim().toLowerCase()
  return subjects.filter(
    (s) =>
      (!q || s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) &&
      (!f.year || s.year === f.year) &&
      (!f.semester || s.semester === f.semester) &&
      (!f.status || (f.status === 'offered' ? offered.has(s.id) : !offered.has(s.id))),
  )
}

/** Group subjects by year, then semester, preserving curriculum order. */
export function groupByTerm(subjects: CurriculumSubject[]) {
  const years: { year: YearLevel; semesters: { semester: Placement; subjects: CurriculumSubject[] }[] }[] = []
  for (const s of subjects) {
    let y = years.find((g) => g.year === s.year)
    if (!y) years.push((y = { year: s.year, semesters: [] }))
    let sem = y.semesters.find((g) => g.semester === s.semester)
    if (!sem) y.semesters.push((sem = { semester: s.semester, subjects: [] }))
    sem.subjects.push(s)
  }
  years.sort((a, b) => a.year - b.year)
  for (const y of years) y.semesters.sort((a, b) => a.semester - b.semester)
  return years
}

export function samePrerequisites(a: Prerequisite[], b: Prerequisite[]) {
  const key = (p: Prerequisite) => (p.kind === 'subject' ? `s:${p.subjectId}` : `y:${p.year}`)
  const ka = a.map(key).sort().join('|')
  const kb = b.map(key).sort().join('|')
  return ka === kb
}

export interface PrerequisiteCandidate {
  subject: CurriculumSubject
  /** The subject being edited; shown for orientation, never selectable. */
  isSelf: boolean
  /** Choosing it would create a circular prerequisite chain. */
  circular: boolean
  /** Placed in the same term as, or after, the subject being edited. */
  later: boolean
}

/**
 * Prerequisite candidates for a subject, scoped to its own curriculum and
 * grouped by year and semester in curriculum order. Search matches code or title.
 */
export function prerequisiteCandidates(curriculum: Curriculum, subjectId: string, query = '') {
  const self = curriculum.subjects.find((s) => s.id === subjectId)
  if (!self) return []
  const pos = (s: CurriculumSubject) => s.year * 10 + s.semester
  const q = query.trim().toLowerCase()
  const matches = curriculum.subjects.filter((s) => !q || s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
  return groupByTerm(matches).map((y) => ({
    year: y.year,
    semesters: y.semesters.map((g) => ({
      semester: g.semester,
      candidates: g.subjects.map(
        (s): PrerequisiteCandidate => ({
          subject: s,
          isSelf: s.id === subjectId,
          circular: s.id !== subjectId && wouldCreateCycle(curriculum, subjectId, s.id),
          later: pos(s) >= pos(self),
        }),
      ),
    })),
  }))
}
