/**
 * AI assistant: explanation layer only.
 *
 * In the deployed system the question and the minimum verified context below
 * are sent from a Firebase Cloud Function to the Gemini API (Gemini 3.5
 * Flash-Lite); the API key never reaches the browser. This prototype composes
 * the same kind of answer deterministically from the verified evaluation so the
 * interface can be demonstrated without a back end.
 *
 * The assistant never determines eligibility, approves loads, infers
 * equivalencies, determines year standing, overrides prerequisites, decides
 * overloads or exceptions, or infers missing data.
 */
import { statusPhrase, unitsOf, PASSING_GRADE } from './rules'
import { decidedSubjects } from './advising'
import { CURRENT_TERM, YEAR_LABEL, termLabel } from './term'
import type { AdvisingRecord, Evaluation, SubjectEvaluation } from './types'

export interface Ground {
  label: string
  value: string
}

export interface AssistantReply {
  kind: 'explanation' | 'insufficient' | 'outOfScope'
  paragraphs: string[]
  list?: string[]
  /** Index of the paragraph the list follows (defaults to the last paragraph). */
  listAfter?: number
  grounds: Ground[]
  referral?: string
}


const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function findSubject(q: string, ev: Evaluation): SubjectEvaluation | undefined {
  const cq = compact(q)
  const all = Object.values(ev.subjects)
  // Longest code match first so "ITE P113b" wins over "ITE P113".
  const byCode = [...all].sort((a, b) => b.subject.code.length - a.subject.code.length).find((s) => cq.includes(compact(s.subject.code)))
  if (byCode) return byCode
  const nq = norm(q)
  return all.find((s) => nq.includes(s.subject.title.toLowerCase()))
}

const ground = (s: SubjectEvaluation): Ground => ({
  label: s.subject.code,
  value: `${statusPhrase(s.status)}${s.finalGrade !== undefined ? ` (${s.finalGrade})` : ''}`,
})

const DEFINITIONS: [RegExp, string, string][] = [
  [
    /needs? action|needs? attention|pending/,
    'Needs Action / Needs Attention',
    'Needs Action marks an unresolved INC; Needs Attention marks a DRP record that a later subject depends on. Neither counts as a passed prerequisite.',
  ],
  [
    /record update/,
    'Record Update Needed',
    'Record Update Needed means data such as your year standing is missing. The dean records it during your evaluation.',
  ],
  [
    /dean review/,
    'Requires Dean Review',
    'Requires Dean Review means the dean must decide the case, for example an unvalidated transfer credit, a prerequisite exception, or an overload.',
  ],
]

const OUT_OF_SCOPE =
  /\b(approve|approval for|override|waive|waiver|overload|exception|petition|allow me|let me take|change my grade|change (the|my) grade|enroll me|add (a |this )?subject|remove (a |this )?subject|can i (still )?take .* anyway)\b/
const NOT_SYSTEM = /\b(schedule|room|tuition|payment|fee|balance|registration card|section|professor|instructor)\b/

export const SUGGESTED_QUESTIONS = [
  'Why can’t I take this subject yet?',
  'What prerequisite am I missing?',
  'What subjects do I still need to complete?',
  'What is in my subject load?',
  'What does Needs Action mean?',
  'Which curriculum version is used in my evaluation?',
]

