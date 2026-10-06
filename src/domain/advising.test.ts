import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BSCS_2018, BSCS_2025, BSIT_2025 } from '../data/curricula'
import { seedOfferings, seedStudents } from '../data/seed'
import { activeStudents, initial, load, reducer, STORAGE_KEY, studentIdForScan, type AppState } from '../store/AppStore'
import {
  advisingIssues,
  decidedSubjects,
  canAddToLoad,
  composeLoad,
  filterRequests,
  loadSubjectView,
  requestContext,
  requestStatus,
  studentVisibleLoad,
  validateLoad,
} from './advising'
import { evaluateStudent, unitsOf } from './rules'
import { CURRENT_TERM } from './term'
import type { AdvisingRecord } from './types'

const students = Object.fromEntries(seedStudents().map((s) => [s.id, s]))
const offerings = new Set(seedOfferings())
const ev = (id: string) => evaluateStudent(students[id], offerings, [])
const sid = (c: typeof BSCS_2025, code: string) => c.subjects.find((s) => s.code === code)!.id
const view = (id: string, rec?: AdvisingRecord) => {
  const e = ev(id)
  return loadSubjectView(e, new Set(composeLoad(e, rec)), new Set(rec?.removed ?? []))
}
const blank = (studentId: string, extra: Partial<AdvisingRecord> = {}): AdvisingRecord => ({ studentId, removed: [], remarks: '', caseDecisions: [], ...extra })

describe('advising records list', () => {
  const rows = seedStudents().map((s) => ({ ev: evaluateStudent(s, offerings, []) }))

  it('filters by program', () => {
    const r = filterRequests(rows, { program: 'BSIT' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.ev.student.program === 'BSIT')).toBe(true)
  })

  it('filters by year level', () => {
    const r = filterRequests(rows, { year: '2' })
    expect(r.every((x) => x.ev.student.yearStanding === 2)).toBe(true)
  })

  it('combines program, year and search', () => {
    const r = filterRequests(rows, { program: 'BSIT', year: '2', q: 'abre' })
    expect(r.map((x) => x.ev.student.id)).toEqual(['s-kristine'])
    expect(filterRequests(rows, { program: 'BSCS', year: '2', q: 'abre' })).toEqual([])
  })

  it('derives issue labels from the evaluation only', () => {
    expect(advisingIssues(ev('s-jerome'))).toContain('1 failed')
    expect(advisingIssues(ev('s-kristine'))).toContain('1 INC')
    expect(advisingIssues(ev('s-rommel'))).toContain('Record needs update')
    expect(advisingIssues(ev('s-bea'))).toEqual([])
  })
})

