/**
 * Advising workflow: load requests, the dean's working load, and what each
 * curriculum subject means for that load. Built on the rule-based evaluation;
 * nothing here re-derives academic results.
 */
import { CURRENT_TERM } from './term'
import type { AdvisingRecord, CurriculumSubject, Evaluation, SubjectEvaluation, YearLevel } from './types'

/* ---------------- Request status ---------------- */

export type RequestStatus = 'none' | 'submitted' | 'underReview' | 'confirmed' | 'approved'

/**
 * Student-facing status of the current term's load request.
 * - submitted: request stored, the dean has not opened it yet
 * - underReview: the dean has opened the request
 */
export function requestStatus(rec: AdvisingRecord | undefined): RequestStatus {
  if (rec?.decision) return rec.decision.kind
  if (!rec?.requestedAt) return 'none'
  return rec.reviewStartedAt ? 'underReview' : 'submitted'
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  none: 'Not yet evaluated',
  submitted: 'In evaluation',
  underReview: 'In evaluation',
  confirmed: 'Confirmed',
  approved: 'Approved',
}

/** The request context comes from the stored profile and the active term; never from student input. */
export function requestContext(ev: Evaluation) {
  const s = ev.student
  return {
    program: s.program,
    curriculumVersion: s.curriculumVersion,
    yearStanding: s.yearStanding as YearLevel | null,
    term: CURRENT_TERM,
  }
}

/* ---------------- Working load ---------------- */

/** A subject can be put in a load when it is eligible and offered, or a failed or dropped subject offered for retake. */
export function canAddToLoad(x: SubjectEvaluation): boolean {
  return x.status === 'eligible' || ((x.status === 'failed' || x.status === 'notCompleted') && !!x.retakeAvailable)
}

/** What is being retaken: the failing grade, UW, or DRP. */
export function retakeOf(x: SubjectEvaluation): string {
  if (x.status === 'notCompleted') return 'DRP'
  return x.finalGrade !== undefined ? String(x.finalGrade) : 'UW'
}

/** Proposed subjects minus the dean's removals, plus the dean's additions, in curriculum order. */
export function composeLoad(ev: Evaluation, rec: AdvisingRecord | undefined): string[] {
  if (rec?.decision) return rec.decision.subjectIds
  const proposed = ev.load.kind === 'none' ? [] : ev.load.lines.map((l) => l.subjectId)
  const removed = new Set(rec?.removed ?? [])
  const allowed = (rec?.allowed ?? []).map((a) => a.subjectId)
  const ids = new Set([...proposed.filter((id) => !removed.has(id)), ...[...(rec?.added ?? []), ...allowed].filter((id) => ev.subjects[id])])
  return ev.curriculum.subjects.map((s) => s.id).filter((id) => ids.has(id))
}

export function isProposed(ev: Evaluation, id: string) {
  return ev.load.kind !== 'none' && ev.load.lines.some((l) => l.subjectId === id)
}

/** Issues that must be resolved before the load can be confirmed. */
export function validateLoad(ev: Evaluation, ids: string[], rec?: AdvisingRecord): { subjectId?: string; message: string }[] {
  if (ev.load.kind === 'none') return [{ message: 'Status and placement are not yet determined.' }]
  if (!ids.length) return [{ message: 'The load has no subjects.' }]
  const allowed = new Set((rec?.allowed ?? []).map((a) => a.subjectId))
  return ids
    .filter((id) => !canAddToLoad(ev.subjects[id]) && !allowed.has(id))
    .map((id) => ({ subjectId: id, message: `${ev.subjects[id].subject.code}: ${loadSubjectView(ev, new Set(), new Set())[id].reason}` }))
}

/* ---------------- Curriculum subject states for the dean's explorer ---------------- */

export type LoadSubjectState =
  | 'selected'
  | 'available'
  | 'completed'
  | 'credited'
  | 'prerequisite'
  | 'standing'
  | 'notOffered'
  | 'failed'
  | 'inc'
  | 'notCompleted'
  | 'recordUpdate'
  | 'deanReview'

export interface LoadSubjectView {
  subject: CurriculumSubject
  state: LoadSubjectState
  addable: boolean
  /** Shortest useful reason, from the evaluation. */
  reason: string
}

function prerequisiteReason(ev: Evaluation, x: SubjectEvaluation): { state: LoadSubjectState; reason: string } {
  const unmet = x.checks.filter((c) => !c.satisfied && !c.unknown)
  const subjectUnmet = unmet.flatMap((c) => (c.prereq.kind === 'subject' ? [ev.subjects[c.prereq.subjectId]] : []))
  const standing = unmet.find((c) => c.prereq.kind === 'standing')
  const unresolved = subjectUnmet.filter((p) => ['pending', 'notCompletedReview', 'notCompleted', 'deanReview', 'failed'].includes(p.status))
  const label = (p: SubjectEvaluation) =>
    p.status === 'pending'
      ? `INC in ${p.subject.code}`
      : p.status === 'notCompletedReview'
        ? `${p.subject.code} not completed`
        : p.status === 'notCompleted'
          ? `${p.subject.code} dropped`
          : p.status === 'deanReview'
            ? `credit for ${p.subject.code} not validated`
            : p.status === 'failed'
              ? `${p.subject.code} ${p.finalGrade === undefined ? 'UW' : 'failed'}`
              : p.subject.code
  const parts: string[] = []
  if (unresolved.length) parts.push(`Prerequisite unresolved: ${unresolved.map(label).join(', ')}`)
  const rest = subjectUnmet.filter((p) => !unresolved.includes(p))
  if (rest.length) parts.push(`Prerequisite incomplete: ${rest.map((p) => p.subject.code).join(', ')}`)
  if (standing && standing.prereq.kind === 'standing') parts.push(standing.detail.replace(/; recorded.*$/, ''))
  return { state: subjectUnmet.length ? 'prerequisite' : 'standing', reason: parts.join(' · ') }
}