export function answer(question: string, ev: Evaluation, rec: AdvisingRecord | undefined, focus?: string): AssistantReply {
  const q = norm(question)
  const s = ev.student
  const subject = findSubject(question, ev) ?? (focus ? ev.subjects[focus] : undefined)
  const refer = 'Please see the dean.'

  if (OUT_OF_SCOPE.test(q)) {
    return {
      kind: 'outOfScope',
      paragraphs: ['I can’t approve loads, grant prerequisite exceptions or waivers, decide overloads, or change records. These are decided by the dean.'],
      grounds: [],
      referral: refer,
    }
  }
  if (NOT_SYSTEM.test(q)) {
    return {
      kind: 'outOfScope',
      paragraphs: [
        'Schedules, sections, payments, and registration cards are handled in the enrollment process, not here.',
      ],
      grounds: [],
      referral: 'Please ask the Registrar about enrollment, schedules or payments.',
    }
  }

  for (const [re, term, text] of DEFINITIONS) {
    if (re.test(q) && /(mean|what is|what's|ibig sabihin)/.test(q)) {
      return { kind: 'explanation', paragraphs: [text], grounds: [{ label: 'Status', value: term }] }
    }
  }

  if (/curriculum|version|prospectus/.test(q)) {
    return {
      kind: 'explanation',
      paragraphs: [
        `Your evaluation uses the ${s.program} ${s.curriculumVersion} curriculum, based on your entry year (AY ${s.entryAY}). Students who entered in AY 2025–2026 or later follow the 2025–2026 curriculum; earlier entrants follow 2018–2019.`,
      ],
      grounds: [
        { label: 'Entry academic year', value: `AY ${s.entryAY}` },
        { label: 'Curriculum version', value: `${s.program} ${s.curriculumVersion}` },
      ],
    }
  }

  if (/regular|irregular|my status|classified/.test(q) && !subject) {
    if (ev.classification === 'undetermined') {
      return {
        kind: 'insufficient',
        paragraphs: [
          'Your status is not yet determined because your year standing has not been recorded. It will be evaluated once the dean records it.',
        ],
        grounds: [{ label: 'Missing data', value: ev.missingData.join(', ') }],
        referral: 'Please see the dean.',
      }
    }
    return {
      kind: 'explanation',
      paragraphs: [
        ev.classification === 'regular'
          ? 'You are regular: you have passed the subjects expected up to this semester.'
          : 'You are irregular because of:',
      ],
      list: ev.classification === 'irregular' ? ev.classificationReasons : undefined,
      grounds: [{ label: 'Classification', value: ev.classification === 'regular' ? 'Regular' : 'Irregular' }],
    }
  }

  if (/still need|remaining|left to|need to complete|have i (completed|passed)|completed|failed|which subjects/.test(q) && !subject) {
    const all = Object.values(ev.subjects)
    const done = all.filter((x) => x.status === 'passed' || x.status === 'credited')
    const failed = all.filter((x) => x.status === 'failed')
    const pending = all.filter((x) => ['pending', 'notCompletedReview', 'notCompleted', 'deanReview', 'recordUpdate'].includes(x.status))
    const remaining = all.filter((x) => !done.includes(x))
    const remainingUnits = remaining.reduce((n, x) => n + x.subject.units, 0)
    return {
      kind: 'explanation',
      paragraphs: [
        `${done.length} of ${all.length} subjects completed; ${remaining.length} remain (${remainingUnits} units).`,
        failed.length || pending.length ? 'Needing attention:' : 'No failed or pending records.',
      ],
      list: [...failed, ...pending].map((x) => `${x.subject.code} ${x.subject.title}: ${statusPhrase(x.status)}`),
      grounds: [
        { label: 'Completed', value: `${done.length} subjects` },
        { label: 'Remaining', value: `${remaining.length} subjects` },
        ...[...failed, ...pending].map(ground),
      ],
    }
  }

  if (/load|recommend|prescribed|approved|this semester|enroll in|higher[- ]?year/.test(q) && !/why|not (in|included)/.test(q)) {
    // Only the dean's decided load is shown to students; a pending request has no subject list yet.
    const d = rec?.decision
    if (!d) {
      if (!rec?.requestedAt)
        return {
          kind: 'explanation',
          paragraphs: ['You haven’t been evaluated for this term yet. Bring your Report of Grades and pre-enrollment form to the dean; your approved subjects appear on the Subject load page after the evaluation.'],
          grounds: [],
        }
      return {
        kind: 'explanation',
        paragraphs: [
          ev.classification === 'undetermined'
            ? 'Your evaluation is waiting for the dean to set your year standing. Your subject load appears once the dean approves it.'
            : 'The dean is evaluating your grades. Your subject load appears on the Subject load page once it is approved.',
        ],
        grounds: [{ label: 'Evaluation', value: 'In evaluation' }],
      }
    }
    return {
      kind: 'explanation',
      paragraphs: [`Your ${d.kind} load for ${termLabel(CURRENT_TERM)}: ${d.subjectIds.length} subjects, ${unitsOf(d.subjectIds)} units.`, 'You can print it from the Subject load page.'],
      list: decidedSubjects(ev, d.subjectIds).map((s) => (s.missing ? s.title : `${s.code} ${s.title} (${s.units} units)`)),
      listAfter: 0,
      grounds: [{ label: 'Load', value: d.kind === 'approved' ? 'Approved by the dean' : 'Confirmed by the dean' }],
    }
  }

  if (subject) return explainSubject(subject, ev, rec, q)

  if (findCodeLike(question)) {
    return {
      kind: 'insufficient',
      paragraphs: [
        `I can’t find that subject in your ${s.program} ${s.curriculumVersion} curriculum. Requirements from another curriculum version apply only through an officially recorded equivalency, and I can’t infer one.`,
      ],
      grounds: [{ label: 'Curriculum version', value: `${s.program} ${s.curriculumVersion}` }],
      referral: 'Please check with the dean.',
    }
  }

  return {
    kind: 'insufficient',
    paragraphs: [
      'I didn’t understand that. Try asking about a subject code, your load, or a status.',
    ],
    grounds: [],
  }
}

function findCodeLike(q: string) {
  return /\b[A-Z]{2,4}\s?[A-Z]?\d{2,3}[a-z]?\b/i.test(q)
}

function explainSubject(x: SubjectEvaluation, ev: Evaluation, rec: AdvisingRecord | undefined, q: string): AssistantReply {
  const name = `${x.subject.code} ${x.subject.title}`
  const grounds: Ground[] = [ground(x)]
  const paragraphs: string[] = []
  let list: string[] | undefined
  const inLoad = !!rec?.decision?.subjectIds.includes(x.subject.id)
  const asksExclusion = /not (in|included)|why isn.?t|left out/.test(q)

  switch (x.status) {
    case 'blocked': {
      const unmet = x.checks.filter((c) => !c.satisfied)
      paragraphs.push(`${name} is blocked. Not yet satisfied:`)
      list = unmet.map((c) => c.detail)
      const roots = x.chains.map((c) => c[0])
      const unique = [...new Map(roots.map((r) => [r.label, r])).values()]
      if (x.chains.some((c) => c.length > 2)) {
        paragraphs.push(
          `Root cause: ${unique.map((r) => `${r.label}, ${r.note}`).join('; ')}.`,
        )
      }
      if (x.blockCause === 'sequence') paragraphs.push('This is the normal sequence; the prerequisite has not been taken yet.')
      if (x.blockCause === 'record') {
        const r = unique.find((u) => u.subjectId)
        const rs = r?.subjectId ? ev.subjects[r.subjectId] : undefined
        if (rs?.status === 'pending')
          paragraphs.push(`Once a valid passing grade is recorded for ${rs.subject.code}, eligibility will be evaluated again.`)
        if (rs?.status === 'failed')
          paragraphs.push(
            rs.retakeAvailable ? `${rs.subject.code} is offered this semester for retake.` : `${rs.subject.code} is not offered this semester for retake.`,
          )
      }
      for (const c of unmet) if (c.prereq.kind === 'subject') grounds.push(ground(ev.subjects[c.prereq.subjectId]))
      for (const c of unmet) if (c.prereq.kind === 'standing') grounds.push({ label: 'Year standing', value: c.detail })
      break
    }
    case 'notOffered':
      paragraphs.push(`${name} is not offered this semester, so it can’t be part of this term’s load.`)
      grounds.push({ label: 'Offered this semester', value: 'No' })
      break
    case 'eligible':
      paragraphs.push(`${name} is eligible: ${x.reason.charAt(0).toLowerCase() + x.reason.slice(1)}`)
      if (inLoad) paragraphs.push('It is in your approved subject load.')
      grounds.push({ label: 'Offered this semester', value: 'Yes' })
      break
    case 'passed':
    case 'credited':
      paragraphs.push(`${name}: ${x.reason}`)
      if (asksExclusion) paragraphs.push('Completed subjects are not included in a subject load.')
      break
    case 'failed':
      paragraphs.push(`${name} is Failed/For Retake. ${x.reason}`)
      if (x.dependents.length)
        paragraphs.push(
          `Subjects that list it as a prerequisite stay blocked until a passing result is recorded: ${x.dependents.map((d) => ev.subjects[d].subject.code).join(', ')}. When you pass it later, the earlier attempt stays in your academic history.`,
        )
      break
    case 'pending':
      paragraphs.push(`${name} has an INC (Pending). It does not count as a prerequisite until a final grade is recorded.`)
      if (x.dependents.length)
        paragraphs.push(
          `Because of this, ${x.dependents.map((d) => ev.subjects[d].subject.code).join(', ')} cannot be taken yet. Once a valid final grade is recorded, it is evaluated with the passing grade of ${PASSING_GRADE} and the dependent subjects are evaluated again.`,
        )
      grounds.push(...x.dependents.map((d) => ground(ev.subjects[d])))
      break
    case 'notCompletedReview':
    case 'notCompleted':
      paragraphs.push(`${name} is ${statusPhrase(x.status)}. ${x.reason}`)
      if (x.dependents.length) paragraphs.push(`It is a prerequisite of ${x.dependents.map((d) => ev.subjects[d].subject.code).join(', ')}.`)
      break
    case 'recordUpdate':
      return {
        kind: 'insufficient',
        paragraphs: [`${name} can’t be evaluated yet. ${x.reason}`, 'I can’t determine year standing. The system will evaluate the subject once the dean records it.'],
        grounds,
        referral: 'Please see the dean.',
      }
    case 'deanReview':
      return {
        kind: 'explanation',
        paragraphs: [`${name} is marked Requires Dean Review. ${x.reason}`, 'Until it is decided and officially validated, it does not satisfy a prerequisite.'],
        grounds,
        referral: 'The dean decides this case.',
      }
    default:
      paragraphs.push(`${name}: ${statusPhrase(x.status)}. ${x.reason}`)
  }

  if (asksExclusion && x.status !== 'passed' && x.status !== 'credited' && !inLoad && x.status !== 'eligible')
    paragraphs.push('That is why it can’t be part of your load this term.')

  if (x.status === 'blocked' && ev.student.yearStanding !== null)
    grounds.push({ label: 'Recorded year standing', value: YEAR_LABEL[ev.student.yearStanding] })
  return { kind: 'explanation', paragraphs, list, listAfter: 0, grounds }
}
