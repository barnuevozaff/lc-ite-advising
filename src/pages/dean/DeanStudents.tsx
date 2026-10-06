import { ArchiveIcon, ArrowCounterClockwiseIcon, CaretRightIcon, FunnelSimpleIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Modal } from '../../components/controls'
import { ClassificationTag, StatusTag } from '../../components/status'
import { Page, PageHeader } from '../../layouts/AppShell'
import { YEAR_LABEL } from '../../domain/term'
import type { Evaluation, Program, Student, YearLevel } from '../../domain/types'
import { useStore } from '../../store/AppStore'

interface Row {
  s: Student
  ev: Evaluation
}

type Filters = { program: string; year: string; section: string; issues: boolean; q: string }

const NO_STANDING = 'none'

const yearKey = (s: Student) => (s.yearStanding ? String(s.yearStanding) : NO_STANDING)
const yearName = (key: string) => (key === NO_STANDING ? 'Year standing not recorded' : YEAR_LABEL[Number(key) as YearLevel])
const sectionOf = (s: Student) => s.section?.trim() || ''

function uniqueSorted<T>(values: T[], compare?: (a: T, b: T) => number) {
  return [...new Set(values)].sort(compare)
}

export function DeanStudents() {
  const { state, dispatch, evaluate } = useStore()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [archiving, setArchiving] = useState<Student | null>(null)
  const [reason, setReason] = useState('')

  const f: Filters = {
    program: params.get('program') ?? '',
    year: params.get('year') ?? '',
    section: params.get('section') ?? '',
    issues: params.get('issues') === '1',
    q: params.get('q') ?? '',
  }

  // The archive is a separate view; archived students never mix with active ones.
  const showArchived = params.get('archived') === '1'
  const archivedCount = state.students.filter((s) => s.archived).length
  const all: Row[] = useMemo(
    () =>
      state.students
        .filter((s) => !!s.archived === showArchived)
        .map((s) => ({
          s,
          ev: evaluate(s.id),
        })),
    [state.students, evaluate, showArchived],
  )

  // Options are derived from the records themselves, narrowing down the hierarchy.
  const programs = uniqueSorted(all.map((r) => r.s.program))
  const inProgram = all.filter((r) => !f.program || r.s.program === f.program)
  const years = uniqueSorted(
    inProgram.filter((r) => r.s.yearStanding).map((r) => yearKey(r.s)),
    (a, b) => Number(a) - Number(b),
  )
  const inYear = inProgram.filter((r) => !f.year || yearKey(r.s) === f.year)
  const sections = uniqueSorted(inYear.map((r) => sectionOf(r.s)).filter(Boolean))

  /** Update filters; a parent change drops child selections that no longer exist. */
  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch }
    const progRows = all.filter((r) => !next.program || r.s.program === next.program)
    if (next.year && !progRows.some((r) => yearKey(r.s) === next.year)) next.year = ''
    const yearRows = progRows.filter((r) => !next.year || yearKey(r.s) === next.year)
    if (next.section && !yearRows.some((r) => sectionOf(r.s) === next.section)) next.section = ''
    const p = new URLSearchParams()
    if (next.program) p.set('program', next.program)
    if (next.year) p.set('year', next.year)
    if (next.section) p.set('section', next.section)
    if (next.issues) p.set('issues', '1')
    if (next.q) p.set('q', next.q)
    setParams(p, { replace: true })
  }

  const needle = f.q.trim().toLowerCase()
  const rows = inYear
    .filter((r) => !f.section || sectionOf(r.s) === f.section)
    .filter((r) => !f.issues || r.ev.missingData.length > 0)
    .filter((r) => !needle || `${r.s.firstName} ${r.s.lastName} ${r.s.lastName}, ${r.s.firstName} ${r.s.studentNo}`.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        a.s.program.localeCompare(b.s.program) ||
        (a.s.yearStanding ?? 9) - (b.s.yearStanding ?? 9) ||
        sectionOf(a.s).localeCompare(sectionOf(b.s)) ||
        a.s.lastName.localeCompare(b.s.lastName),
    )

  const structuralActive = !!(f.program || f.year || f.section || f.issues)
  const anyActive = structuralActive || !!f.q
  const activeCount = [f.program, f.year, f.section, f.issues].filter(Boolean).length

  const scope =
    [f.program, f.year && yearName(f.year), f.section && `Section ${f.section}`, f.issues && 'Needs update'].filter(Boolean).join(' · ') || 'All students'

  // Group by whatever the filters have not fixed yet: Program, then Year, then Section.
  const groupLevel: 'program' | 'year' | 'section' | null = !f.program ? 'program' : !f.year ? 'year' : !f.section && sections.length ? 'section' : null
  const groupKey = (s: Student) =>
    groupLevel === 'program'
      ? `${s.program}|${yearKey(s)}`
      : groupLevel === 'year'
        ? yearKey(s)
        : groupLevel === 'section'
          ? sectionOf(s) || '~'
          : ''
  const groupLabel = (s: Student) =>
    groupLevel === 'program'
      ? `${s.program} · ${yearName(yearKey(s))}`
      : groupLevel === 'year'
        ? yearName(yearKey(s))
        : sectionOf(s)
          ? `Section ${sectionOf(s)}`
          : 'No section'
  const groupPatch = (s: Student): Partial<Filters> =>
    groupLevel === 'program'
      ? { program: s.program, year: s.yearStanding ? yearKey(s) : '' }
      : groupLevel === 'year'
        ? { year: s.yearStanding ? yearKey(s) : '' }
        : { section: sectionOf(s) }
  const groupCounts = new Map<string, number>()
  if (groupLevel) for (const r of rows) groupCounts.set(groupKey(r.s), (groupCounts.get(groupKey(r.s)) ?? 0) + 1)
  // A group heading can narrow the view only when the group maps to a filter value.
  const groupClickable = (s: Student) => (groupLevel === 'section' ? !!sectionOf(s) : !!s.yearStanding || groupLevel === 'program')

  // Hide columns whose value is already fixed by a filter or by the group heading.
  const showProgram = !f.program && groupLevel !== 'program'
  const showYear = !f.year && groupLevel !== 'program' && groupLevel !== 'year'
  const showSection = sections.length > 0 && !f.section && groupLevel !== 'section'
  const colCount = 4 + (showProgram ? 1 : 0) + (showYear ? 1 : 0) + (showSection ? 1 : 0)

  const filterControls = (
    <>
      <Select
        label="Program"
        value={f.program}
        onChange={(v) => update({ program: v })}
        options={[{ value: '', label: 'All programs' }, ...programs.map((p: Program) => ({ value: p, label: p }))]}
      />
      <Select
        label="Year level"
        value={f.year}
        onChange={(v) => update({ year: v })}
        options={[{ value: '', label: 'All year levels' }, ...years.map((y) => ({ value: y, label: yearName(y) }))]}
      />
      {sections.length > 0 && (
        <Select
          label="Section"
          value={f.section}
          onChange={(v) => update({ section: v })}
          options={[{ value: '', label: 'All sections' }, ...sections.map((s) => ({ value: s, label: `Section ${s}` }))]}
        />
      )}
      <label className="inline-flex h-9 items-center gap-2 text-sm whitespace-nowrap text-ink-2">
        <input type="checkbox" checked={f.issues} onChange={(e) => update({ issues: e.target.checked })} className="h-4 w-4 accent-[var(--seal)]" />
        Needs update
      </label>
    </>
  )

  return (
    <Page wide>
      <PageHeader
        title={showArchived ? 'Archived students' : 'Student records'}
        actions={
          showArchived ? (
            <Link to="/dean/students" className="btn btn-secondary">
              Active students
            </Link>
          ) : (
            <Link to="/dean/students?archived=1" className="btn btn-ghost">
              <ArchiveIcon size={18} /> Archive <span className="num text-ink-3">{archivedCount}</span>
            </Link>
          )
        }
      />

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="flex gap-2 md:contents">
          <label className="relative block flex-1 md:w-64 md:flex-none">
            <span className="sr-only">Search students</span>
            <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
            <input type="search" className="input h-9 pl-9 text-sm" placeholder="Name or student number" value={f.q} onChange={(e) => update({ q: e.target.value })} />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm h-9 md:hidden"
            aria-expanded={filtersOpen}
            aria-controls="record-filters"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <FunnelSimpleIcon size={16} />
            Filters
            {activeCount > 0 && <span className="num rounded bg-ink px-1.5 text-xs text-paper">{activeCount}</span>}
          </button>
        </div>
        <div id="record-filters" className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 md:contents`}>
          {filterControls}
        </div>
        {anyActive && (
          <button className="btn btn-ghost btn-sm h-9 self-start md:self-auto" onClick={() => setParams(new URLSearchParams(showArchived ? 'archived=1' : ''), { replace: true })}>
            <XIcon size={14} />
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-6 mb-2 flex items-baseline gap-3">
        <h2 className="font-semibold">{scope}</h2>
        <span className="text-sm text-ink-3">
          <span className="num">{rows.length}</span> {rows.length === 1 ? 'student' : 'students'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="border-y border-line py-12 text-center">
          <p className="text-sm text-ink-2">{showArchived && !anyActive ? 'No archived students' : 'No students match'}</p>
          {anyActive && (
            <button className="btn btn-secondary btn-sm mt-3" onClick={() => setParams(new URLSearchParams(showArchived ? 'archived=1' : ''), { replace: true })}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tablet and desktop */}
          <div className="panel hidden overflow-x-auto md:block">
            <table className="ledger">
              <thead>
                <tr>
                  <th className="pl-4">Student</th>
                  {showProgram && <th>Program</th>}
                  {showYear && <th>Year standing</th>}
                  {showSection && <th>Section</th>}
                  <th>Curriculum</th>
                  <th>Entry AY</th>
                  <th>Evaluation</th>
                  <th className="w-24">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const startsGroup = groupLevel && (i === 0 || groupKey(rows[i - 1].s) !== groupKey(r.s))
                  return (
                    <Fragment key={r.s.id}>
                      {startsGroup && (
                        <tr>
                          <th colSpan={colCount + 1} className="bg-surface-2 pl-4 text-left">
                            <GroupHeading
                              label={groupLabel(r.s)}
                              count={groupCounts.get(groupKey(r.s)) ?? 0}
                              onSelect={groupClickable(r.s) ? () => update(groupPatch(r.s)) : undefined}
                            />
                          </th>
                        </tr>
                      )}
                      <tr className="group">
                        <td className="pl-4">
                          <Link to={`/dean/students/${r.s.id}/profile`} className="font-semibold hover:underline">
                            {r.s.lastName}, {r.s.firstName}
                          </Link>
                          <div className="num text-xs text-ink-3">{r.s.studentNo}</div>
                        </td>
                        {showProgram && <td>{r.s.program}</td>}
                        {showYear && <td>{r.s.yearStanding ? YEAR_LABEL[r.s.yearStanding] : <StatusTag status="recordUpdate" />}</td>}
                        {showSection && <td>{sectionOf(r.s) || <span className="text-ink-3">None</span>}</td>}
                        <td>{r.s.curriculumVersion}</td>
                        <td className="num text-[0.8125rem]">{r.s.entryAY}</td>
                        <td>{r.ev.classification === 'regular' ? <span className="text-ink-2">Regular</span> : <ClassificationTag value={r.ev.classification} />}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <ArchiveAction s={r.s} onArchive={() => setArchiving(r.s)} />
                            <Link to={`/dean/students/${r.s.id}/profile`} className="text-ink-3 group-hover:text-ink" aria-label={`Open ${r.s.firstName} ${r.s.lastName}`}>
                              <CaretRightIcon size={16} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phones */}
          <ul className="border-t border-line md:hidden">
            {rows.map((r, i) => {
              const startsGroup = groupLevel && (i === 0 || groupKey(rows[i - 1].s) !== groupKey(r.s))
              const meta = [
                showProgram ? r.s.program : '',
                showYear ? (r.s.yearStanding ? YEAR_LABEL[r.s.yearStanding] : '') : '',
                showSection && sectionOf(r.s) ? `Section ${sectionOf(r.s)}` : '',
              ].filter(Boolean)
              return (
                <Fragment key={r.s.id}>
                  {startsGroup && (
                    <li className="border-b border-line bg-surface-2 px-1 py-2">
                      <GroupHeading
                        label={groupLabel(r.s)}
                        count={groupCounts.get(groupKey(r.s)) ?? 0}
                        onSelect={groupClickable(r.s) ? () => update(groupPatch(r.s)) : undefined}
                      />
                    </li>
                  )}
                  <li className="flex items-center gap-1 border-b border-line">
                    <Link to={`/dean/students/${r.s.id}/profile`} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-3 active:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {r.s.lastName}, {r.s.firstName}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-3">
                          <span className="num">{r.s.studentNo}</span>
                          {meta.length > 0 && ` · ${meta.join(' · ')}`}
                        </div>
                        {(r.ev.classification !== 'regular' || !r.s.yearStanding) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {!r.s.yearStanding && <StatusTag status="recordUpdate" />}
                            {r.ev.classification !== 'regular' && <ClassificationTag value={r.ev.classification} />}
                          </div>
                        )}
                      </div>
                      <CaretRightIcon size={16} className="shrink-0 text-ink-3" aria-hidden />
                    </Link>
                    <ArchiveAction s={r.s} onArchive={() => setArchiving(r.s)} />
                  </li>
                </Fragment>
              )
            })}
          </ul>
        </>
      )}

      <Modal
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title={<h2 className="text-lg font-semibold">Archive {archiving?.firstName} {archiving?.lastName}</h2>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setArchiving(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!reason.trim()}
              onClick={() => {
                if (archiving) dispatch({ type: 'archiveStudent', studentId: archiving.id, reason })
                setArchiving(null)
                setReason('')
              }}
            >
              Archive
            </button>
          </>
        }
      >
        <label className="block">
          <span className="field-label">Reason</span>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus placeholder="e.g. Graduated, transferred, or stopped schooling" />
        </label>
        <p className="mt-2 text-xs text-ink-3">Nothing is deleted. The student moves to the Archive and can be restored there.</p>
      </Modal>
    </Page>
  )
}

/** Archive for active students, Restore in the Archive view. */
function ArchiveAction({ s, onArchive }: { s: Student; onArchive: () => void }) {
  const { dispatch } = useStore()
  return s.archived ? (
    <button className="btn btn-ghost btn-sm h-8 shrink-0" onClick={() => dispatch({ type: 'restoreStudent', studentId: s.id })}>
      <ArrowCounterClockwiseIcon size={15} /> Restore
    </button>
  ) : (
    <button className="btn btn-ghost h-8 w-8 shrink-0 p-0 text-ink-3 hover:text-ink" onClick={onArchive} aria-label={`Archive ${s.firstName} ${s.lastName}`} title="Archive">
      <ArchiveIcon size={16} />
    </button>
  )
}

function GroupHeading({ label, count, onSelect }: { label: string; count: number; onSelect?: () => void }) {
  const inner = (
    <>
      <span className="font-semibold text-ink">{label}</span>
      <span className="num font-normal text-ink-3">{count}</span>
    </>
  )
  return onSelect ? (
    <button className="inline-flex items-baseline gap-2 text-sm hover:underline" onClick={onSelect} title={`Show only ${label}`}>
      {inner}
    </button>
  ) : (
    <span className="inline-flex items-baseline gap-2 text-sm">{inner}</span>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="block md:w-auto">
      <span className="sr-only">{label}</span>
      <select className="input h-9 text-sm md:w-44" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