describe('dean load workspace', () => {
  it('uses the student’s own curriculum', () => {
    expect(ev('s-bea').curriculum.id).toBe(BSCS_2025.id)
    expect(ev('s-dominic').curriculum.id).toBe(BSCS_2018.id)
  })

  it('completed subjects cannot be added', () => {
    const v = view('s-bea')[sid(BSCS_2025, 'ITE C102a')]
    expect(v.state).toBe('completed')
    expect(v.addable).toBe(false)
  })

  it('selected subjects are not offered again', () => {
    const v = view('s-bea')[sid(BSCS_2025, 'ITE P123')]
    expect(v.state).toBe('selected')
    expect(v.addable).toBe(false)
  })

  it('prerequisite-blocked subjects cannot be added and say why', () => {
    const v = view('s-jerome')[sid(BSCS_2025, 'ITE ELEC 5')]
    expect(v.state).toBe('prerequisite')
    expect(v.addable).toBe(false)
    expect(v.reason).toContain('ITE C103b')
  })

  it('INC blocks dependents as unresolved, per the existing rule', () => {
    const vs = loadSubjectView(ev('s-kristine'), new Set(), new Set())
    expect(vs[sid(BSIT_2025, 'ITE C103b')].state).toBe('inc')
    expect(vs[sid(BSIT_2025, 'ITE C103b')].addable).toBe(false)
    expect(vs[sid(BSIT_2025, 'ITE P104')].reason).toBe('Prerequisite unresolved: INC in ITE C103b')
  })

  it('UW is treated as failed; a DRP subject offered this term can be retaken', () => {
    const vs = loadSubjectView(ev('s-dominic'), new Set(), new Set())
    expect(vs[sid(BSCS_2018, 'ITE P306')].reason).toContain('UW')
    expect(vs[sid(BSCS_2018, 'FL 111')]).toMatchObject({ state: 'available', addable: true, reason: 'Retake · DRP' })
    expect(vs[sid(BSCS_2018, 'FL 112')].reason).toContain('FL 111 dropped')
  })

  it('year-standing restrictions and offerings are respected', () => {
    const vs = view('s-bea')
    expect(vs[sid(BSCS_2025, 'ITE P117')]).toMatchObject({ state: 'standing', addable: false })
    expect(vs[sid(BSCS_2025, 'MATH 221')]).toMatchObject({ state: 'notOffered', addable: false })
  })

  it('valid subjects can be added; failed subjects offered for retake are addable', () => {
    const jerome = view('s-jerome')
    expect(canAddToLoad(ev('s-jerome').subjects[sid(BSCS_2025, 'ITE C103b')])).toBe(true)
    // GE 109 is eligible and offered, so it is in the proposal; removing it makes it addable again.
    const ge9 = sid(BSCS_2025, 'GE 109')
    expect(jerome[ge9].state).toBe('selected')
    const afterRemove = view('s-jerome', blank('s-jerome', { removed: [ge9] }))
    expect(afterRemove[ge9]).toMatchObject({ state: 'available', addable: true })
  })

  it('add and remove update count and units', () => {
    const e = ev('s-jerome')
    const base = composeLoad(e, blank('s-jerome'))
    const ge9 = sid(BSCS_2025, 'GE 109')
    const removed = composeLoad(e, blank('s-jerome', { removed: [ge9] }))
    expect(removed.length).toBe(base.length - 1)
    expect(unitsOf(removed)).toBe(unitsOf(base) - 3)
    const readded = composeLoad(e, blank('s-jerome', { removed: [], added: [ge9] }))
    expect(readded).toEqual(base)
  })

  it('validation blocks subjects that are no longer valid', () => {
    const e = ev('s-jerome')
    const elec5 = sid(BSCS_2025, 'ITE ELEC 5')
    expect(validateLoad(e, composeLoad(e, blank('s-jerome')))).toEqual([])
    const issues = validateLoad(e, [...composeLoad(e, blank('s-jerome')), elec5])
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toContain('ITE ELEC 5')
    expect(validateLoad(e, [])[0].message).toBe('The load has no subjects.')
  })
})

describe('suggested load size', () => {
  it('an irregular suggestion stays within the normal load, retakes and back subjects first', () => {
    const e = ev('s-jerome')
    if (e.load.kind !== 'recommended') throw new Error('expected recommended')
    const ids = e.load.lines.map((l) => l.subjectId)
    expect(unitsOf(ids)).toBeLessThanOrEqual(e.normalUnits!)
    const order = { retake: 0, back: 1, current: 2, prescribed: 2, unplaced: 2, ahead: 3, higherYear: 4 }
    const ranks = e.load.lines.map((l) => order[l.basis])
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })

  it('caps the suggestion when many subjects are open (a second-year record with one grade)', () => {
    const bea = seedStudents().find((x) => x.id === 's-bea')!
    const nstp = bea.records.find((r) => BSCS_2025.subjects.find((x) => x.id === r.subjectId)!.code === 'NSTP 112')!
    const e = evaluateStudent({ ...bea, records: [nstp] }, offerings, [])
    if (e.load.kind !== 'recommended') throw new Error('expected recommended')
    const ids = e.load.lines.map((l) => l.subjectId)
    expect(unitsOf(ids)).toBeLessThanOrEqual(23)
    expect(e.load.lines.every((l) => l.basis === 'back')).toBe(true)
  })

  it('a regular student gets only the subjects of the current semester of their year', () => {
    const e = ev('s-bea')
    if (e.load.kind !== 'prescribed') throw new Error('expected prescribed')
    expect(e.load.lines.every((l) => e.subjects[l.subjectId].subject.year === 2 && e.subjects[l.subjectId].subject.semester === 1)).toBe(true)
  })
})

