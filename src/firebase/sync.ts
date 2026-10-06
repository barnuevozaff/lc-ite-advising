/**
 * Live persistence. The reducer stays the single state machine: after each
 * user action only the documents that changed are written, and Firestore
 * snapshots flow back in as `hydrate` actions, which never write.
 */
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, writeBatch, type Unsubscribe } from 'firebase/firestore'
import { seedOfferings } from '../data/seed'
import type { PrerequisiteOverride } from '../domain/curriculumAdmin'
import type { AdvisingRecord, AuditEntry, Student } from '../domain/types'
import type { AppState } from '../store/AppStore'
import { firebase } from './app'

export type Write = { op: 'set'; path: string; data: unknown } | { op: 'delete'; path: string } | { op: 'add'; collection: 'audit'; data: unknown }

const HYDRATED = new WeakSet<AppState>()
/** Marks a state produced from Firestore data, so it is never written back. */
export function markHydrated(s: AppState): AppState {
  HYDRATED.add(s)
  return s
}

export function diffWrites(prev: AppState, next: AppState): Write[] {
  if (HYDRATED.has(next)) return []
  const w: Write[] = []
  const before = new Map(prev.students.map((s) => [s.id, s]))
  for (const s of next.students) if (before.get(s.id) !== s) w.push({ op: 'set', path: `students/${s.id}`, data: s })
  for (const [id, r] of Object.entries(next.advising)) if (prev.advising[id] !== r) w.push({ op: 'set', path: `requests/${id}`, data: { ...r, studentId: id } })
  for (const id of Object.keys(prev.advising)) if (!(id in next.advising)) w.push({ op: 'delete', path: `requests/${id}` })
  if (prev.term !== next.term) w.push({ op: 'set', path: 'config/term', data: next.term })
  for (const [k, v] of Object.entries(next.archive)) if (prev.archive[k] !== v) w.push({ op: 'set', path: `archive/${k.replace('|', '_')}`, data: { requests: v } })
  if (prev.offerings !== next.offerings) w.push({ op: 'set', path: 'config/offerings', data: { subjectIds: next.offerings } })
  if (prev.prereqOverrides !== next.prereqOverrides) w.push({ op: 'set', path: 'config/prerequisites', data: { overrides: next.prereqOverrides } })
  const known = new Set(prev.audit.map((a) => a.id))
  for (const a of next.audit) if (!known.has(a.id)) w.push({ op: 'add', collection: 'audit', data: a })
  return w
}

/** Firestore rejects `undefined`; a JSON round trip drops those fields. */
const clean = (x: unknown) => JSON.parse(JSON.stringify(x)) as Record<string, unknown>

export async function applyWrites(writes: Write[]): Promise<void> {
  const { db, auth } = firebase()
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  const batch = writeBatch(db)
  for (const x of writes) {
    if (x.op === 'set') batch.set(doc(db, x.path), clean(x.data))
    else if (x.op === 'delete') batch.delete(doc(db, x.path))
    else batch.set(doc(collection(db, x.collection)), { ...clean(x.data), actorUid: uid })
  }
  await batch.commit()
}

export function fromRequests(docs: { id: string; data: Record<string, unknown> }[]): Record<string, AdvisingRecord> {
  return Object.fromEntries(docs.map((d) => [d.id, d.data as unknown as AdvisingRecord]))
}

export type Who = { role: 'dean' } | { role: 'student'; studentId: string }

/** Streams the documents this user may read into state slices. */
export function subscribe(who: Who, onPatch: (p: Partial<AppState>) => void, onError: (e: Error) => void): Unsubscribe {
  const { db } = firebase()
  const subs: Unsubscribe[] = []
  const offeringsRef = doc(db, 'config/offerings')

  subs.push(
    onSnapshot(
      offeringsRef,
      (d) => {
        if (d.exists()) onPatch({ offerings: (d.data().subjectIds as string[]) ?? [] })
        else if (who.role === 'dean') void setDoc(offeringsRef, { subjectIds: seedOfferings() }).catch(onError)
        else onPatch({ offerings: [] })
      },
      onError,
    ),
    onSnapshot(doc(db, 'config/term'), (d) => d.exists() && onPatch({ term: d.data() as AppState['term'] }), onError),
    onSnapshot(doc(db, 'config/prerequisites'), (d) => onPatch({ prereqOverrides: (d.data()?.overrides as Record<string, PrerequisiteOverride>) ?? {} }), onError),
  )

  if (who.role === 'dean') {
    subs.push(
      onSnapshot(collection(db, 'students'), (q) => onPatch({ students: q.docs.map((d) => d.data() as Student) }), onError),
      onSnapshot(collection(db, 'requests'), (q) => onPatch({ advising: fromRequests(q.docs.map((d) => ({ id: d.id, data: d.data() }))) }), onError),
      onSnapshot(query(collection(db, 'audit'), orderBy('at', 'desc'), limit(200)), (q) => onPatch({ audit: q.docs.map((d) => d.data() as AuditEntry) }), onError),
    )
  } else {
    const id = who.studentId
    subs.push(
      onSnapshot(doc(db, `students/${id}`), (d) => onPatch({ students: d.exists() ? [d.data() as Student] : [] }), onError),
      onSnapshot(doc(db, `requests/${id}`), (d) => onPatch({ advising: d.exists() ? fromRequests([{ id, data: d.data() }]) : {} }), onError),
    )
  }
  return () => subs.forEach((u) => u())
}

export async function readDoc<T>(path: string): Promise<T | null> {
  const d = await getDoc(doc(firebase().db, path))
  return d.exists() ? (d.data() as T) : null
}
