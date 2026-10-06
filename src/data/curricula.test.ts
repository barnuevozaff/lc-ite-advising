import { describe, expect, it } from 'vitest'
import { BSCS_2018, BSCS_2025, BSIT_2018, BSIT_2025, CURRICULA } from './curricula'

const sum = (c: typeof BSCS_2018) => c.subjects.reduce((a, s) => a + s.units, 0)
const code = (c: typeof BSCS_2018, k: string) => c.subjects.filter((s) => s.code === k)

describe('official curriculum transcription', () => {
  it('matches the subject counts and unit totals of the four prospectuses', () => {
    expect([BSCS_2018, BSIT_2018, BSCS_2025, BSIT_2025].map((c) => [c.subjects.length, sum(c)])).toEqual([
      [53, 155],
      [52, 152],
      [54, 158],
      [54, 161],
    ])
  })

  it('matches the subject count and units of every semester in the source', () => {
    // [subjects, units] per placement, from the "Sum of listed prospectus units" lines of the source.
    const expected: Record<string, Record<string, [number, number]>> = {
      'BSCS-2018–2019': { '1.1': [8, 23], '1.2': [8, 23], '2.1': [8, 23], '2.2': [7, 20], '3.1': [6, 18], '3.2': [6, 18], '3.3': [2, 6], '4.1': [5, 15], '4.2': [3, 9] },
      'BSIT-2018–2019': { '1.1': [8, 23], '1.2': [8, 23], '2.1': [7, 20], '2.2': [6, 17], '3.1': [6, 18], '3.2': [7, 21], '3.3': [2, 6], '4.1': [5, 15], '4.2': [3, 9] },
      'BSCS-2025–2026': { '1.1': [9, 26], '1.2': [9, 26], '2.1': [8, 23], '2.2': [8, 23], '3.1': [7, 21], '3.2': [8, 24], '4.1': [4, 12], '4.2': [1, 3] },
      'BSIT-2025–2026': { '1.1': [9, 26], '1.2': [9, 26], '2.1': [8, 23], '2.2': [8, 23], '3.1': [8, 24], '3.2': [8, 24], '4.1': [3, 9], '4.2': [1, 6] },
    }
    for (const c of CURRICULA) {
      const got: Record<string, [number, number]> = {}
      for (const s of c.subjects) {
        const k = `${s.year}.${s.semester}`
        got[k] = [(got[k]?.[0] ?? 0) + 1, (got[k]?.[1] ?? 0) + s.units]
      }
      expect(got, c.id).toEqual(expected[c.id])
    }
  })

  it('has unique ids and only resolvable, acyclic prerequisites', () => {
    for (const c of CURRICULA) {
      const ids = new Set(c.subjects.map((s) => s.id))
      expect(ids.size, c.id).toBe(c.subjects.length)
      for (const s of c.subjects) for (const p of s.prerequisites) if (p.kind === 'subject') expect(ids.has(p.subjectId), `${c.id} ${s.code}`).toBe(true)
      const visit = (id: string, seen: Set<string>): void => {
        expect(seen.has(id), `cycle at ${id}`).toBe(false)
        const s = c.subjects.find((x) => x.id === id)!
        for (const p of s.prerequisites) if (p.kind === 'subject') visit(p.subjectId, new Set([...seen, id]))
      }
      for (const s of c.subjects) visit(s.id, new Set())
    }
  })

  it('treats every subject in "/", "," or ";" as required', () => {
    const it104 = code(BSCS_2018, 'ITE C104')[0]
    expect(it104.prereqText).toBe('ITE C101/ITE C102')
    expect(it104.prerequisites.map((p) => p.kind === 'subject' && code(BSCS_2018, 'ITE C101')[0].id === p.subjectId)).toContain(true)
    expect(it104.prerequisites).toHaveLength(2)
    expect(code(BSIT_2025, 'ITE C106')[0].prerequisites).toHaveLength(2)
    expect(code(BSIT_2025, 'ITE ELEC 6')[0].prerequisites).toHaveLength(2)
  })

  it('reads year-standing requirements as standing, not as subjects', () => {
    expect(code(BSCS_2018, 'ITE P401')[0].prerequisites).toEqual([{ kind: 'standing', year: 3 }])
    expect(code(BSCS_2025, 'ITE P132')[0].prerequisites).toEqual([{ kind: 'standing', year: 3 }])
    expect(code(BSIT_2025, 'ITE P116')[0].prerequisites).toEqual([{ kind: 'standing', year: 3 }])
    expect(code(BSCS_2025, 'ITE P117')[0].prerequisites).toEqual([{ kind: 'standing', year: 4 }])
  })

  it('places the 2018 third-year summer subjects in summer', () => {
    expect(code(BSCS_2018, 'ITE P401')[0]).toMatchObject({ year: 3, semester: 3 })
    expect(code(BSIT_2018, 'ITE P112')[0]).toMatchObject({ year: 3, semester: 3 })
    expect(BSCS_2025.subjects.some((s) => s.semester === 3)).toBe(false)
  })

  it('keeps source conflicts visible instead of silently correcting them', () => {
    const p119 = code(BSIT_2025, 'ITE P119')
    expect(p119.map((s) => [s.title, s.units, s.year, s.semester])).toEqual([
      ['Discrete Mathematics', 3, 1, 2],
      ['Practicum', 6, 4, 2],
    ])
    expect(p119.every((s) => s.verify)).toBe(true)
    const pe117 = code(BSCS_2025, 'PE 117')[0]
    expect(pe117).toMatchObject({ prereqText: 'PE 117', prerequisites: [] })
    expect(pe117.verify).toMatch(/own prerequisite/)
    expect(code(BSIT_2025, 'ITE P114')[0]).toMatchObject({ year: 3, semester: 2, prerequisites: [{ kind: 'standing', year: 4 }] })
    expect(code(BSIT_2025, 'ITE P114')[0].verify).toBeTruthy()
  })

  it('does not turn a blank, a dash or a missing sheet into "none"', () => {
    for (const [c, k] of [
      [BSCS_2018, 'CS ELEC 1'],
      [BSCS_2025, 'RES 311'],
      [BSIT_2018, 'RES 311'],
      [BSIT_2018, 'FL 111'],
      [BSCS_2018, 'FIL 111'],
    ] as const) {
      const s = code(c, k)[0]
      expect(s.prereqOnFile, `${c.id} ${k}`).toBe(false)
      expect(s.verify, `${c.id} ${k}`).toBeTruthy()
    }
    expect(code(BSCS_2018, 'GE 101')[0]).toMatchObject({ prereqText: 'none', prereqOnFile: true, verify: undefined })
  })

  it('keeps the program-specific rules (BSIT 2018 ITE C103 needs ITE C102, ITE P102 needs ITE C101)', () => {
    const id = (k: string) => code(BSIT_2018, k)[0].id
    expect(code(BSIT_2018, 'ITE C103')[0].prerequisites).toEqual([{ kind: 'subject', subjectId: id('ITE C102') }])
    expect(code(BSIT_2018, 'ITE P102')[0].prerequisites).toEqual([{ kind: 'subject', subjectId: id('ITE C101') }])
    expect(code(BSCS_2018, 'ITE C103')[0].prereqText).toBe('ITE C101')
  })

  it('encodes the BSIT 2018 fourth-year prerequisites from the prerequisite sheet', () => {
    const id = (k: string) => code(BSIT_2018, k)[0].id
    const pre = (k: string) => code(BSIT_2018, k)[0].prerequisites
    expect(pre('ITE P113')).toEqual([{ kind: 'subject', subjectId: id('ITE P110') }])
    expect(pre('ITE P114')).toEqual([{ kind: 'standing', year: 4 }])
    expect(pre('ITE ELEC 3')).toEqual([{ kind: 'subject', subjectId: id('ITE C105') }])
    expect(pre('ITE ELEC 4')).toEqual([{ kind: 'subject', subjectId: id('ITE P104') }])
    expect(pre('ITE P118')).toEqual([{ kind: 'standing', year: 3 }])
    expect(pre('ITE P115')).toEqual([{ kind: 'subject', subjectId: id('ITE P114') }])
    expect(pre('ITE P116')).toEqual([{ kind: 'subject', subjectId: id('ITE P113') }])
    expect(code(BSIT_2018, 'ENG 300')[0]).toMatchObject({ prerequisites: [], prereqOnFile: true })
    for (const k of ['ITE P113', 'ITE P114', 'ITE ELEC 3', 'ITE ELEC 4', 'ITE P118', 'ITE P115', 'ITE P116', 'ENG 300']) expect(code(BSIT_2018, k)[0].verify, k).toBeUndefined()
  })
})