describe('dean allows a blocked subject', () => {
  const apply = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s)
  const elec5 = sid(BSCS_2025, 'ITE ELEC 5')

  it('adds it to the load with a reason, logs it, and passes validation', () => {
    const s = apply(initial(), { type: 'allowSubject', studentId: 's-jerome', subjectId: elec5, reason: 'Taking ITE C103b retake concurrently' })
    const rec = s.advising['s-jerome']
    expect(rec.allowed).toEqual([{ subjectId: elec5, reason: 'Taking ITE C103b retake concurrently', at: expect.any(String) }])
    const e = ev('s-jerome')
    const load = composeLoad(e, rec)
    expect(load).toContain(elec5)
    expect(validateLoad(e, load, rec)).toEqual([])
    expect(s.audit[0]).toMatchObject({ role: 'dean', studentId: 's-jerome', action: 'Allowed ITE ELEC 5 despite a prerequisite: Taking ITE C103b retake concurrently' })
  })

  it('needs a reason and is ignored after the decision', () => {
    expect(apply(initial(), { type: 'allowSubject', studentId: 's-jerome', subjectId: elec5, reason: '  ' }).advising['s-jerome'].allowed).toBeUndefined()
    const decided = initial().advising['s-dominic']
    expect(apply(initial(), { type: 'allowSubject', studentId: 's-dominic', subjectId: elec5, reason: 'x' }).advising['s-dominic']).toEqual(decided)
  })

  it('removing an allowed subject also withdraws the allowance', () => {
    const s = apply(initial(), { type: 'allowSubject', studentId: 's-jerome', subjectId: elec5, reason: 'x' }, { type: 'removeFromLoad', studentId: 's-jerome', subjectId: elec5 })
    expect(s.advising['s-jerome'].allowed).toEqual([])
    expect(composeLoad(ev('s-jerome'), s.advising['s-jerome'])).not.toContain(elec5)
  })

  it('the explorer shows the subject as allowed, not blocked', () => {
    const s = apply(initial(), { type: 'allowSubject', studentId: 's-jerome', subjectId: elec5, reason: 'x' })
    const rec = s.advising['s-jerome']
    const e = ev('s-jerome')
    const v = loadSubjectView(e, new Set(composeLoad(e, rec)), new Set(), rec)[elec5]
    expect(v).toMatchObject({ state: 'selected', reason: 'Allowed by the dean · x' })
  })
})

describe('archiving students', () => {
  const apply = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s)

  it('archives with a reason, keeps every record, and logs it', () => {
    const before = initial().students.find((x) => x.id === 's-jerome')!
    const s = apply(initial(), { type: 'archiveStudent', studentId: 's-jerome', reason: 'Transferred to another school' })
    const st = s.students.find((x) => x.id === 's-jerome')!
    expect(st.archived).toEqual({ reason: 'Transferred to another school', at: expect.any(String) })
    expect(st.records).toEqual(before.records)
    expect(s.advising['s-jerome']).toEqual(initial().advising['s-jerome'])
    expect(s.audit[0]).toMatchObject({ role: 'dean', studentId: 's-jerome', action: 'Archived the student: Transferred to another school' })
  })

  it('needs a reason', () => {
    expect(apply(initial(), { type: 'archiveStudent', studentId: 's-jerome', reason: ' ' }).students.find((x) => x.id === 's-jerome')!.archived).toBeUndefined()
  })

  it('restores an archived student', () => {
    const s = apply(initial(), { type: 'archiveStudent', studentId: 's-jerome', reason: 'x' }, { type: 'restoreStudent', studentId: 's-jerome' })
    expect(s.students.find((x) => x.id === 's-jerome')!.archived).toBeUndefined()
    expect(s.audit[0].action).toBe('Restored the student from the archive')
  })

  it('archived students are left out of active lists', () => {
    const s = apply(initial(), { type: 'archiveStudent', studentId: 's-jerome', reason: 'x' })
    expect(activeStudents(s.students).some((x) => x.id === 's-jerome')).toBe(false)
    expect(activeStudents(s.students)).toHaveLength(initial().students.length - 1)
  })
})

describe('decided subjects', () => {
  it('lists approved subjects, and marks ones no longer in the curriculum instead of crashing', () => {
    const e = ev('s-bea')
    const ge107 = sid(BSCS_2025, 'GE 107')
    expect(decidedSubjects(e, [ge107, 'it18-ge9'])).toEqual([
      { id: ge107, code: 'GE 107', title: 'The Contemporary World', units: 3, missing: false },
      { id: 'it18-ge9', code: '—', title: 'Not in the current curriculum. Reopen and re-evaluate.', units: 0, missing: true },
    ])
  })
})

