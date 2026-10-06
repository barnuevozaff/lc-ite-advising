import { describe, expect, it } from 'vitest'
import { BSCS_2025, BSIT_2018, BSIT_2025 } from '../data/curricula'
import { seedOfferings, seedStudents } from '../data/seed'
import { evaluateStudent, resultText } from './rules'
import { curriculumVersionForEntryAY } from './term'

const students = Object.fromEntries(seedStudents().map((s) => [s.id, s]))
const offerings = new Set(seedOfferings())
const ev = (id: string) => evaluateStudent(students[id], offerings, [])
const sid = (c: typeof BSCS_2025, code: string) => c.subjects.find((s) => s.code === code)!.id

// Scenario categories from Table 5 of the proposal.
describe('rule-based evaluation scenarios', () => {
  it('assigns the curriculum version from the entry academic year', () => {
    expect(curriculumVersionForEntryAY('2024–2025')).toBe('2018–2019')
    expect(curriculumVersionForEntryAY('2025–2026')).toBe('2025–2026')
  })

  it('regular student gets the prescribed load', () => {
    const e = ev('s-bea')
    expect(e.classification).toBe('regular')
    expect(e.load.kind).toBe('prescribed')
  })

  it('failed subject blocks its prerequisite chain and is offered for retake', () => {
    const e = ev('s-jerome')
    expect(e.classification).toBe('irregular')
    expect(e.subjects[sid(BSCS_2025, 'ITE C103b')].status).toBe('failed')
    const p113b = e.subjects[sid(BSCS_2025, 'ITE P113b')]
    expect(p113b.status).toBe('blocked')
    expect(p113b.chains[0][0].label).toBe('ITE C103b')
    expect(e.load.kind === 'recommended' && e.load.lines.some((l) => l.basis === 'retake')).toBe(true)
  })

  it('INC is pending and blocks dependents', () => {
    const e = ev('s-kristine')
    expect(e.subjects[sid(BSIT_2025, 'ITE C103b')].status).toBe('pending')
    expect(e.subjects[sid(BSIT_2025, 'ITE P104')].status).toBe('blocked')
  })

  it('explicit year standing blocks; missing standing needs a record update', () => {
    expect(ev('s-paolo').subjects[sid(BSCS_2025, 'ITE P132')].status).toBe('blocked')
    const rommel = ev('s-rommel')
    expect(rommel.classification).toBe('undetermined')
    expect(rommel.subjects[sid(BSIT_2018, 'ITE P117')].status).toBe('recordUpdate')
  })

  it('a failed earlier subject establishes irregular status despite missing data', () => {
    expect(ev('s-angelica').classification).toBe('irregular')
  })

  it('unvalidated credit requires dean review and does not satisfy prerequisites', () => {
    const e = ev('s-paolo')
    expect(e.subjects[sid(BSCS_2025, 'ITE P101')].status).toBe('deanReview')
    expect(e.subjects[sid(BSCS_2025, 'ITE P127')].status).toBe('blocked')
  })

  it('recommended load contains only eligible and offered subjects', () => {
    const e = ev('s-jerome')
    if (e.load.kind !== 'recommended') throw new Error('expected recommendation')
    for (const l of e.load.lines) {
      const x = e.subjects[l.subjectId]
      expect(x.offered).toBe(true)
      expect(['eligible', 'failed']).toContain(x.status)
    }
  })

  it('UW is a non-pass that can be retaken when offered', () => {
    const cs121 = Object.values(ev('s-dominic').subjects).find((x) => x.subject.code === 'ITE P306')!
    expect(cs121.status).toBe('failed')
    expect(cs121.reason).toContain('Unauthorized withdrawal (UW)')
  })

  it('labels remarks as UW and DRP', () => {
    const t = { ay: '2025–2026', sem: 1 as const }
    expect(resultText({ id: 'x', subjectId: 'y', term: t, result: { kind: 'UW' } })).toBe('UW')
    expect(resultText({ id: 'x', subjectId: 'y', term: t, result: { kind: 'Dropped' } })).toBe('DRP')
  })

  it('a subject whose prerequisite is not on file is usable and reads like one with no prerequisite', () => {
    const e = ev('s-liza')
    const blank = Object.values(e.subjects).filter((x) => !x.subject.prereqOnFile)
    expect(blank.length).toBeGreaterThan(0)
    for (const x of blank) {
      expect(x.note, x.subject.code).toBeUndefined()
      if (x.status === 'eligible' || x.status === 'notOffered') expect(x.reason, x.subject.code).toMatch(/^No prerequisites\./)
    }
    // A normal subject with "none" carries no such note.
    expect(e.subjects[sid(BSIT_2018, 'GE 101')].note).toBeUndefined()
  })
})