/** What every curriculum subject means for the working load. */
export function loadSubjectView(ev: Evaluation, working: ReadonlySet<string>, removed: ReadonlySet<string>, rec?: AdvisingRecord): Record<string, LoadSubjectView> {
  const out: Record<string, LoadSubjectView> = {}
  const allowed = new Map((rec?.allowed ?? []).map((a) => [a.subjectId, a.reason]))
  for (const x of Object.values(ev.subjects)) {
    const base = { subject: x.subject }
    const addable = canAddToLoad(x)
    let v: LoadSubjectView
    if (working.has(x.subject.id)) v = { ...base, state: 'selected', addable: false, reason: allowed.has(x.subject.id) ? `Allowed by the dean · ${allowed.get(x.subject.id)}` : 'In load' }
    else if (addable)
      v = {
        ...base,
        state: 'available',
        addable: true,
        reason: [x.retakeAvailable ? `Retake · ${retakeOf(x)}` : '', removed.has(x.subject.id) ? 'Removed from proposal' : ''].filter(Boolean).join(' · '),
      }
    else
      switch (x.status) {
        case 'passed':
          v = { ...base, state: 'completed', addable: false, reason: `Completed${x.finalGrade !== undefined ? ` · ${x.finalGrade}` : ''}` }
          break
        case 'credited':
          v = { ...base, state: 'credited', addable: false, reason: 'Credited' }
          break
        case 'blocked':
          v = { ...base, addable: false, ...prerequisiteReason(ev, x) }
          break
        case 'notOffered':
          v = { ...base, state: 'notOffered', addable: false, reason: 'Not offered this term' }
          break
        case 'failed':
          v = { ...base, state: 'failed', addable: false, reason: `Failed · ${x.finalGrade ?? 'UW'} · not offered for retake this term` }
          break
        case 'pending':
          v = { ...base, state: 'inc', addable: false, reason: 'INC · awaiting final grade' }
          break
        case 'notCompletedReview':
          v = { ...base, state: 'notCompleted', addable: false, reason: 'Not completed' }
          break
        case 'notCompleted':
          v = { ...base, state: 'notCompleted', addable: false, reason: 'DRP · not completed' }
          break
        case 'recordUpdate':
          v = { ...base, state: 'recordUpdate', addable: false, reason: 'Record update needed · year standing' }
          break
        case 'deanReview':
          v = { ...base, state: 'deanReview', addable: false, reason: 'Dean review · credit not validated' }
          break
        default:
          v = { ...base, state: 'prerequisite', addable: false, reason: x.reason }
      }
    out[x.subject.id] = v
  }
  return out
}

/* ---------------- Advising records list ---------------- */

/** Short issue labels derived from the evaluation, for the dean's list. */
export function advisingIssues(ev: Evaluation): string[] {
  const all = Object.values(ev.subjects)
  const count = (pred: (x: SubjectEvaluation) => boolean) => all.filter(pred).length
  const out: string[] = []
  if (ev.missingData.length) out.push('Record needs update')
  const failed = count((x) => x.status === 'failed')
  const inc = count((x) => x.status === 'pending')
  const awDropped = count((x) => x.status === 'notCompletedReview' || x.status === 'notCompleted')
  const credit = count((x) => x.status === 'deanReview')
  if (failed) out.push(`${failed} failed`)
  if (inc) out.push(`${inc} INC`)
  if (awDropped) out.push(`${awDropped} DRP`)
  if (credit) out.push(`${credit} credit for review`)
  if (ev.load.kind === 'prescribed' && ev.load.exceptions.length) out.push('Prerequisite issue in prescribed load')
  return out
}

export interface RequestRowFilter {
  program?: string
  year?: string
  q?: string
}

export function filterRequests<T extends { ev: Evaluation }>(rows: T[], f: RequestRowFilter): T[] {
  const q = f.q?.trim().toLowerCase()
  return rows.filter(({ ev: { student: s } }) => {
    if (f.program && s.program !== f.program) return false
    if (f.year && String(s.yearStanding ?? '') !== f.year) return false
    if (q && !`${s.firstName} ${s.lastName} ${s.lastName}, ${s.firstName} ${s.studentNo}`.toLowerCase().includes(q)) return false
    return true
  })
}

/** The only subject list a student may see: the dean's decided load, or nothing. */
export function studentVisibleLoad(rec: AdvisingRecord | undefined): string[] | null {
  return rec?.decision ? rec.decision.subjectIds : null
}

/** The dean's decided subjects for display; ids no longer in the curriculum are marked, never dropped. */
export function decidedSubjects(ev: Evaluation, ids: string[]): { id: string; code: string; title: string; units: number; missing: boolean }[] {
  return ids.map((id) => {
    const s = ev.subjects[id]?.subject
    return s
      ? { id, code: s.code, title: s.title, units: s.units, missing: false }
      : { id, code: '—', title: 'Not in the current curriculum. Reopen and re-evaluate.', units: 0, missing: true }
  })
}
