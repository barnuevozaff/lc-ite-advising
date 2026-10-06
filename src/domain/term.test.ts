import { afterEach, describe, expect, it } from 'vitest'
import { seedOfferings, seedStudents } from '../data/seed'
import { CURRICULA } from '../data/curricula'
import { diffWrites } from '../firebase/sync'
import { initial, reducer } from '../store/AppStore'
import { evaluateStudent } from './rules'
import { CURRENT_TERM, DEFAULT_TERM, setCurrentTerm, termLabel } from './term'
import { BSIT_2018 } from '../data/curricula'

afterEach(() => setCurrentTerm(DEFAULT_TERM))

describe('active term', () => {
  it('the rule engine follows the active term', () => {
    // Bea has finished every subject up to 2nd year, 1st semester.
    const bea = seedStudents().find((s) => s.id === 's-bea')!
    const all = new Set(CURRICULA.flatMap((c) => c.subjects.map((s) => s.id)))
    expect(evaluateStudent(bea, all, []).classification).toBe('regular')
    setCurrentTerm({ ay: '2026–2027', sem: 2 })
    expect(CURRENT_TERM).toEqual({ ay: '2026–2027', sem: 2 })
    // In 2nd semester her 2nd-year 1st-semester subjects are now behind her and not yet graded.
    expect(evaluateStudent(bea, all, []).classification).toBe('irregular')
  })

  it('starting a term archives requests, offers that semester’s subjects, and logs it', () => {
    const a = initial()
    const b = reducer(a, { type: 'startTerm', term: { ay: '2026–2027', sem: 2 } })
    expect(b.term).toEqual({ ay: '2026–2027', sem: 2 })
    expect(b.advising).toEqual({})
    expect(b.archive['2026–2027|1']).toEqual(a.advising)
    const sem2 = new Set(CURRICULA.flatMap((c) => c.subjects.filter((s) => s.semester === 2).map((s) => s.id)))
    expect(new Set(b.offerings)).toEqual(sem2)
    expect(b.audit[0]).toMatchObject({ role: 'dean', action: 'Started Second Semester, AY 2026–2027' })
  })

  it('starting the same term again changes nothing', () => {
    const a = initial()
    expect(reducer(a, { type: 'startTerm', term: a.term })).toBe(a)
  })

  it('live mode archives and removes the old requests and saves the term', () => {
    const a = initial()
    const b = reducer(a, { type: 'startTerm', term: { ay: '2026–2027', sem: 2 } })
    const w = diffWrites(a, b)
    expect(w).toContainEqual({ op: 'set', path: 'config/term', data: { ay: '2026–2027', sem: 2 } })
    expect(w.some((x) => x.op === 'set' && x.path === 'archive/2026–2027_1')).toBe(true)
    expect(w.filter((x) => x.op === 'delete').map((x) => (x.op === 'delete' ? x.path : ''))).toEqual(Object.keys(a.advising).map((id) => `requests/${id}`))
  })

  it('seed offerings are unchanged by default', () => {
    expect(initial().offerings).toEqual(seedOfferings())
  })

  it('a Summer term offers the summer subjects and labels itself Summer', () => {
    const b = reducer(initial(), { type: 'startTerm', term: { ay: '2025–2026', sem: 3 } })
    const summer = new Set(CURRICULA.flatMap((c) => c.subjects.filter((s) => s.semester === 3).map((s) => s.id)))
    expect(new Set(b.offerings)).toEqual(summer)
    expect(b.audit[0].action).toBe('Started Summer, AY 2025–2026')
    expect(termLabel({ ay: '2025–2026', sem: 3 })).toBe('Summer, AY 2025–2026')
    expect(termLabel({ ay: '2025–2026', sem: 3 }, true)).toBe('Summer, AY 2025–2026')
  })

  it('in Summer, a regular third-year 2018 student gets the summer subjects of their year', () => {
    setCurrentTerm({ ay: '2025–2026', sem: 3 })
    const all = new Set(CURRICULA.flatMap((c) => c.subjects.map((s) => s.id)))
    const third = BSIT_2018.subjects.filter((s) => s.year < 3 || (s.year === 3 && s.semester < 3))
    const st = {
      id: 'x', studentNo: '2023-1', firstName: 'A', lastName: 'B', program: 'BSIT' as const, entryAY: '2023–2024', curriculumVersion: '2018–2019' as const,
      yearStanding: 3 as const, transferee: false,
      records: third.map((s, i) => ({ id: `r${i}`, subjectId: s.id, term: { ay: '2024–2025', sem: 1 as const }, result: { kind: 'grade' as const, value: 85 } })),
    }
    const ev = evaluateStudent(st, all, [])
    expect(ev.classification).toBe('regular')
    if (ev.load.kind !== 'prescribed') throw new Error('expected prescribed')
    expect(ev.load.lines.map((l) => ev.subjects[l.subjectId].subject.code).sort()).toEqual(['ITE P112', 'ITE P117'])
  })
})
