import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { seedAdvising, seedAudit, seedOfferings, seedStudents } from '../data/seed'
import { evaluateStudent, workingLoad } from '../domain/rules'
import { CURRICULA, subjectById } from '../data/curricula'
import { applyPrerequisiteOverrides, type PrerequisiteOverride } from '../domain/curriculumAdmin'
import { DEFAULT_TERM, SEM_LABEL, curriculumVersionForEntryAY, setCurrentTerm, type ActiveTerm } from '../domain/term'
import { mergeScannedRecords } from '../domain/gradeReport'
import { liveAvailable } from '../firebase/app'
import { applyWrites, diffWrites, markHydrated } from '../firebase/sync'
import type {
  AdvisingRecord,
  AuditEntry,
  Curriculum,
  Prerequisite,
  Program,
  Evaluation,
  RecordEntry,
  RecordResult,
  Role,
  Student,
  TermRef,
  YearLevel,
} from '../domain/types'

export interface Session {
  role: Role
  studentId?: string
  name: string
}

/** demo: synthetic data in this browser only. live: Firebase Auth + Firestore. */
export type Mode = 'demo' | 'live'

export interface AppState {
  session: Session | null
  students: Student[]
  offerings: string[]
  advising: Record<string, AdvisingRecord>
  audit: AuditEntry[]
  /** Prerequisite changes recorded by the dean, keyed by subject id. */
  prereqOverrides: Record<string, PrerequisiteOverride>
  /** The term loads are evaluated for. */
  term: ActiveTerm
  /** Requests and decisions of earlier terms, keyed by "AY|sem". */
  archive: Record<string, Record<string, AdvisingRecord>>
  mode: Mode
  /** Live mode: first Firestore data has arrived. */
  hydrated: boolean
  syncError?: string
}

export type Action =
  | { type: 'signIn'; session: Session }
  | { type: 'signOut' }
  | { type: 'reset' }
  | { type: 'hydrate'; patch: Partial<AppState> }
  | { type: 'setMode'; mode: Mode }
  /** Firebase reports nobody signed in: leave live mode if we were in it. */
  | { type: 'liveSignedOut' }
  | { type: 'requestLoad'; studentId: string }
  | { type: 'startReview'; studentId: string }
  | { type: 'addToLoad'; studentId: string; subjectId: string }
  | { type: 'removeFromLoad'; studentId: string; subjectId: string }
  | { type: 'setRemarks'; studentId: string; remarks: string }
  | { type: 'decide'; studentId: string; kind: 'confirmed' | 'approved'; subjectIds: string[] }
  | { type: 'recordCase'; studentId: string; subjectId: string; note: string }
  | { type: 'reopen'; studentId: string; reason: string }
  | { type: 'allowSubject'; studentId: string; subjectId: string; reason: string }
  | { type: 'archiveStudent'; studentId: string; reason: string }
  | { type: 'restoreStudent'; studentId: string }
  | { type: 'startTerm'; term: ActiveTerm }
  | { type: 'setStanding'; studentId: string; year: YearLevel | null }
  | { type: 'setEntryAY'; studentId: string; entryAY: string }
  | { type: 'setSection'; studentId: string; section: string | null }
  | { type: 'addRecord'; studentId: string; entry: Omit<RecordEntry, 'id'> }
  | { type: 'updateRecord'; studentId: string; entryId: string; result: RecordResult }
  | { type: 'removeRecord'; studentId: string; entryId: string }
  | { type: 'saveScannedRecords'; studentId: string; rows: { subjectId: string; term: TermRef; result: RecordResult }[] }
  /** Dean scanned a student's grade record: create or update the student, save grades, open the request. */
  | { type: 'encodeScan'; profile: ScanProfile; rows: { subjectId: string; term: TermRef; result: RecordResult }[] }
  | { type: 'toggleOffering'; subjectId: string }
  | { type: 'setOfferings'; subjectIds: string[]; offered: boolean; label: string }
  | { type: 'setPrerequisites'; subjectId: string; prerequisites: Prerequisite[]; reference: string }


