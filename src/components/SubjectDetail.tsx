import { ChatCircleTextIcon, CheckIcon, QuestionIcon, XIcon } from '@phosphor-icons/react'
import { downstreamOf, resultText, outcomeOf } from '../domain/rules'
import { termLabel } from '../domain/term'
import type { Evaluation } from '../domain/types'
import { FlagTag, StatusTag, toneColor } from './status'

const OUTCOME_LABEL = {
  passed: 'Passed',
  failed: 'Failed/For Retake',
  pending: 'Pending/Needs Action',
  notCompletedReview: 'Not Completed/Needs Review',
  notCompleted: 'Not Completed',
  credited: 'Credited/Substituted',
  creditPending: 'Requires Dean Review',
} as const

export function SubjectDetail({
  ev,
  subjectId,
  onSelect,
  onAsk,
}: {
  ev: Evaluation
  subjectId: string
  onSelect?: (id: string) => void
  onAsk?: (question: string) => void
}) {
  const x = ev.subjects[subjectId]
  if (!x) return null
  const s = x.subject
  const affected = downstreamOf(ev, s.id)
  const showAffects = ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview'].includes(x.status) && affected.length > 0

  return (
    <div className="space-y-7">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={x.status} full />
          {x.flag && <FlagTag flag={x.flag} />}
        </div>
        <p className="mt-3 text-[0.9375rem]">{x.reason}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
          <div>
            <dt className="text-xs text-ink-3">Units</dt>
            <dd className="num mt-0.5">{s.units}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Placement</dt>
            <dd className="mt-0.5">
              Year {s.year}, {s.semester === 1 ? '1st Sem' : s.semester === 2 ? '2nd Sem' : 'Summer'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">This semester</dt>
            <dd className="mt-0.5">{x.offered ? 'Offered' : 'Not offered'}</dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="pr-h">
        <h3 id="pr-h" className="text-sm font-semibold">
          Prerequisites
        </h3>
        {s.prereqOnFile && x.checks.length > 0 && (
          <p className="mt-1 text-xs text-ink-3">
            Prospectus: “{s.prereqText}”{/[/,;]/.test(s.prereqText) ? ' · all required' : ''}
          </p>
        )}
        {x.checks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">{s.prereqOnFile ? 'None' : '-'}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {x.checks.map((c, i) => {
              const Icon = c.unknown ? QuestionIcon : c.satisfied ? CheckIcon : XIcon
              const color = c.unknown ? 'var(--data)' : c.satisfied ? 'var(--ok)' : 'var(--bad)'
              const clickable = c.prereq.kind === 'subject' && onSelect
              return (
                <li key={i} className="flex items-start gap-3 py-2.5 text-sm">
                  <Icon size={16} weight="bold" style={{ color }} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="sr-only">{c.unknown ? 'Cannot be checked:' : c.satisfied ? 'Satisfied:' : 'Not satisfied:'}</span>
                  {clickable ? (
                    <button className="text-left underline decoration-line-strong underline-offset-2 hover:decoration-ink-3" onClick={() => onSelect(c.prereq.kind === 'subject' ? c.prereq.subjectId : '')}>
                      {c.detail}
                    </button>
                  ) : (
                    <span>{c.detail}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {x.status === 'blocked' && x.chains.length > 0 && (
        <section aria-labelledby="ch-h">
          <h3 id="ch-h" className="text-sm font-semibold">
            Prerequisite chain
          </h3>
          
          <div className="mt-3 space-y-4">
            {x.chains.map((chain, ci) => (
              <ol key={ci} className="relative" aria-label={`Chain ${ci + 1}`}>
                {chain.map((l, li) => {
                  const isRoot = li === 0
                  const isSelf = li === chain.length - 1
                  const rootStatus = l.subjectId ? ev.subjects[l.subjectId]?.status : undefined
                  const color = isRoot && rootStatus ? toneColor(rootStatus) : isRoot ? 'var(--warn)' : 'var(--ink-3)'
                  return (
                    <li key={li}>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                          style={{ borderColor: color, background: isRoot ? color : 'var(--surface)' }}
                          aria-hidden
                        />
                        {l.subjectId && !isSelf && onSelect ? (
                          <button className="code font-semibold hover:underline" onClick={() => onSelect(l.subjectId!)}>
                            {l.label}
                          </button>
                        ) : (
                          <span className={l.subjectId ? 'code font-semibold' : 'text-sm font-semibold'}>{l.label}</span>
                        )}
                        <span className="text-sm text-ink-2">{isSelf ? 'this subject' : l.note}</span>
                      </div>
                      {!isSelf && (
                        <div className="ml-[11px] h-4 border-l-2 border-line-strong" aria-hidden />
                      )}
                    </li>
                  )
                })}
              </ol>
            ))}
          </div>
        </section>
      )}

      {showAffects && (
        <section aria-labelledby="af-h">
          <h3 id="af-h" className="text-sm font-semibold">
            Blocks {affected.length} subject{affected.length > 1 ? 's' : ''}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {affected.map((id) => (
              <li key={id}>
                <button
                  className="code inline-flex h-7 items-center rounded-md border border-line px-2 hover:border-line-strong hover:bg-surface-2"
                  onClick={() => onSelect?.(id)}
                  title={ev.subjects[id].subject.title}
                >
                  {ev.subjects[id].subject.code}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="hi-h">
        <h3 id="hi-h" className="text-sm font-semibold">
          Academic history
        </h3>
        {x.attempts.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No record</p>
        ) : (
          <table className="ledger mt-2">
            <thead>
              <tr>
                <th>Term</th>
                <th>Result</th>
                <th>Classified as</th>
              </tr>
            </thead>
            <tbody>
              {x.attempts.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{termLabel(a.term, true)}</td>
                  <td className="num">{resultText(a)}</td>
                  <td className="text-ink-2">{OUTCOME_LABEL[outcomeOf(a)]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {onAsk && (
        <button className="btn btn-secondary w-full" onClick={() => onAsk(questionFor(x.status, s.code))}>
          <ChatCircleTextIcon size={18} />
          Ask about {s.code}
        </button>
      )}
    </div>
  )
}

function questionFor(status: string, code: string) {
  if (status === 'blocked') return `Why can't I take ${code} yet?`
  if (status === 'notOffered') return `Why is ${code} not in my load?`
  if (status === 'pending') return `What happens with my INC in ${code}?`
  return `Explain the status of ${code}.`
}

