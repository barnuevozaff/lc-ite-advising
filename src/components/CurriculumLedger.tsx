import { CaretRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { CURRENT_TERM, SEM_LABEL, YEAR_LABEL } from '../domain/term'
import type { Evaluation, Placement, SubjectEvaluation } from '../domain/types'
import { StatusTag, toneColor } from './status'
import { statusPhrase } from '../domain/rules'
import { subjectById } from '../data/curricula'

const FILTERS: { id: string; label: string; match: (s: SubjectEvaluation) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'done', label: 'Completed', match: (s) => s.status === 'passed' || s.status === 'credited' },
  { id: 'attention', label: 'Needs attention', match: (s) => !!s.flag || ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview', 'recordUpdate'].includes(s.status) },
  { id: 'eligible', label: 'Eligible', match: (s) => s.status === 'eligible' || (s.status === 'failed' && !!s.retakeAvailable) },
  { id: 'blocked', label: 'Blocked', match: (s) => s.status === 'blocked' },
  { id: 'notOffered', label: 'Not offered', match: (s) => s.status === 'notOffered' },
]

export function prereqText(s: SubjectEvaluation) {
  if (!s.subject.prerequisites.length) return s.subject.prereqOnFile ? 'None' : '-'
  return s.subject.prerequisites
    .map((p) => (p.kind === 'standing' ? `${YEAR_LABEL[p.year]} standing` : (subjectById(p.subjectId)?.code ?? p.subjectId)))
    .join(', ')
}

function gradeCell(s: SubjectEvaluation) {
  const last = s.attempts.at(-1)
  if (s.finalGrade !== undefined) return String(s.finalGrade)
  if (!last) return ''
  const r = last.result
  return r.kind === 'INC' ? 'INC' : r.kind === 'UW' ? 'UW' : r.kind === 'Dropped' ? 'DRP' : r.kind === 'Credited' ? 'CR' : ''
}

/** Prerequisites with unmet entries marked, so the reason for a block sits where the requirement is listed. */
function PrereqCell({ s }: { s: SubjectEvaluation }) {
  if (!s.checks.length) return <span className="text-ink-3">{s.subject.prereqOnFile ? 'None' : '-'}</span>
  const showUnmet = s.status === 'blocked' || s.status === 'recordUpdate'
  return (
    <>
      {s.checks.map((c, i) => {
        const label = c.prereq.kind === 'standing' ? `${YEAR_LABEL[c.prereq.year]} standing` : (subjectById(c.prereq.subjectId)?.code ?? '')
        const unmet = showUnmet && !c.satisfied
        return (
          <span key={i}>
            {i > 0 && ', '}
            {unmet ? (
              <span className={`font-medium ${c.unknown ? 'text-data' : 'text-warn'} ${s.blockCause === 'sequence' ? 'opacity-70' : ''}`}>
                {label}
                <span className="sr-only"> (not satisfied)</span>
              </span>
            ) : (
              label
            )}
          </span>
        )
      })}
    </>
  )
}

export function CurriculumLedger({ ev, onSelect, selectedId }: { ev: Evaluation; onSelect: (id: string) => void; selectedId?: string }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const all = Object.values(ev.subjects)

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, all.filter(f.match).length])), [all])
  const f = FILTERS.find((x) => x.id === filter)!
  const q = query.trim().toLowerCase()
  const visible = all.filter((s) => f.match(s) && (!q || s.subject.code.toLowerCase().includes(q) || s.subject.title.toLowerCase().includes(q)))

  const groups: { key: string; year: number; sem: Placement; rows: SubjectEvaluation[] }[] = []
  for (const s of visible) {
    const key = `${s.subject.year}.${s.subject.semester}`
    let g = groups.find((x) => x.key === key)
    if (!g) groups.push((g = { key, year: s.subject.year, sem: s.subject.semester, rows: [] }))
    g.rows.push(s)
  }
  const standing = ev.student.yearStanding

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0" role="tablist" aria-label="Filter subjects">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={filter === x.id}
              onClick={() => setFilter(x.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ${
                filter === x.id ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink'
              }`}
            >
              {x.label}
              <span className={`num text-xs ${filter === x.id ? 'opacity-70' : 'text-ink-3'}`}>{counts[x.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative block lg:w-64">
          <span className="sr-only">Search subjects</span>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input className="input h-9 pl-9 text-sm" placeholder="Code or title" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {groups.length === 0 && (
        <div className="mt-8 py-10 text-center">
          <p className="text-sm text-ink-2">No matching subjects</p>
        </div>
      )}

      <div className="mt-6 space-y-10">
        {groups.map((g) => {
          const isNow = standing === g.year && CURRENT_TERM.sem === g.sem
          const groupAll = all.filter((s) => s.subject.year === g.year && s.subject.semester === g.sem)
          const doneUnits = groupAll.filter((s) => s.status === 'passed' || s.status === 'credited').reduce((n, s) => n + s.subject.units, 0)
          const totalUnits = groupAll.reduce((n, s) => n + s.subject.units, 0)
          return (
            <section key={g.key} className="border-t-2 border-ink" aria-labelledby={`g-${g.key}`}>
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line-strong px-1 py-3 md:px-3">
                <h3 id={`g-${g.key}`} className="flex items-center gap-2 font-semibold">
                  {YEAR_LABEL[g.year as 1]}, {SEM_LABEL[g.sem]}
                  {isNow && <span className="rounded bg-seal px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">This semester</span>}
                </h3>
                <span className="num text-xs text-ink-3" aria-label={`${doneUnits} of ${totalUnits} units completed`}>
                  {doneUnits}/{totalUnits} units
                </span>
              </header>

              {/* Wide screens: ledger table */}
              <table className="ledger hidden md:table">
                <thead>
                  <tr>
                    <th className="w-28">Code</th>
                    <th>Descriptive title</th>
                    <th className="w-14 text-right">Units</th>
                    <th className="w-44">Prerequisites</th>
                    <th className="w-16 text-right">Grade</th>
                    <th className="w-60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((s) => (
                    <tr
                      key={s.subject.id}
                      data-interactive
                      data-muted={(s.status === 'blocked' && s.blockCause === 'sequence') || undefined}
                      onClick={() => onSelect(s.subject.id)}
                      aria-selected={selectedId === s.subject.id}
                    >
                      <td className="code">{s.subject.code}</td>
                      <td>
                        <button className="text-left font-medium hover:underline focus-visible:underline" onClick={(e) => (e.stopPropagation(), onSelect(s.subject.id))}>
                          {s.subject.title}
                        </button>
                      </td>
                      <td className="num text-right">{s.subject.units}</td>
                      <td className="text-[0.8125rem] text-ink-2">
                        <PrereqCell s={s} />
                      </td>
                      <td className="num text-right">{gradeCell(s)}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusTag status={s.status} flag={s.flag} quiet={s.status === 'passed' || (s.status === 'blocked' && s.blockCause === 'sequence')} />
                        </div>
                        {s.note && !(s.status === 'blocked' && s.blockCause === 'sequence') && <div className="mt-1 text-xs text-ink-2">{s.note}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phones: stacked entries */}
              <ul className="divide-y divide-line md:hidden">
                {g.rows.map((s) => (
                  <li key={s.subject.id}>
                    <button className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-surface-2" onClick={() => onSelect(s.subject.id)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="code font-semibold">{s.subject.code}</span>
                          <span className="num text-sm">{gradeCell(s)}</span>
                        </div>
                        <div className="mt-0.5 text-[0.9375rem] leading-snug">{s.subject.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusTag status={s.status} flag={s.flag} quiet={s.status === 'passed' || (s.status === 'blocked' && s.blockCause === 'sequence')} />
                        </div>
                        {s.note && !(s.status === 'blocked' && s.blockCause === 'sequence') && <div className="mt-1 text-xs text-ink-2">{s.note}</div>}
                      </div>
                      <CaretRightIcon size={16} className="mt-1 shrink-0 text-ink-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** Compact curriculum map: one mark per subject, grouped by semester. */
type MarkKind = 'done' | 'failed' | 'pending' | 'eligible' | 'blocked' | 'open'

function markOf(s: SubjectEvaluation): { kind: MarkKind; color: string } {
  switch (s.status) {
    case 'passed':
    case 'credited':
      return { kind: 'done', color: 'var(--ok)' }
    case 'failed':
      return { kind: 'failed', color: 'var(--bad)' }
    case 'pending':
    case 'notCompletedReview':
    case 'notCompleted':
    case 'deanReview':
    case 'recordUpdate':
      return { kind: 'pending', color: toneColor(s.status) }
    case 'eligible':
      return { kind: 'eligible', color: 'var(--teal)' }
    case 'blocked':
      return s.blockCause === 'sequence' ? { kind: 'open', color: 'var(--ink-3)' } : { kind: 'blocked', color: 'var(--warn)' }
    default:
      return { kind: 'open', color: 'var(--ink-3)' }
  }
}

const LEGEND: { kind: MarkKind; color: string; label: string }[] = [
  { kind: 'done', color: 'var(--ok)', label: 'Completed' },
  { kind: 'failed', color: 'var(--bad)', label: 'Failed' },
  { kind: 'pending', color: 'var(--act)', label: 'Pending' },
  { kind: 'eligible', color: 'var(--teal)', label: 'Eligible' },
  { kind: 'blocked', color: 'var(--warn)', label: 'Blocked' },
  { kind: 'open', color: 'var(--ink-3)', label: 'Not yet taken' },
]

export function CurriculumMap({ ev }: { ev: Evaluation }) {
  const years = [1, 2, 3, 4] as const
  const hasSummer = Object.values(ev.subjects).some((s) => s.subject.semester === 3)
  const standing = ev.student.yearStanding
  return (
    <div>
      <div className={`grid items-center gap-x-2 gap-y-2.5 text-xs ${hasSummer ? 'grid-cols-[auto_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_1fr]'}`}>
        <span />
        <span className="text-ink-3">1st Sem</span>
        <span className="text-ink-3">2nd Sem</span>
        {hasSummer && <span className="text-ink-3">Summer</span>}
        {years.map((y) => (
          <div key={y} className="contents">
            <span className="whitespace-nowrap text-ink-3">Year {y}</span>
            {(hasSummer ? ([1, 2, 3] as const) : ([1, 2] as const)).map((sem) => {
              const subs = Object.values(ev.subjects).filter((s) => s.subject.year === y && s.subject.semester === sem)
              const done = subs.filter((s) => s.status === 'passed' || s.status === 'credited').length
              const isNow = standing === y && CURRENT_TERM.sem === sem
              return (
                <div
                  key={sem}
                  className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${isNow ? 'ring-1 ring-seal' : ''}`}
                  role="img"
                  aria-label={`Year ${y}, ${sem === 1 ? 'first semester' : sem === 2 ? 'second semester' : 'summer'}${isNow ? ' (this semester)' : ''}: ${done} of ${subs.length} completed. ${subs.map((s) => `${s.subject.code} ${statusPhrase(s.status)}`).join('; ')}`}
                >
                  <div className="flex gap-[3px]">
                    {subs.map((s) => {
                      const m = markOf(s)
                      return <span key={s.subject.id} className="mark" data-kind={m.kind} style={{ color: m.color }} title={`${s.subject.code}: ${statusPhrase(s.status)}`} />
                    })}
                  </div>
                  <span className="num ml-auto text-ink-3">
                    {done}/{subs.length}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
        {LEGEND.map((l) => (
          <li key={l.kind} className="flex items-center gap-1.5">
            <span className="mark shrink-0" data-kind={l.kind} style={{ color: l.color }} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
