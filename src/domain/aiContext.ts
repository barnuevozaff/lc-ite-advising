/**
 * What the AI chatbot is allowed to know: the student's evaluation, without
 * name or student number. The model explains this record; it never decides.
 */
import { requestStatus, REQUEST_STATUS_LABEL } from './advising'
import { statusPhrase } from './rules'
import { CURRENT_TERM, YEAR_LABEL, termLabel } from './term'
import type { AdvisingRecord, Evaluation } from './types'

export const SYSTEM_INSTRUCTION = `You are the academic advising assistant of the ITE Department of Laguna College (BSCS and BSIT).
Answer the student's question using only the student record given below. Do not invent subjects, grades, rules or policies.
Rules of the system: passing grade is 75; every listed prerequisite must be passed; INC, UW (Unauthorized Withdrawal), DRP (Dropped) and failed subjects do not satisfy prerequisites; year standing is set by the dean.
You explain; you never decide. You cannot approve loads, change grades, grant exceptions or promise outcomes.
Mention the dean only when the student asks for one of those decisions, and the Registrar only when the question is about enrollment schedules, payments or documents. Do not add these reminders to other answers.
If the record does not answer the question, say so briefly.
Reply in the language the student uses (English, Filipino or Taglish). Keep answers short: at most 5 sentences or a short list.`

export function studentContext(ev: Evaluation, rec: AdvisingRecord | undefined): string {
  const s = ev.student
  const lines: string[] = []
  lines.push(`Program: ${s.program}, curriculum ${s.curriculumVersion}`)
  lines.push(`Year standing: ${s.yearStanding ? YEAR_LABEL[s.yearStanding] : 'not yet set by the dean'}`)
  lines.push(`Classification: ${ev.classification === 'regular' ? 'Regular' : ev.classification === 'irregular' ? 'Irregular' : 'Not yet determined'}`)
  if (ev.classificationReasons.length) lines.push(`Why: ${ev.classificationReasons.join('; ')}`)
  lines.push(`Current term: ${termLabel(CURRENT_TERM)}`)
  lines.push('')
  lines.push('Subjects (code | title | units | year-sem | status | reason):')
  for (const x of Object.values(ev.subjects)) {
    const sub = x.subject
    lines.push(`${sub.code} | ${sub.title} | ${sub.units} | Y${sub.year}-S${sub.semester} | ${statusPhrase(x.status)} | ${x.reason}`)
  }
  lines.push('')
  const st = requestStatus(rec)
  if (rec?.decision) {
    const codes = rec.decision.subjectIds.map((id) => ev.subjects[id]?.subject.code).filter(Boolean)
    lines.push(`Approved load (${REQUEST_STATUS_LABEL[st]} by the dean): ${codes.join(', ')}`)
    if (rec.decision.remarks) lines.push(`Dean's remarks: ${rec.decision.remarks}`)
  } else {
    lines.push(`Subject load: ${REQUEST_STATUS_LABEL[st]}. The load is not yet decided; do not list or predict subjects for it.`)
  }
  return lines.join('\n')
}
