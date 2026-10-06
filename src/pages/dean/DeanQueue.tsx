import { CaretRightIcon, MagnifyingGlassIcon, UserPlusIcon, XIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassificationTag } from '../../components/status'
import { formatDate, standingText } from '../../components/provenance'
import { Page, PageHeader } from '../../layouts/AppShell'
import { advisingIssues, filterRequests } from '../../domain/advising'
import { advisingState } from '../../domain/rules'
import { YEAR_LABEL } from '../../domain/term'
import type { AdvisingState, YearLevel } from '../../domain/types'
import { activeStudents, useStore } from '../../store/AppStore'
import { AddStudent } from './AddStudent'
import { ScanGrades } from './ScanGrades'

const TABS: { id: string; label: string; states: AdvisingState[] }[] = [
  { id: 'confirm', label: 'For confirmation', states: ['awaitingConfirmation'] },
  { id: 'review', label: 'For review', states: ['awaitingReview'] },
  { id: 'standing', label: 'Needs year standing', states: ['recordUpdate'] },
  { id: 'decided', label: 'Decided', states: ['confirmed', 'approved'] },
  { id: 'all', label: 'All', states: ['awaitingConfirmation', 'awaitingReview', 'recordUpdate', 'confirmed', 'approved'] },
]

export function DeanQueue() {
  const { state, evaluate } = useStore()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const tab = params.get('tab') ?? 'review'
  const filter = { program: params.get('program') ?? '', year: params.get('year') ?? '', q: params.get('q') ?? '' }

  const set = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  // Only students with an evaluation this term (started by the dean's scan) appear here.
  const rows = useMemo(
    () =>
      activeStudents(state.students)
        .filter((s) => state.advising[s.id]?.requestedAt || state.advising[s.id]?.decision)
        .map((s) => {
          const ev = evaluate(s.id)
          const rec = state.advising[s.id]
          return {
            s,
            ev,
            rec,
            st: advisingState(ev, rec),
            issues: advisingIssues(ev),
          }
        })
        .sort((a, b) => (a.rec?.requestedAt ?? '').localeCompare(b.rec?.requestedAt ?? '')),
    [state, evaluate],
  )

  const t = TABS.find((x) => x.id === tab) ?? TABS[1]
  const filtered = filterRequests(rows, filter)
  const count = (x: (typeof TABS)[number]) => filtered.filter((r) => x.states.includes(r.st)).length
  const visible = filtered.filter((r) => t.states.includes(r.st))
  const programs = [...new Set(rows.map((r) => r.s.program))].sort()
  const years = [...new Set(rows.flatMap((r) => (r.s.yearStanding ? [r.s.yearStanding] : [])))].sort() as YearLevel[]
  const filtersActive = !!(filter.program || filter.year || filter.q)

  return (
    <Page wide>
      <PageHeader
        title="Evaluations"
        actions={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <UserPlusIcon size={18} /> Add student
          </button>
        }
      />
      <AddStudent open={adding} onClose={() => setAdding(false)} onScan={() => setScanning(true)} />
      <ScanGrades open={scanning} onClose={() => setScanning(false)} />

      <div className="-mx-4 flex overflow-x-auto border-b border-line px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Evaluation state">
        {TABS.map((x, i) => {
          const active = x.id === t.id
          return (
            <button
              key={x.id}
              id={`qtab-${x.id}`}
              role="tab"
              aria-selected={active}
              aria-controls="queue-panel"
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => {
                const last = TABS.length - 1
                const n = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
                if (n < 0) return
                e.preventDefault()
                set({ tab: TABS[n].id })
                document.getElementById(`qtab-${TABS[n].id}`)?.focus()
              }}
              onClick={() => set({ tab: x.id })}
              className={`relative flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
            >
              {x.label}
              <span className={`num rounded px-1.5 text-xs ${active ? 'bg-ink text-paper' : 'bg-sunken text-ink-2'}`}>{count(x)}</span>
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" aria-hidden />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative col-span-2 block sm:w-64">
          <span className="sr-only">Search students</span>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input type="search" className="input h-9 pl-9 text-sm" placeholder="Name or student number" value={filter.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <label className="block sm:w-40">
          <span className="sr-only">Program</span>
          <select className="input h-9 text-sm" aria-label="Program" value={filter.program} onChange={(e) => set({ program: e.target.value })}>
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:w-40">
          <span className="sr-only">Year level</span>
          <select className="input h-9 text-sm" aria-label="Year level" value={filter.year} onChange={(e) => set({ year: e.target.value })}>
            <option value="">All year levels</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {YEAR_LABEL[y]}
              </option>
            ))}
          </select>
        </label>
        {filtersActive && (
          <button className="btn btn-ghost btn-sm h-9 justify-self-start" onClick={() => set({ program: '', year: '', q: '' })}>
            <XIcon size={14} /> Clear filters
          </button>
        )}
      </div>

      <div id="queue-panel" role="tabpanel" aria-labelledby={`qtab-${t.id}`}>
      {visible.length === 0 ? (
        <div className="mt-6 border-y border-line py-14 text-center">
          <p className="text-sm text-ink-2">{filtersActive ? 'No evaluations match these filters' : t.id === 'decided' ? 'No decisions yet' : 'Nothing waiting'}</p>
        </div>
      ) : (
        <>
          <table className="ledger mt-4 hidden md:table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Program and curriculum</th>
                <th>Year standing</th>
                <th>Status</th>
                <th>Issues</th>
                <th>{t.id === 'decided' ? 'Decided' : 'Started'}</th>
                <th className="w-8">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ s, ev, rec, issues }) => (
                <tr key={s.id} className="group">
                  <td>
                    <Link to={`/dean/students/${s.id}`} className="font-semibold hover:underline">
                      {s.lastName}, {s.firstName}
                    </Link>
                    <div className="num text-xs text-ink-3">{s.studentNo}</div>
                  </td>
                  <td>
                    {s.program} <span className="text-ink-3">{s.curriculumVersion}</span>
                  </td>
                  <td className={s.yearStanding ? '' : 'text-data'}>{standingText(s.yearStanding)}</td>
                  <td>{ev.classification === 'regular' ? <span className="text-ink-2">Regular</span> : <ClassificationTag value={ev.classification} />}</td>
                  <td className="text-[0.8125rem] text-ink-2">
                    <Issues issues={issues} />
                  </td>
                  <td className="num text-[0.8125rem] text-ink-2">{rec?.decision ? formatDate(rec.decision.at) : rec?.requestedAt ? formatDate(rec.requestedAt) : ''}</td>
                  <td>
                    <Link to={`/dean/students/${s.id}`} aria-label={`Open ${s.firstName} ${s.lastName}`} className="text-ink-3 group-hover:text-ink">
                      <CaretRightIcon size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-3 border-t border-line md:hidden">
            {visible.map(({ s, ev, issues }) => (
              <li key={s.id} className="border-b border-line">
                <Link to={`/dean/students/${s.id}`} className="flex items-start gap-3 px-1 py-3.5 active:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">
                        {s.lastName}, {s.firstName}
                      </span>
                      <span className="num text-xs text-ink-3">{s.studentNo}</span>
                    </div>
                    <div className="mt-0.5 text-sm text-ink-2">
                      {s.program} {s.curriculumVersion} · {standingText(s.yearStanding)}
                    </div>
                    {(ev.classification !== 'regular' || issues.length > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                        {ev.classification !== 'regular' && <ClassificationTag value={ev.classification} />}
                        <Issues issues={issues} />
                      </div>
                    )}
                  </div>
                  <CaretRightIcon size={16} className="mt-1 shrink-0 text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
    </Page>
  )
}

function Issues({ issues }: { issues: string[] }) {
  return <>{issues.length ? issues.join(' · ') : <span className="text-ink-3">None</span>}</>
}