export interface ScanProfile {
  studentNo: string
  firstName: string
  lastName: string
  program: Program
  entryAY: string
  yearStanding: YearLevel | null
  email?: string
}

const normNo = (n: string) => n.replace(/\s+/g, '').replace(/–/g, '-')

/** The id a scanned student is stored under: the existing record with that student number, or a new id. */
export function studentIdForScan(students: Student[], studentNo: string): string {
  const no = normNo(studentNo)
  return students.find((s) => normNo(s.studentNo) === no)?.id ?? `s-${no.replace(/[^0-9A-Za-z]/g, '')}`
}

/** Students not archived: the ones that appear in Requests and Students. */
export const activeStudents = (students: Student[]) => students.filter((s) => !s.archived)

export const STORAGE_KEY = 'lc-ite-advising/v3'

export function initial(): AppState {
  const students = seedStudents()
  return {
    session: null,
    students,
    offerings: seedOfferings(),
    advising: seedAdvising(students),
    audit: seedAudit(),
    prereqOverrides: {},
    term: DEFAULT_TERM,
    archive: {},
    mode: 'demo',
    hydrated: true,
  }
}

/** Empty state for live mode; Firestore fills it. */
export function liveInitial(): AppState {
  return { session: null, students: [], offerings: [], advising: {}, audit: [], prereqOverrides: {}, term: DEFAULT_TERM, archive: {}, mode: 'live', hydrated: false }
}

/**
 * Starting state. With Firebase configured the app starts empty and all data
 * comes from Firestore; the synthetic demo data is used only without Firebase
 * (and by the automated tests).
 */
export function load(live = liveAvailable): AppState {
  if (live) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return liveInitial()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initial(), ...(JSON.parse(raw) as Partial<AppState>), mode: 'demo', hydrated: true, syncError: undefined }
  } catch {
    /* storage unavailable: fall back to seed data */
  }
  return initial()
}

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

const ACTOR: Record<Role, string> = { student: 'Student', dean: 'Dean, ITE Department' }

function rec(state: AppState, studentId: string): AdvisingRecord {
  return state.advising[studentId] ?? { studentId, removed: [], remarks: '', caseDecisions: [] }
}

function adjustments(r: AdvisingRecord) {
  const parts = [(r.added ?? []).length ? `${(r.added ?? []).length} added` : '', r.removed.length ? `${r.removed.length} removed` : ''].filter(Boolean)
  return parts.length ? ` (${parts.join(', ')})` : ''
}

function log(state: AppState, role: Role, action: string, studentId?: string): AuditEntry[] {
  return [{ id: uid(), at: now(), actor: ACTOR[role], role, action, studentId }, ...state.audit]
}

