import { describe, expect, it } from 'vitest'
import { initial, reducer } from '../store/AppStore'
import { diffWrites, fromRequests } from './sync'

describe('diffWrites', () => {
  it('writes only the changed student, plus its audit entry', () => {
    const a = initial()
    const b = reducer(a, { type: 'setStanding', studentId: 's-rommel', year: 2 })
    const w = diffWrites(a, b)
    expect(w.filter((x) => x.op === 'set').map((x) => (x.op === 'set' ? x.path : ''))).toEqual(['students/s-rommel'])
    expect(w.filter((x) => x.op === 'add')).toHaveLength(1)
  })

  it('writes the request doc for advising changes, tagged with the student id', () => {
    const a = initial()
    const b = reducer(a, { type: 'requestLoad', studentId: 's-bea' })
    const req = diffWrites(a, b).find((x) => x.op === 'set' && x.path === 'requests/s-bea')
    expect(req).toBeTruthy()
    expect((req as { data: unknown }).data).toMatchObject({ studentId: 's-bea' })
  })

  it('writes offerings and prerequisite config', () => {
    const a = initial()
    const b = reducer(a, { type: 'toggleOffering', subjectId: a.offerings[0] })
    expect(diffWrites(a, b).some((x) => x.op === 'set' && x.path === 'config/offerings')).toBe(true)
    const c = reducer(a, { type: 'setPrerequisites', subjectId: a.offerings[0], prerequisites: [], reference: '' })
    expect(diffWrites(a, c).some((x) => x.op === 'set' && x.path === 'config/prerequisites')).toBe(true)
  })

  it('produces no writes for hydrate, session or mode changes', () => {
    const a = initial()
    expect(diffWrites(a, reducer(a, { type: 'hydrate', patch: { students: a.students.map((s) => ({ ...s })) } }))).toEqual([])
    expect(diffWrites(a, reducer(a, { type: 'signOut' }))).toEqual([])
    expect(diffWrites(a, reducer(a, { type: 'setMode', mode: 'live' }))).toEqual([])
  })

  it('a user action after a hydrate still writes', () => {
    const a = reducer(initial(), { type: 'hydrate', patch: {} })
    const b = reducer(a, { type: 'requestLoad', studentId: 's-bea' })
    expect(diffWrites(a, b).length).toBeGreaterThan(0)
  })
})

describe('fromRequests', () => {
  it('keys advising records by student id', () => {
    const m = fromRequests([{ id: 's-bea', data: { studentId: 's-bea', requestedAt: 'x', removed: [], remarks: '', caseDecisions: [] } }])
    expect(m['s-bea']).toEqual({ studentId: 's-bea', requestedAt: 'x', removed: [], remarks: '', caseDecisions: [] })
  })
})

describe('hydration gate', () => {
  it('stays loading until the caller says every slice has arrived', () => {
    const live = reducer(initial(), { type: 'setMode', mode: 'live' })
    expect(live.hydrated).toBe(false)
    const partial = reducer(live, { type: 'hydrate', patch: { offerings: ['x'], hydrated: false } })
    expect(partial.hydrated).toBe(false)
    expect(reducer(partial, { type: 'hydrate', patch: { students: [], hydrated: true } }).hydrated).toBe(true)
  })

  it('a later partial update never drops back to loading', () => {
    const live = reducer(reducer(initial(), { type: 'setMode', mode: 'live' }), { type: 'hydrate', patch: { hydrated: true } })
    expect(reducer(live, { type: 'hydrate', patch: { offerings: [], hydrated: false } }).hydrated).toBe(true)
  })
})