describe('student request workflow', () => {
  const apply = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s)

  it('takes context from the profile and active term, not from input', () => {
    const c = requestContext(ev('s-bea'))
    expect(c).toEqual({ program: 'BSCS', curriculumVersion: '2025–2026', yearStanding: 2, term: CURRENT_TERM })
  })

  it('submits a request once and prevents duplicates', () => {
    const s1 = apply(initial(), { type: 'requestLoad', studentId: 's-bea' })
    const first = s1.advising['s-bea'].requestedAt
    expect(first).toBeTruthy()
    const s2 = apply(s1, { type: 'requestLoad', studentId: 's-bea' })
    expect(s2.advising['s-bea'].requestedAt).toBe(first)
    expect(s2.audit.filter((a) => a.studentId === 's-bea' && a.action.startsWith('Requested'))).toHaveLength(1)
  })

  it('moves from Submitted to Under review when the dean opens it', () => {
    const s1 = apply(initial(), { type: 'requestLoad', studentId: 's-bea' })
    expect(requestStatus(s1.advising['s-bea'])).toBe('submitted')
    const s2 = apply(s1, { type: 'startReview', studentId: 's-bea' })
    expect(requestStatus(s2.advising['s-bea'])).toBe('underReview')
  })

  it('never exposes a subject list before the decision, even with dean draft changes', () => {
    const ge6 = sid(BSCS_2025, 'GE 107')
    const s = apply(
      initial(),
      { type: 'requestLoad', studentId: 's-bea' },
      { type: 'startReview', studentId: 's-bea' },
      { type: 'removeFromLoad', studentId: 's-bea', subjectId: ge6 },
    )
    expect(s.advising['s-bea'].removed).toContain(ge6)
    expect(studentVisibleLoad(s.advising['s-bea'])).toBeNull()
  })

  it('shows exactly the dean-confirmed subjects after the decision', () => {
    const e = ev('s-bea')
    const ge6 = sid(BSCS_2025, 'GE 107')
    let s = apply(initial(), { type: 'requestLoad', studentId: 's-bea' }, { type: 'removeFromLoad', studentId: 's-bea', subjectId: ge6 })
    const final = composeLoad(e, s.advising['s-bea'])
    s = apply(s, { type: 'decide', studentId: 's-bea', kind: 'confirmed', subjectIds: final })
    const visible = studentVisibleLoad(s.advising['s-bea'])!
    expect(visible).toEqual(final)
    expect(visible).not.toContain(ge6)
    expect(visible.length).toBe(7)
    expect(unitsOf(visible)).toBe(20)
    // Changes after the decision are ignored.
    s = apply(s, { type: 'addToLoad', studentId: 's-bea', subjectId: ge6 })
    expect(studentVisibleLoad(s.advising['s-bea'])).toEqual(final)
  })

  it('a missing year standing is the dean’s step, not an action for the student', () => {
    const s = initial()
    // Rommel's request was opened by the dean; his year standing is not set yet.
    expect(requestStatus(s.advising['s-rommel'])).toBe('underReview')
    expect(requestStatus(s.advising['s-angelica'])).toBe('submitted')
  })

  it('dean sets year standing and it is audited as the dean', () => {
    const s = apply(initial(), { type: 'setStanding', studentId: 's-rommel', year: 2 })
    expect(s.students.find((x) => x.id === 's-rommel')!.yearStanding).toBe(2)
    expect(s.audit[0]).toMatchObject({ role: 'dean', studentId: 's-rommel' })
  })

  it('saves scanned grades, replacing the same subject and term', () => {
    const st = initial().students.find((x) => x.id === 's-jerome')!
    const first = st.records[0]
    const s = apply(initial(), {
      type: 'saveScannedRecords',
      studentId: 's-jerome',
      rows: [{ subjectId: first.subjectId, term: first.term, result: { kind: 'grade', value: 99 } }],
    })
    const recs = s.students.find((x) => x.id === 's-jerome')!.records
    const same = recs.filter((r) => r.subjectId === first.subjectId && r.term.ay === first.term.ay && r.term.sem === first.term.sem)
    expect(same).toHaveLength(1)
    expect(same[0].result).toEqual({ kind: 'grade', value: 99 })
    expect(recs.length).toBe(st.records.length)
    expect(s.audit[0]).toMatchObject({ role: 'dean', action: 'Encoded 1 grade from a scanned record', studentId: 's-jerome' })
  })

  describe('dean scans a grade record', () => {
    const t1 = { ay: '2025–2026', sem: 1 as const }
    const profile = { studentNo: '2025-77001', firstName: 'Ana', lastName: 'Reyes', program: 'BSCS' as const, entryAY: '2025–2026', yearStanding: 2 as const }
    const rows = [{ subjectId: sid(BSCS_2025, 'ITE C101'), term: t1, result: { kind: 'grade' as const, value: 88 } }]

    it('creates a new student, in the queue and under review', () => {
      const id = studentIdForScan(initial().students, profile.studentNo)
      const s = apply(initial(), { type: 'encodeScan', profile, rows })
      const st = s.students.find((x) => x.id === id)!
      expect(st).toMatchObject({ studentNo: '2025-77001', lastName: 'Reyes', program: 'BSCS', curriculumVersion: '2025–2026', yearStanding: 2 })
      expect(st.records).toHaveLength(1)
      expect(s.advising[id].requestedAt).toBeTruthy()
      expect(s.advising[id].reviewStartedAt).toBeTruthy()
      expect(s.audit.slice(0, 2).map((a) => a.action)).toEqual(['Encoded 1 grade from a scanned record', 'Created student record from a scanned grade record'])
    })

    it('updates an existing student found by student number instead of duplicating', () => {
      const jerome = initial().students.find((x) => x.id === 's-jerome')!
      expect(studentIdForScan(initial().students, ' 2025-10442 ')).toBe('s-jerome')
      const s = apply(initial(), { type: 'encodeScan', profile: { ...profile, studentNo: '2025-10442', firstName: 'X', yearStanding: 3 }, rows })
      expect(s.students).toHaveLength(initial().students.length)
      const st = s.students.find((x) => x.id === 's-jerome')!
      expect(st.firstName).toBe(jerome.firstName)
      expect(st.yearStanding).toBe(3)
      expect(st.records.length).toBe(jerome.records.length)
    })

    it('keeps an earlier decision untouched', () => {
      const before = initial().advising['s-liza']
      const liza = initial().students.find((x) => x.id === 's-liza')!
      const s = apply(initial(), { type: 'encodeScan', profile: { ...profile, studentNo: liza.studentNo }, rows: [] })
      expect(s.advising['s-liza']).toEqual(before)
    })

    it('a missing year standing does not erase the recorded one', () => {
      const s = apply(initial(), { type: 'encodeScan', profile: { ...profile, studentNo: '2025-10442', yearStanding: null }, rows: [] })
      expect(s.students.find((x) => x.id === 's-jerome')!.yearStanding).toBe(2)
    })
  })

  it('the dean reopens a decision with a reason, keeping the working load', () => {
    const s = apply(initial(), { type: 'reopen', studentId: 's-dominic', reason: 'Wrong subject approved' })
    expect(s.advising['s-dominic'].decision).toBeUndefined()
    expect(s.advising['s-dominic'].requestedAt).toBeTruthy()
    expect(s.audit[0]).toMatchObject({ role: 'dean', action: 'Reopened the decision: Wrong subject approved', studentId: 's-dominic' })
    expect(apply(initial(), { type: 'reopen', studentId: 's-bea', reason: 'x' }).advising['s-bea']).toEqual(initial().advising['s-bea'])
  })

  describe('persistence', () => {
    let store: Record<string, string>
    beforeEach(() => {
      store = {}
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => (store[k] = v),
        removeItem: (k: string) => delete store[k],
      })
    })

    it('with Firebase configured, the app starts empty and drops old demo data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial()))
      const s = load(true)
      expect(s).toMatchObject({ mode: 'live', students: [], advising: {}, audit: [], session: null })
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('keeps the decided load after a reload', () => {
      const final = composeLoad(ev('s-bea'), undefined)
      const s = apply(initial(), { type: 'requestLoad', studentId: 's-bea' }, { type: 'decide', studentId: 's-bea', kind: 'confirmed', subjectIds: final })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      expect(studentVisibleLoad(load(false).advising['s-bea'])).toEqual(final)
    })
  })
})
