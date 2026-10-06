/**
 * Rule-based evaluation.
 *
 * Pure functions that apply the validated curriculum and prerequisite rules to a
 * student's academic record (Chapter III, rule-based evaluation steps 1–6).
 * In the deployed system this runs in Firebase Cloud Functions; the AI
 * assistant only reads its output.
 */
import { curriculumFor, subjectById } from '../data/curricula'
import { CURRENT_TERM, SEM_LABEL, YEAR_LABEL, termLabel, termOrder } from './term'
import { composeLoad } from './advising'
import type {
  AdvisingRecord,
  AdvisingState,
  ChainLink,
  Classification,
  Curriculum,
  CurriculumSubject,
  Equivalency,
  Evaluation,
  LoadLine,
  PrereqCheck,
  RecordEntry,
  Student,
  SubjectEvaluation,
  SubjectStatus,
} from './types'

export const PASSING_GRADE = 75

type Outcome = 'passed' | 'failed' | 'pending' | 'notCompletedReview' | 'notCompleted' | 'credited' | 'creditPending'

export function outcomeOf(entry: RecordEntry): Outcome {
  const r = entry.result
  switch (r.kind) {
    case 'grade':
      return r.value >= PASSING_GRADE ? 'passed' : 'failed'
    case 'INC':
      if (r.completedGrade === undefined) return 'pending'
      return r.completedGrade >= PASSING_GRADE ? 'passed' : 'failed'
    case 'UW':
      return 'failed'
    case 'Dropped':
      return 'notCompleted'
    case 'Credited':
      return r.validated ? 'credited' : 'creditPending'
  }
}

const satisfies = (o: Outcome) => o === 'passed' || o === 'credited'

export function gradeOf(entry: RecordEntry): number | undefined {
  const r = entry.result
  if (r.kind === 'grade') return r.value
  if (r.kind === 'INC') return r.completedGrade
  return undefined
}

export function resultText(entry: RecordEntry): string {
  const r = entry.result
  switch (r.kind) {
    case 'grade':
      return String(r.value)
    case 'INC':
      return r.completedGrade === undefined ? 'INC' : `INC → ${r.completedGrade}`
    case 'UW':
      return 'UW'
    case 'Dropped':
      return 'DRP'
    case 'Credited':
      return r.validated ? 'Credited' : 'Credit (unvalidated)'
  }
}

function subjectName(s: CurriculumSubject) {
  return `${s.code} ${s.title}`
}

const STATUS_PHRASE: Record<SubjectStatus, string> = {
  passed: 'Completed/Passed',
  failed: 'Failed/For Retake',
  notTaken: 'Not Yet Taken',
  eligible: 'Eligible This Semester',
  blocked: 'Blocked by Prerequisite',
  notOffered: 'Not Offered This Semester',
  enrolled: 'Currently Enrolled',
  pending: 'Pending/Needs Action',
  notCompletedReview: 'Not Completed/Needs Review',
  notCompleted: 'Not Completed',
  credited: 'Credited/Substituted',
  recordUpdate: 'Record Update Needed',
  deanReview: 'Requires Dean Review',
}
export const statusPhrase = (s: SubjectStatus) => STATUS_PHRASE[s]

const STATUS_SHORT: Record<SubjectStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  notTaken: 'Not taken',
  eligible: 'Eligible',
  blocked: 'Blocked',
  notOffered: 'Not offered',
  enrolled: 'Enrolled',
  pending: 'Pending',
  notCompletedReview: 'Needs review',
  notCompleted: 'Not completed',
  credited: 'Credited',
  recordUpdate: 'Record update',
  deanReview: 'Dean review',
}
/** Compact label for dense views; the full term from the proposal stays in tooltips and detail views. */
export const statusShort = (s: SubjectStatus) => STATUS_SHORT[s]

/** Shortest useful reason for a block, e.g. "Prerequisite not completed: ITE C103b". */
function blockNote(unmet: PrereqCheck[]): string {
  const subjects = unmet.flatMap((c) => (c.prereq.kind === 'subject' ? [subjectById(c.prereq.subjectId)?.code ?? c.prereq.subjectId] : []))
  const standing = unmet.find((c) => c.prereq.kind === 'standing')
  const parts: string[] = []
  if (subjects.length) parts.push(`${subjects.length > 1 ? 'Prerequisites' : 'Prerequisite'} not completed: ${subjects.join(', ')}`)
  if (standing && standing.prereq.kind === 'standing') parts.push(`Requires ${YEAR_LABEL[standing.prereq.year]} standing`)
  return parts.join('; ')
}

