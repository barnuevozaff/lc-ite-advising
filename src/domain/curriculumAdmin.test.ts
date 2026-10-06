import { describe, expect, it } from 'vitest'
import { BSCS_2025, BSIT_2018, CURRICULA } from '../data/curricula'
import { seedOfferings, seedStudents } from '../data/seed'
import {
  applyPrerequisiteOverrides,
  filterSubjects,
  groupByTerm,
  prerequisiteCandidates,
  programsOf,
  resolveCurriculum,
  samePrerequisites,
  totals,
  versionsFor,
  wouldCreateCycle,
} from './curriculumAdmin'
import { evaluateStudent } from './rules'

const id = (c: typeof BSCS_2025, code: string) => c.subjects.find((s) => s.code === code)!.id

describe('curriculum selection', () => {
  it('lists programs and their versions from the curriculum data', () => {
    expect(programsOf(CURRICULA)).toEqual(['BSCS', 'BSIT'])
    expect(versionsFor(CURRICULA, 'BSIT')).toEqual(['2025–2026', '2018–2019'])
  })

  it('falls back to a valid curriculum when the program/version pair is invalid', () => {
    expect(resolveCurriculum(CURRICULA, 'BSIT', '2018–2019').id).toBe(BSIT_2018.id)
    expect(resolveCurriculum(CURRICULA, 'BSIT', '1999–2000').version).toBe('2025–2026')
    expect(resolveCurriculum(CURRICULA, 'BSXX', null).program).toBe('BSCS')
  })

  it('derives totals from the data', () => {
    const t = totals(BSCS_2025.subjects)
    expect(t.subjects).toBe(BSCS_2025.subjects.length)
    expect(t.units).toBe(BSCS_2025.subjects.reduce((n, s) => n + s.units, 0))
  })
})

describe('filters and grouping', () => {
  it('filters by code, title, year and semester', () => {
    expect(filterSubjects(BSCS_2025.subjects, { q: 'c103b' }).map((s) => s.code)).toEqual(['ITE C103b'])
    expect(filterSubjects(BSCS_2025.subjects, { q: 'intermediate' }).map((s) => s.code)).toEqual(['ITE C103b'])
    const y1s2 = filterSubjects(BSCS_2025.subjects, { year: 1, semester: 2 })
    expect(y1s2.every((s) => s.year === 1 && s.semester === 2)).toBe(true)
  })

  it('filters by offered status', () => {
    const offered = new Set(seedOfferings())
    const on = filterSubjects(BSCS_2025.subjects, { status: 'offered' }, offered)
    const off = filterSubjects(BSCS_2025.subjects, { status: 'notOffered' }, offered)
    expect(on.length + off.length).toBe(BSCS_2025.subjects.length)
    expect(on.every((s) => offered.has(s.id))).toBe(true)
  })

  it('groups year then semester in order', () => {
    const g = groupByTerm([...BSCS_2025.subjects].reverse())
    expect(g.map((y) => y.year)).toEqual([1, 2, 3, 4])
    expect(g[0].semesters.map((s) => s.semester)).toEqual([1, 2])
  })
})