function patchStudent(state: AppState, id: string, fn: (s: Student) => Student): Student[] {
  return state.students.map((s) => (s.id === id ? fn(s) : s))
}

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'signIn':
      return { ...state, session: a.session }
    case 'signOut':
      return { ...state, session: null }
    case 'reset':
      return state.mode === 'live' ? state : { ...initial(), session: state.session }
    case 'hydrate':
      // Loading ends once every slice has arrived (the caller says so); it never restarts.
      return markHydrated({ ...state, ...a.patch, hydrated: state.hydrated || a.patch.hydrated !== false })
    case 'liveSignedOut':
      return state.mode === 'live' ? markHydrated(liveAvailable ? liveInitial() : { ...load(), session: null }) : state
    case 'setMode':
      if (a.mode === state.mode) return state
      // A mode switch replaces the data wholesale; it is never written back.
      return markHydrated(a.mode === 'live' ? liveInitial() : { ...load(), session: null })

    /* Dean */
    case 'requestLoad': {
      const r = rec(state, a.studentId)
      // One active request per student for the current term.
      if (r.requestedAt || r.decision) return state
      return {
        ...state,
        advising: { ...state.advising, [a.studentId]: { ...r, requestedAt: now() } },
        audit: [{ id: uid(), at: now(), actor: state.session?.name ?? 'Student', role: 'student', action: 'Requested a subject-load evaluation', studentId: a.studentId }, ...state.audit],
      }
    }
    case 'startReview': {
      const r = rec(state, a.studentId)
      if (!r.requestedAt || r.reviewStartedAt || r.decision) return state
      return { ...state, advising: { ...state.advising, [a.studentId]: { ...r, reviewStartedAt: now() } } }
    }
    case 'addToLoad': {
      const r = rec(state, a.studentId)
      if (r.decision) return state
      const wasRemoved = r.removed.includes(a.subjectId)
      return {
        ...state,
        advising: {
          ...state.advising,
          [a.studentId]: {
            ...r,
            removed: r.removed.filter((x) => x !== a.subjectId),
            added: wasRemoved ? (r.added ?? []) : [...new Set([...(r.added ?? []), a.subjectId])],
          },
        },
      }
    }
    case 'removeFromLoad': {
      const r = rec(state, a.studentId)
      if (r.decision) return state
      const wasAdded = (r.added ?? []).includes(a.subjectId)
      return {
        ...state,
        advising: {
          ...state.advising,
          [a.studentId]: {
            ...r,
            added: (r.added ?? []).filter((x) => x !== a.subjectId),
            ...(r.allowed ? { allowed: r.allowed.filter((x) => x.subjectId !== a.subjectId) } : {}),
            removed: wasAdded || r.allowed?.some((x) => x.subjectId === a.subjectId) ? r.removed : [...new Set([...r.removed, a.subjectId])],
          },
        },
      }
    }
    case 'setRemarks': {
      const r = rec(state, a.studentId)
      return { ...state, advising: { ...state.advising, [a.studentId]: { ...r, remarks: a.remarks } } }
    }
    case 'decide': {
      const r = rec(state, a.studentId)
      return {
        ...state,
        advising: {
          ...state.advising,
          [a.studentId]: { ...r, decision: { kind: a.kind, at: now(), subjectIds: a.subjectIds, remarks: r.remarks.trim() } },
        },
        audit: log(
          state,
          'dean',
          `${a.kind === 'confirmed' ? 'Confirmed' : 'Approved'} subject load${adjustments(r)}${r.remarks.trim() ? ', with remarks' : ''}`,
          a.studentId,
        ),
      }
    }
    case 'startTerm': {
      const prev = state.term
      if (prev.ay === a.term.ay && prev.sem === a.term.sem) return state
      return {
        ...state,
        term: a.term,
        archive: Object.keys(state.advising).length ? { ...state.archive, [`${prev.ay}|${prev.sem}`]: state.advising } : state.archive,
        advising: {},
        offerings: CURRICULA.flatMap((c) => c.subjects.filter((s) => s.semester === a.term.sem).map((s) => s.id)),
        audit: log(state, 'dean', `Started ${SEM_LABEL[a.term.sem]}, AY ${a.term.ay}`),
      }
    }
    case 'archiveStudent': {
      const reason = a.reason.trim()
      if (!reason) return state
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, archived: { reason, at: now() } })),
        audit: log(state, 'dean', `Archived the student: ${reason}`, a.studentId),
      }
    }
    case 'restoreStudent':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => {
          const { archived: _done, ...rest } = s
          return rest
        }),
        audit: log(state, 'dean', 'Restored the student from the archive', a.studentId),
      }
    case 'allowSubject': {
      const r = rec(state, a.studentId)
      const reason = a.reason.trim().replace(/\.+$/, '')
      if (r.decision || !reason) return state
      const allowed = [...(r.allowed ?? []).filter((x) => x.subjectId !== a.subjectId), { subjectId: a.subjectId, reason, at: now() }]
      return {
        ...state,
        advising: { ...state.advising, [a.studentId]: { ...r, allowed, removed: r.removed.filter((x) => x !== a.subjectId) } },
        audit: log(state, 'dean', `Allowed ${subjectById(a.subjectId)?.code ?? a.subjectId} despite a prerequisite: ${reason}`, a.studentId),
      }
    }
    case 'reopen': {
      const r = state.advising[a.studentId]
      if (!r?.decision) return state
      const { decision: _undone, ...open } = r
      return {
        ...state,
        advising: { ...state.advising, [a.studentId]: { ...open, requestedAt: open.requestedAt ?? r.decision.at } },
        audit: log(state, 'dean', `Reopened the decision: ${a.reason.trim()}`, a.studentId),
      }
    }
    case 'recordCase': {
      const r = rec(state, a.studentId)
      return {
        ...state,
        advising: { ...state.advising, [a.studentId]: { ...r, caseDecisions: [...r.caseDecisions, { subjectId: a.subjectId, note: a.note, at: now() }] } },
        audit: log(state, 'dean', 'Recorded a decision on a Requires Dean Review case', a.studentId),
      }
    }
    case 'setStanding':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, yearStanding: a.year })),
        audit: log(state, 'dean', a.year ? `Recorded year standing: year ${a.year}` : 'Cleared recorded year standing', a.studentId),
      }
    case 'setSection':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, section: a.section })),
        audit: log(state, 'dean', a.section ? `Recorded section: ${a.section}` : 'Cleared section', a.studentId),
      }
    case 'setEntryAY':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, entryAY: a.entryAY, curriculumVersion: curriculumVersionForEntryAY(a.entryAY) })),
        audit: log(state, 'dean', `Corrected entry academic year to AY ${a.entryAY}`, a.studentId),
      }
    case 'addRecord':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, records: [...s.records, { ...a.entry, id: uid() }] })),
        audit: log(state, 'dean', 'Encoded an academic record entry', a.studentId),
      }
    case 'updateRecord':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({
          ...s,
          records: s.records.map((r) => (r.id === a.entryId ? { ...r, result: a.result } : r)),
        })),
        audit: log(state, 'dean', 'Updated an academic record entry', a.studentId),
      }
    case 'removeRecord':
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => ({ ...s, records: s.records.filter((r) => r.id !== a.entryId) })),
        audit: log(state, 'dean', 'Removed an academic record entry', a.studentId),
      }
    case 'saveScannedRecords': {
      const n = a.rows.length
      return {
        ...state,
        students: patchStudent(state, a.studentId, (s) => {
          const m = mergeScannedRecords(s.records, a.rows)
          return { ...s, records: [...m.keep, ...m.add.map((e) => ({ ...e, id: uid() }))] }
        }),
        audit: log(state, 'dean', `Encoded ${n} grade${n === 1 ? '' : 's'} from a scanned record`, a.studentId),
      }
    }
    case 'encodeScan': {
      const p = a.profile
      const id = studentIdForScan(state.students, p.studentNo)
      const existing = state.students.find((x) => x.id === id)
      const base: Student = existing ?? {
        id,
        studentNo: normNo(p.studentNo),
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        program: p.program,
        entryAY: p.entryAY,
        curriculumVersion: curriculumVersionForEntryAY(p.entryAY),
        yearStanding: null,
        transferee: false,
        records: [],
      }
      const m = mergeScannedRecords(base.records, a.rows)
      const student: Student = { ...base, ...(p.email?.trim() ? { email: p.email.trim() } : {}), yearStanding: p.yearStanding ?? base.yearStanding, records: [...m.keep, ...m.add.map((e) => ({ ...e, id: uid() }))] }
      const r = rec(state, id)
      const at = now()
      const advising = r.decision || r.requestedAt ? r : { ...r, requestedAt: at, reviewStartedAt: at }
      const n = a.rows.length
      let audit = state.audit
      if (!existing)
        audit = [{ id: uid(), at, actor: ACTOR.dean, role: 'dean' as const, action: n ? 'Created student record from a scanned grade record' : 'Added the student record', studentId: id }, ...audit]
      if (n) audit = [{ id: uid(), at, actor: ACTOR.dean, role: 'dean' as const, action: `Encoded ${n} grade${n === 1 ? '' : 's'} from a scanned record`, studentId: id }, ...audit]
      return {
        ...state,
        students: existing ? state.students.map((x) => (x.id === id ? student : x)) : [...state.students, student],
        advising: advising === r && state.advising[id] ? state.advising : { ...state.advising, [id]: advising },
        audit,
      }
    }
    case 'toggleOffering': {
      const has = state.offerings.includes(a.subjectId)
      return {
        ...state,
        offerings: has ? state.offerings.filter((x) => x !== a.subjectId) : [...state.offerings, a.subjectId],
        audit: log(state, 'dean', `${has ? 'Removed' : 'Added'} subject offering: ${subjectById(a.subjectId)?.code ?? a.subjectId}`),
      }
    }
    case 'setOfferings': {
      const set = new Set(state.offerings)
      for (const id of a.subjectIds) if (a.offered) set.add(id)
      else set.delete(id)
      return {
        ...state,
        offerings: [...set],
        audit: log(state, 'dean', `${a.offered ? 'Offered' : 'Withdrew'} ${a.subjectIds.length} subject${a.subjectIds.length === 1 ? '' : 's'}: ${a.label}`),
      }
    }
    case 'setPrerequisites': {
      const code = subjectById(a.subjectId)?.code ?? a.subjectId
      return {
        ...state,
        prereqOverrides: { ...state.prereqOverrides, [a.subjectId]: { prerequisites: a.prerequisites, reference: a.reference, at: now() } },
        audit: log(state, 'dean', `Updated prerequisites of ${code}${a.reference ? ` (ref. ${a.reference})` : ''}`),
      }
    }
  }
}