export function evaluateStudent(
  student: Student,
  offerings: ReadonlySet<string>,
  equivalencies: readonly Equivalency[],
  curricula?: readonly Curriculum[],
): Evaluation {
  // Step 1: only the curriculum version stored in the profile is used
  // (with any recorded prerequisite changes applied).
  const curriculum =
    curricula?.find((c) => c.program === student.program && c.version === student.curriculumVersion) ?? curriculumFor(student.program, student.curriculumVersion)
  const subjects = curriculum.subjects
  const byId = new Map(subjects.map((s) => [s.id, s]))

  const attemptsOf = (id: string) =>
    student.records.filter((r) => r.subjectId === id).sort((a, b) => termOrder(a.term) - termOrder(b.term))

  const dependents = new Map<string, string[]>()
  for (const s of subjects)
    for (const p of s.prerequisites)
      if (p.kind === 'subject') dependents.set(p.subjectId, [...(dependents.get(p.subjectId) ?? []), s.id])

  // Step 2: classify each subject from its academic record.
  const recordStatus = new Map<string, { status: SubjectStatus; satisfying?: RecordEntry; latest?: RecordEntry; via?: string }>()
  for (const s of subjects) {
    const attempts = attemptsOf(s.id)
    const satisfying = [...attempts].reverse().find((a) => satisfies(outcomeOf(a)))
    if (satisfying) {
      recordStatus.set(s.id, { status: outcomeOf(satisfying) === 'credited' ? 'credited' : 'passed', satisfying, latest: attempts.at(-1) })
      continue
    }
    // Requirement satisfied through an officially recorded equivalency only.
    const eq = equivalencies.find(
      (e) => e.toSubjectId === s.id && student.records.some((r) => r.subjectId === e.fromSubjectId && satisfies(outcomeOf(r))),
    )
    if (eq) {
      const from = subjectById(eq.fromSubjectId)
      recordStatus.set(s.id, { status: 'credited', via: from ? `${subjectName(from)} (equivalency ${eq.reference})` : eq.reference })
      continue
    }
    const latest = attempts.at(-1)
    if (!latest) {
      recordStatus.set(s.id, { status: 'notTaken' })
      continue
    }
    const o = outcomeOf(latest)
    const map: Record<Outcome, SubjectStatus> = {
      passed: 'passed',
      credited: 'credited',
      failed: 'failed',
      pending: 'pending',
      notCompletedReview: 'notCompletedReview',
      notCompleted: 'notCompleted',
      creditPending: 'deanReview',
    }
    recordStatus.set(s.id, { status: map[o], latest })
  }

  const isSatisfied = (id: string) => {
    const st = recordStatus.get(id)?.status
    return st === 'passed' || st === 'credited'
  }

  const describe = (id: string): string => {
    const s = byId.get(id)!
    const rs = recordStatus.get(id)!
    const grade = rs.latest ? gradeOf(rs.latest) : undefined
    switch (rs.status) {
      case 'passed':
        return `${subjectName(s)}: Completed/Passed (${gradeOf(rs.satisfying!)})`
      case 'credited':
        return `${subjectName(s)}: Credited/Substituted`
      case 'failed':
        return `${subjectName(s)}: Failed/For Retake (${grade})`
      case 'pending':
        return `${subjectName(s)}: INC, not yet completed`
      case 'notCompletedReview':
        return `${subjectName(s)}: not completed`
      case 'notCompleted':
        return `${subjectName(s)}: DRP, not completed`
      case 'deanReview':
        return `${subjectName(s)}: credit not yet validated`
      default:
        return `${subjectName(s)}: not yet taken`
    }
  }

  // Step 3: prerequisite checks (all listed prerequisites must be satisfied).
  const checksFor = (s: CurriculumSubject): PrereqCheck[] =>
    s.prerequisites.map((p) => {
      if (p.kind === 'standing') {
        if (student.yearStanding === null)
          return { prereq: p, satisfied: false, unknown: true, detail: `Requires ${YEAR_LABEL[p.year]} standing; recorded year standing is missing` }
        const ok = student.yearStanding >= p.year
        return {
          prereq: p,
          satisfied: ok,
          detail: `Requires ${YEAR_LABEL[p.year]} standing; recorded: ${YEAR_LABEL[student.yearStanding]}`,
        }
      }
      const ok = isSatisfied(p.subjectId)
      const via = recordStatus.get(p.subjectId)?.via
      return { prereq: p, satisfied: ok, detail: describe(p.subjectId), viaEquivalency: via }
    })

  // Trace chains back to root causes (memoised; curricula are acyclic).
  const chainMemo = new Map<string, ChainLink[][]>()
  const linkFor = (id: string): ChainLink => {
    const s = byId.get(id)!
    const d = describe(id)
    return { subjectId: id, label: s.code, note: d.slice(d.indexOf(':') + 2) }
  }
  const tracePrereqs = (s: CurriculumSubject): ChainLink[][] => {
    if (chainMemo.has(s.id)) return chainMemo.get(s.id)!
    const paths: ChainLink[][] = []
    for (const p of s.prerequisites) {
      if (p.kind === 'standing') {
        if (student.yearStanding === null || student.yearStanding < p.year)
          paths.push([
            {
              standing: p.year,
              label: `${YEAR_LABEL[p.year]} standing`,
              note: student.yearStanding === null ? 'Recorded year standing is missing' : `Recorded: ${YEAR_LABEL[student.yearStanding]}`,
            },
          ])
        continue
      }
      if (isSatisfied(p.subjectId)) continue
      const ps = byId.get(p.subjectId)!
      const pStatus = recordStatus.get(p.subjectId)!.status
      if (pStatus === 'notTaken') {
        const upstream = tracePrereqs(ps)
        if (upstream.length) for (const u of upstream) paths.push([...u, linkFor(p.subjectId)])
        else paths.push([linkFor(p.subjectId)])
      } else {
        paths.push([linkFor(p.subjectId)])
      }
    }
    chainMemo.set(s.id, paths)
    return paths
  }

  const results: Record<string, SubjectEvaluation> = {}
  for (const s of subjects) {
    const rs = recordStatus.get(s.id)!
    const attempts = attemptsOf(s.id)
    const offered = offerings.has(s.id)
    const checks = checksFor(s)
    const deps = dependents.get(s.id) ?? []
    const base = { subject: s, attempts, offered, checks, dependents: deps, chains: [] as ChainLink[][] }
    const unmet = checks.filter((c) => !c.satisfied && !c.unknown)
    const unknown = checks.filter((c) => c.unknown)

    let ev: SubjectEvaluation
    switch (rs.status) {
      case 'passed': {
        const g = gradeOf(rs.satisfying!)
        const r = rs.satisfying!.result
        const retaken = attempts.length > 1
        const reason =
          r.kind === 'INC'
            ? `INC completed with a final grade of ${g}.`
            : retaken
              ? `Passed on retake with ${g}, ${termLabel(rs.satisfying!.term, true)}.`
              : `Final grade ${g}.`
        ev = { ...base, status: 'passed', finalGrade: g, reason }
        break
      }
      case 'credited':
        ev = {
          ...base,
          status: 'credited',
          reason: rs.via
            ? `Satisfied by approved equivalency: ${rs.via}.`
            : `Credited${rs.satisfying?.result.kind === 'Credited' ? ` from ${rs.satisfying.result.note}` : ''}. Validated.`,
        }
        break
      case 'failed': {
        const g = rs.latest ? gradeOf(rs.latest) : undefined
        const canRetake = unmet.length === 0 && unknown.length === 0
        ev = {
          ...base,
          status: 'failed',
          finalGrade: g,
          retakeAvailable: canRetake && offered,
          note: canRetake && offered ? 'Offered for retake' : undefined,
          reason: `${rs.latest?.result.kind === 'UW' ? 'Unauthorized withdrawal (UW).' : `Final grade ${g}, below the passing grade of ${PASSING_GRADE}.`} ${
            canRetake && offered ? 'Offered for retake this semester.' : canRetake ? 'Not offered for retake this semester.' : ''
          }`.trim(),
        }
        break
      }
      case 'pending':
        ev = {
          ...base,
          status: 'pending',
          flag: 'needsAction',
          reason: 'INC. Does not satisfy a prerequisite until a final grade is recorded.',
        }
        break
      case 'notCompletedReview':
        ev = {
          ...base,
          status: 'notCompletedReview',
          flag: deps.length ? 'needsAttention' : undefined,
          reason: 'Not completed. Does not satisfy a prerequisite.',
        }
        break
      case 'notCompleted':
        ev = {
          ...base,
          status: 'notCompleted',
          flag: deps.length ? 'needsAttention' : undefined,
          reason: 'Dropped (DRP). Does not satisfy a prerequisite.',
        }
        break
      case 'deanReview': {
        const r = rs.latest?.result
        ev = {
          ...base,
          status: 'deanReview',
          note: 'Credit not validated',
          reason: `Credit${r?.kind === 'Credited' ? ` from ${r.note}` : ''} not yet validated.`,
        }
        break
      }
      default: {
        // Not yet taken: eligibility (step 3) then availability (step 4).
        if (unmet.length) {
          const chains = tracePrereqs(s)
          const roots = chains.map((c) => c[0])
          const UNRESOLVED: SubjectStatus[] = ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview']
          const blockCause = roots.some((r) => r.subjectId && UNRESOLVED.includes(recordStatus.get(r.subjectId)!.status))
            ? 'record'
            : roots.some((r) => r.standing)
              ? 'standing'
              : 'sequence'
          ev = {
            ...base,
            status: 'blocked',
            blockCause,
            chains: chains.map((c) => [...c, { subjectId: s.id, label: s.code, note: 'Blocked by Prerequisite' }]),
            note: blockNote(unmet),
            reason: `${blockNote(unmet)}.`,
          }
        } else if (unknown.length) {
          ev = {
            ...base,
            status: 'recordUpdate',
            note: 'Year standing not recorded',
            reason: `${unknown[0].detail}.`,
          }
        } else {
          // A blank, a dash or a missing sheet is evaluated like "none".
          const prereq = s.prerequisites.length ? 'Prerequisites satisfied.' : 'No prerequisites.'
          ev = {
            ...base,
            status: offered ? 'eligible' : 'notOffered',
            reason: `${prereq} ${offered ? 'Offered this semester.' : 'Not offered this semester.'}`,
          }
        }
      }
    }
    results[s.id] = ev
  }

  // Regular / irregular determination.
  const unresolved = subjects.filter((s) => ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview'].includes(results[s.id].status))
  const standing = student.yearStanding
  const before = (s: CurriculumSubject) =>
    standing !== null && (s.year < standing || (s.year === standing && s.semester < CURRENT_TERM.sem))
  const missedExpected = subjects.filter((s) => before(s) && !['passed', 'credited'].includes(results[s.id].status))

  const reasons: string[] = []
  const missingData: string[] = []
  let classification: Classification
  if (standing === null) missingData.push('Recorded year standing')

  const evidence = new Set([...unresolved, ...missedExpected])
  if (evidence.size) {
    classification = 'irregular'
    for (const s of evidence) reasons.push(`${s.code} ${s.title}: ${statusPhrase(results[s.id].status)}`)
  } else if (standing === null) {
    classification = 'undetermined'
    reasons.push('Recorded year standing is missing; status not yet determined.')
  } else {
    classification = 'regular'
    reasons.push(
      standing === 1 && CURRENT_TERM.sem === 1
        ? 'First Year, First Semester.'
        : `All subjects before ${YEAR_LABEL[standing]}, ${SEM_LABEL[CURRENT_TERM.sem]} passed.`,
    )
  }

  // Step 6: prescribed or recommended load.
  let load: Evaluation['load'] = { kind: 'none' }
  let normalUnits: number | undefined
  if (standing !== null) {
    normalUnits = subjects
      .filter((s) => s.year === standing && s.semester === CURRENT_TERM.sem)
      .reduce((n, s) => n + s.units, 0)
  }
  if (classification === 'regular' && standing !== null) {
    const lines: LoadLine[] = subjects
      .filter((s) => s.year === standing && s.semester === CURRENT_TERM.sem)
      .map((s) => ({ subjectId: s.id, basis: 'prescribed' }))
    const exceptions = lines
      .filter((l) => results[l.subjectId].status !== 'eligible')
      .map((l) => `${byId.get(l.subjectId)!.code}: ${statusPhrase(results[l.subjectId].status)}`)
    load = { kind: 'prescribed', lines, exceptions }
  } else if (classification === 'irregular') {
    const position = standing !== null ? standing * 10 + CURRENT_TERM.sem : null
    const lines: LoadLine[] = subjects
      .filter((s) => results[s.id].status === 'eligible' || (results[s.id].status === 'failed' && results[s.id].retakeAvailable))
      .map((s): LoadLine => {
        if (results[s.id].status === 'failed') return { subjectId: s.id, basis: 'retake' }
        if (position === null) return { subjectId: s.id, basis: 'unplaced' }
        const p = s.year * 10 + s.semester
        if (standing !== null && s.year > standing) return { subjectId: s.id, basis: 'higherYear' }
        return { subjectId: s.id, basis: p < position ? 'back' : p === position ? 'current' : 'ahead' }
      })
    const order = { retake: 0, back: 1, current: 2, prescribed: 2, unplaced: 2, ahead: 3, higherYear: 4 }
    lines.sort((a, b) => order[a.basis] - order[b.basis])
    // Suggest within the normal load of the term; the dean can still add the rest.
    const cap = normalUnits || Math.max(...[1, 2].map((sem) => subjects.filter((s) => s.year === 1 && s.semester === sem).reduce((n, s) => n + s.units, 0)))
    let units = 0
    const fitted = lines.filter((l) => {
      const u = byId.get(l.subjectId)!.units
      if (units + u > cap) return false
      units += u
      return true
    })
    load = { kind: 'recommended', lines: fitted }
  }

  return { student, curriculum, classification, classificationReasons: reasons, missingData, subjects: results, load, normalUnits }
}

export const LOAD_BASIS_LABEL: Record<LoadLine['basis'], string> = {
  prescribed: 'Prescribed',
  retake: 'Retake',
  back: 'Back subject',
  current: 'Current placement',
  ahead: 'Later placement',
  higherYear: 'Higher-year subject',
  unplaced: 'Eligible and offered',
}

/* ---------- Workflow helpers ---------- */

export function advisingState(ev: Evaluation, rec: AdvisingRecord | undefined): AdvisingState {
  if (rec?.decision) return rec.decision.kind
  if (ev.classification === 'undetermined') return 'recordUpdate'
  if (ev.classification === 'regular') return 'awaitingConfirmation'
  return 'awaitingReview'
}

export const ADVISING_STATE_LABEL: Record<AdvisingState, string> = {
  awaitingConfirmation: 'For confirmation',
  awaitingReview: 'For review',
  recordUpdate: 'Record update needed',
  confirmed: 'Confirmed',
  approved: 'Approved',
}

/** Subjects currently in the working load (proposal adjusted by the dean, or the decided load). */
export function workingLoad(ev: Evaluation, rec: AdvisingRecord | undefined): string[] {
  return composeLoad(ev, rec)
}

export function unitsOf(ids: string[]): number {
  return ids.reduce((n, id) => n + (subjectById(id)?.units ?? 0), 0)
}

/** Items the dean must look at: transfer-credit and prescribed-load exceptions. */
export function deanReviewItems(ev: Evaluation): SubjectEvaluation[] {
  return Object.values(ev.subjects).filter((s) => s.status === 'deanReview')
}

export function flaggedItems(ev: Evaluation): SubjectEvaluation[] {
  return Object.values(ev.subjects).filter((s) => s.flag)
}

/** Subjects downstream of a subject (transitive), for "what this affects". */
export function downstreamOf(ev: Evaluation, id: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const walk = (x: string) => {
    for (const d of ev.subjects[x]?.dependents ?? []) {
      if (seen.has(d)) continue
      seen.add(d)
      out.push(d)
      walk(d)
    }
  }
  walk(id)
  return out
}