describe('prerequisite editing', () => {
  it('blocks self and circular prerequisites', () => {
    const c102a = id(BSCS_2025, 'ITE C102a')
    const c103b = id(BSCS_2025, 'ITE C103b')
    const p113b = id(BSCS_2025, 'ITE P113b')
    expect(wouldCreateCycle(BSCS_2025, c102a, c102a)).toBe(true)
    // ITE C103b depends on ITE C102a, so C102a cannot require C103b.
    expect(wouldCreateCycle(BSCS_2025, c102a, c103b)).toBe(true)
    // Transitive: ITE P113b depends on C102a through C103b → ELEC 5 → P128 → P113.
    expect(wouldCreateCycle(BSCS_2025, c102a, p113b)).toBe(true)
    // A legitimate, non-circular choice.
    expect(wouldCreateCycle(BSCS_2025, c103b, id(BSCS_2025, 'GE 103'))).toBe(false)
  })

  it('compares prerequisite sets regardless of order', () => {
    const a = [
      { kind: 'subject', subjectId: 'x' },
      { kind: 'standing', year: 3 },
    ] as const
    expect(samePrerequisites([...a], [a[1], a[0]])).toBe(true)
    expect(samePrerequisites([...a], [a[0]])).toBe(false)
  })

  it('applies recorded changes to the evaluation, without touching the source data', () => {
    const students = seedStudents()
    const bea = students.find((s) => s.id === 's-bea')!
    const offerings = new Set(seedOfferings())
    const ge6 = id(BSCS_2025, 'GE 107')
    // Baseline: GE 107 has no prerequisites and is eligible for Bea.
    expect(evaluateStudent(bea, offerings, []).subjects[ge6].status).toBe('eligible')

    // Require Third Year standing for GE 107: Bea is Second Year, so it becomes blocked.
    const curricula = applyPrerequisiteOverrides(CURRICULA, {
      [ge6]: { prerequisites: [{ kind: 'standing', year: 3 }], reference: 'Memo 1', at: '2026-10-05' },
    })
    const ev = evaluateStudent(bea, offerings, [], curricula)
    expect(ev.subjects[ge6].status).toBe('blocked')
    expect(BSCS_2025.subjects.find((s) => s.id === ge6)!.prerequisites).toEqual([])
  })
})

describe('prerequisite candidates', () => {
  const c104 = BSIT_2018.subjects.find((s) => s.code === 'ITE C104')!

  it('only offers subjects from the same curriculum, in curriculum order', () => {
    const groups = prerequisiteCandidates(BSIT_2018, c104.id)
    const subjects = groups.flatMap((y) => y.semesters.flatMap((s) => s.candidates.map((c) => c.subject)))
    expect(subjects.length).toBe(BSIT_2018.subjects.length)
    expect(subjects.every((s) => BSIT_2018.subjects.includes(s))).toBe(true)
    expect(groups.map((g) => g.year)).toEqual([1, 2, 3, 4])
  })

  it('flags the subject itself and later placements', () => {
    const flat = prerequisiteCandidates(BSIT_2018, c104.id).flatMap((y) => y.semesters.flatMap((s) => s.candidates))
    expect(flat.find((c) => c.subject.id === c104.id)?.isSelf).toBe(true)
    expect(flat.find((c) => c.subject.code === 'ITE C102')?.later).toBe(false)
    expect(flat.find((c) => c.subject.code === 'ITE P109')?.later).toBe(true)
  })

  it('marks choices that would create a cycle', () => {
    // ITE P109 requires ITE C104, so C104 cannot require ITE P109.
    const flat = prerequisiteCandidates(BSIT_2018, c104.id).flatMap((y) => y.semesters.flatMap((s) => s.candidates))
    expect(flat.find((c) => c.subject.code === 'ITE P109')?.circular).toBe(true)
  })

  it('searches by code or title and keeps year/semester context', () => {
    const byCode = prerequisiteCandidates(BSCS_2025, id(BSCS_2025, 'ITE ELEC 5'), 'C103')
    expect(byCode).toHaveLength(1)
    expect(byCode[0].year).toBe(1)
    expect(byCode[0].semesters[0].semester).toBe(2)
    expect(byCode[0].semesters[0].candidates.map((c) => c.subject.code)).toEqual(['ITE C103b'])
    const byTitle = prerequisiteCandidates(BSCS_2025, id(BSCS_2025, 'ITE ELEC 5'), 'programming')
    const codes = byTitle.flatMap((y) => y.semesters.flatMap((s) => s.candidates.map((c) => c.subject.code)))
    expect(codes).toEqual(expect.arrayContaining(['ITE C102a', 'ITE C103b', 'ITE ELEC 5']))
    expect(prerequisiteCandidates(BSCS_2025, id(BSCS_2025, 'GE 107'), 'database')).toEqual([])
  })
})