interface Ctx {
  state: AppState
  dispatch: React.Dispatch<Action>
  evaluate: (studentId: string) => Evaluation
  /** Curricula with recorded prerequisite changes applied. */
  curricula: Curriculum[]
}

const StoreContext = createContext<Ctx | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)

  // Live mode writes the documents each user action changed; demo mode stays in this browser.
  const ref = useRef(state)
  useEffect(() => {
    ref.current = state
  }, [state])
  const dispatch = useCallback((a: Action) => {
    const cur = ref.current
    if (cur.mode === 'live' && cur.session) {
      const next = reducer(cur, a)
      const w = diffWrites(cur, next)
      if (w.length) applyWrites(w).catch(() => rawDispatch({ type: 'hydrate', patch: { syncError: 'Couldn’t save. Check your connection and try again.' } }))
      ref.current = next
    }
    rawDispatch(a)
  }, [])

  useEffect(() => {
    if (state.mode !== 'demo') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  // The rule engine reads the active term; keep it in step with the store before evaluating.
  setCurrentTerm(state.term)
  const curricula = useMemo(() => applyPrerequisiteOverrides(CURRICULA, state.prereqOverrides), [state.prereqOverrides])

  const evaluations = useMemo(() => {
    setCurrentTerm(state.term)
    const off = new Set(state.offerings)
    const map = new Map<string, Evaluation>()
    for (const s of state.students) map.set(s.id, evaluateStudent(s, off, [], curricula))
    return map
  }, [state.students, state.offerings, state.term, curricula])

  const value = useMemo<Ctx>(
    () => ({ state, dispatch, evaluate: (id: string) => evaluations.get(id)!, curricula }),
    [state, dispatch, evaluations, curricula],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}

export function useStudentView(studentId: string | undefined) {
  const { state, evaluate } = useStore()
  if (!studentId) return null
  const student = state.students.find((s) => s.id === studentId)
  if (!student) return null
  const ev = evaluate(studentId)
  const record = state.advising[studentId]
  return { student, ev, record, load: workingLoad(ev, record) }
}
