import { MagnifyingGlassIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FieldSelect, Segmented, Switch } from '../../components/controls'
import { PrerequisiteDialog } from '../../components/PrerequisiteDialog'
import { Page } from '../../layouts/AppShell'
import { filterSubjects, groupByTerm, programsOf, resolveCurriculum, totals, versionsFor, type SubjectFilter } from '../../domain/curriculumAdmin'
import { CURRENT_TERM, SEM_LABEL, YEAR_LABEL, termLabel } from '../../domain/term'
import type { Curriculum, CurriculumSubject, Placement, Prerequisite, YearLevel } from '../../domain/types'
import { useStore } from '../../store/AppStore'

type View = 'structure' | 'offerings'

export function DeanCurricula() {
  const { state, dispatch, curricula } = useStore()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<CurriculumSubject | null>(null)

  const curriculum = resolveCurriculum(curricula, params.get('program'), params.get('version'))
  const view: View = params.get('view') === 'offerings' ? 'offerings' : 'structure'
  // Offerings default to the current term's semester; 'all' is an explicit choice.
  const semParam = params.get('sem')
  const semValue = semParam ?? (view === 'offerings' ? String(CURRENT_TERM.sem) : '')
  const filter: SubjectFilter = {
    q: params.get('q') ?? '',
    year: (Number(params.get('year')) || null) as YearLevel | null,
    semester: (Number(semValue) || null) as Placement | null,
    status: view === 'offerings' ? ((params.get('status') as SubjectFilter['status']) ?? null) : null,
  }
  const secondaryActive = !!(filter.q || filter.year || semParam || filter.status)

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  const changeProgram = (program: string) => {
    // Keep the version only if it exists for the new program.
    const versions = versionsFor(curricula, program)
    set({ program, version: versions.includes(curriculum.version) ? curriculum.version : versions[0] })
  }

  const changeView = (v: View) => {
    if (v === 'offerings') set({ view: 'offerings' })
    else set({ view: null, status: null, sem: semParam === 'all' ? null : semParam })
  }

  const clearFilters = () => set({ q: null, year: null, sem: null, status: null })

  const offered = useMemo(() => new Set(state.offerings), [state.offerings])
  const visible = filterSubjects(curriculum.subjects, filter, offered)
  const all = totals(curriculum.subjects)
  const offeredCount = curriculum.subjects.filter((s) => offered.has(s.id)).length

  return (
    <Page>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2rem]">Curricula</h1>

      <div className="mt-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <FieldSelect
            label="Program"
            className="w-36"
            value={curriculum.program}
            onChange={changeProgram}
            options={programsOf(curricula).map((p) => ({ value: p, label: p }))}
          />
          <FieldSelect
            label="Curriculum"
            className="w-40"
            value={curriculum.version}
            onChange={(v) => set({ version: v })}
            options={versionsFor(curricula, curriculum.program).map((v) => ({ value: v, label: v }))}
          />
          <p className="pb-2 text-sm text-ink-3">
            <span className="num text-ink-2">{all.subjects}</span> subjects · <span className="num text-ink-2">{all.units}</span> units
          </p>
        </div>
        <Segmented<View>
          panelId="curriculum-panel"
          label="View"
          value={view}
          onChange={changeView}
          options={[
            { value: 'structure', label: 'Curriculum structure' },
            { value: 'offerings', label: 'Current offerings' },
          ]}
        />
      </div>

      {view === 'offerings' && (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{termLabel(CURRENT_TERM)}</h2>
          <span className="text-sm text-ink-3">
            <span className="num text-ink-2">{offeredCount}</span> of <span className="num">{all.subjects}</span> offered
          </span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative col-span-2 block sm:w-64">
          <span className="sr-only">Search subjects</span>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input type="search" className="input h-9 pl-9 text-sm" placeholder="Code or title" value={filter.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <ToolbarSelect
          label="Year level"
          value={filter.year ? String(filter.year) : ''}
          onChange={(v) => set({ year: v })}
          options={[{ value: '', label: 'All years' }, ...([1, 2, 3, 4] as const).filter((y) => curriculum.subjects.some((s) => s.year === y)).map((y) => ({ value: String(y), label: YEAR_LABEL[y] }))]}
        />
        <ToolbarSelect
          label="Semester"
          value={view === 'offerings' && semValue === '' ? 'all' : semValue || ''}
          onChange={(v) => set({ sem: view === 'offerings' ? (v === String(CURRENT_TERM.sem) ? null : v || 'all') : v })}
          options={[
            { value: view === 'offerings' ? 'all' : '', label: 'All semesters' },
            { value: '1', label: SEM_LABEL[1] },
            { value: '2', label: SEM_LABEL[2] },
            ...(curriculum.subjects.some((s) => s.semester === 3) ? [{ value: '3', label: SEM_LABEL[3] }] : []),
          ]}
        />
        {view === 'offerings' && (
          <ToolbarSelect
            label="Offered status"
            value={filter.status ?? ''}
            onChange={(v) => set({ status: v })}
            options={[
              { value: '', label: 'Any status' },
              { value: 'offered', label: 'Offered' },
              { value: 'notOffered', label: 'Not offered' },
            ]}
          />
        )}
        {secondaryActive && (
          <button className="btn btn-ghost btn-sm h-9 justify-self-start" onClick={clearFilters}>
            <XIcon size={14} /> Clear filters
          </button>
        )}
      </div>

      <div id="curriculum-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {visible.length === 0 ? (
          <div className="mt-8 border-y border-line py-12 text-center">
            <p className="text-sm text-ink-2">No subjects match</p>
            <button className="btn btn-secondary btn-sm mt-3" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-12">
            {groupByTerm(visible).map((y) => (
              <section key={y.year} aria-labelledby={`y-${y.year}`}>
                <h2 id={`y-${y.year}`} className="flex items-baseline justify-between border-b-2 border-ink pb-2 text-lg font-semibold">
                  {YEAR_LABEL[y.year]}
                  {view === 'structure' && (
                    <span className="text-sm font-normal text-ink-3">
                      <span className="num">{totals(curriculum.subjects.filter((s) => s.year === y.year)).units}</span> units
                    </span>
                  )}
                </h2>
                <div className="mt-5 space-y-8">
                  {y.semesters.map((g) =>
                    view === 'structure' ? (
                      <StructureGroup key={g.semester} curriculum={curriculum} semester={g.semester} subjects={g.subjects} overrides={state.prereqOverrides} onEdit={setEditing} />
                    ) : (
                      <OfferingGroup
                        key={g.semester}
                        curriculum={curriculum}
                        year={y.year}
                        semester={g.semester}
                        subjects={g.subjects}
                        offered={offered}
                        onToggle={(id) => dispatch({ type: 'toggleOffering', subjectId: id })}
                        onSetAll={(ids, value) =>
                          dispatch({
                            type: 'setOfferings',
                            subjectIds: ids,
                            offered: value,
                            label: `${curriculum.program} ${curriculum.version}, ${YEAR_LABEL[y.year]}, ${SEM_LABEL[g.semester]}`,
                          })
                        }
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

      </div>

      <PrerequisiteDialog
        curriculum={curriculum}
        subject={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={(prerequisites: Prerequisite[], reference: string) => {
          if (editing) dispatch({ type: 'setPrerequisites', subjectId: editing.id, prerequisites, reference })
          setEditing(null)
        }}
      />
    </Page>
  )
}

function ToolbarSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block sm:w-40">
      <span className="sr-only">{label}</span>
      <select className="input h-9 text-sm" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

const ROW_GRID = 'md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,18rem)_3.5rem_3rem]'

function SemesterHead({ semester, aside }: { semester: Placement; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-strong pb-1.5">
      <h3 className="text-sm font-semibold text-ink-2">{SEM_LABEL[semester]}</h3>
      {aside}
    </div>
  )
}

function ColumnHeads({ last }: { last: string }) {
  return (
    <div className={`hidden gap-4 pt-2 pb-1 text-xs text-ink-3 md:grid ${ROW_GRID}`}>
      <span>Code</span>
      <span>Descriptive title</span>
      <span>Prerequisites</span>
      <span className="col-span-2 text-right">{last}</span>
    </div>
  )
}

function PrereqList({ curriculum, prerequisites, compact, onFile = true }: { curriculum: Curriculum; prerequisites: Prerequisite[]; compact?: boolean; onFile?: boolean }) {
  // "None" when the prospectus says none; "-" when the cell is blank.
  if (!prerequisites.length) return <span className="text-ink-3">{onFile ? 'None' : '-'}</span>
  const subjects = prerequisites.flatMap((p) => (p.kind === 'subject' ? [curriculum.subjects.find((s) => s.id === p.subjectId)] : [])).filter(Boolean) as CurriculumSubject[]
  const standing = prerequisites.find((p) => p.kind === 'standing')
  const single = subjects.length === 1 && !standing && !compact
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {subjects.map((s) => (
        <span key={s.id} className="code rounded bg-sunken px-1.5 py-0.5 text-[0.75rem] text-ink" title={s.title}>
          {s.code}
        </span>
      ))}
      {single && <span className="truncate text-ink-3">{subjects[0].title}</span>}
      {standing && standing.kind === 'standing' && <span className="rounded bg-sunken px-1.5 py-0.5 text-xs text-ink">{YEAR_LABEL[standing.year]} standing</span>}
    </span>
  )
}

function StructureGroup({
  curriculum,
  semester,
  subjects,
  overrides,
  onEdit,
}: {
  curriculum: Curriculum
  semester: Placement
  subjects: CurriculumSubject[]
  overrides: Record<string, unknown>
  onEdit: (s: CurriculumSubject) => void
}) {
  // Totals describe the whole semester, independent of search.
  const year = subjects[0]?.year
  const semesterUnits = totals(curriculum.subjects.filter((s) => s.year === year && s.semester === semester)).units
  return (
    <div>
      <SemesterHead
        semester={semester}
        aside={
          <span className="text-xs text-ink-3">
            <span className="num">{semesterUnits}</span> units
          </span>
        }
      />
      <ColumnHeads last="Units" />
      <ul className="divide-y divide-line">
        {subjects.map((s) => (
          <li key={s.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-2.5 md:items-center md:gap-4 ${ROW_GRID}`}>
            <div className="min-w-0 space-y-1 md:contents">
              <span className="code block text-ink-2">{s.code}</span>
              <span className="block min-w-0">
                <span className="font-medium">{s.title}</span>
                {overrides[s.id] ? <span className="ml-2 text-xs text-ink-2">Edited</span> : null}
              </span>
              <span className="block text-[0.8125rem]">
                <span className="mr-1.5 text-xs text-ink-3 md:hidden">Prerequisites</span>
                <PrereqList curriculum={curriculum} prerequisites={s.prerequisites} onFile={s.prereqOnFile} />
                {/[/,;]/.test(s.prereqText) && !overrides[s.id] && <span className="mt-0.5 block text-xs text-ink-3">All required · printed “{s.prereqText}”</span>}
              </span>
            </div>
            <div className="flex flex-col items-end justify-between gap-2 md:contents">
              <span className="text-right text-sm">
                <span className="num">{s.units}</span>
                <span className="text-ink-3 md:hidden"> units</span>
              </span>
              <span className="flex justify-end">
                <button
                  className="btn btn-ghost h-8 w-8 p-0 text-ink-2 hover:text-ink"
                  onClick={() => onEdit(s)}
                  aria-label={`${s.prerequisites.length ? 'Edit' : 'Set'} prerequisites for ${s.code}`}
                  title={s.prerequisites.length ? 'Edit prerequisites' : 'Set prerequisites'}
                >
                  <PencilSimpleIcon size={15} />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OfferingGroup({
  curriculum,
  year,
  semester,
  subjects,
  offered,
  onToggle,
  onSetAll,
}: {
  curriculum: Curriculum
  year: YearLevel
  semester: Placement
  subjects: CurriculumSubject[]
  offered: ReadonlySet<string>
  onToggle: (id: string) => void
  onSetAll: (ids: string[], offered: boolean) => void
}) {
  const on = subjects.filter((s) => offered.has(s.id)).length
  const allOn = on === subjects.length
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  const bulk = () => {
    const ids = subjects.filter((s) => offered.has(s.id) === allOn).map((s) => s.id)
    // Withdrawing a whole group takes a second click to confirm.
    if (allOn && !confirming) return setConfirming(true)
    onSetAll(ids, !allOn)
    setConfirming(false)
  }

  return (
    <div>
      <SemesterHead
        semester={semester}
        aside={
          <span className="flex items-baseline gap-3 text-xs text-ink-3">
            <span>
              <span className="num">{on}</span>/<span className="num">{subjects.length}</span> offered
            </span>
            <button
              className={`font-medium hover:underline ${confirming ? 'text-bad' : 'text-ink'}`}
              onClick={bulk}
              aria-label={`${allOn ? (confirming ? 'Confirm withdraw' : 'Withdraw') : 'Offer'} all, ${YEAR_LABEL[year]} ${SEM_LABEL[semester]}`}
            >
              {allOn ? (confirming ? `Withdraw ${subjects.length}?` : 'Withdraw all') : 'Offer all'}
            </button>
          </span>
        }
      />
      <ColumnHeads last="Offered" />
      <ul className="divide-y divide-line">
        {subjects.map((s) => {
          const isOn = offered.has(s.id)
          return (
            <li key={s.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 md:gap-4 ${ROW_GRID}`}>
              <div className="min-w-0 space-y-1 md:contents">
                <span className="code block text-ink-2">{s.code}</span>
                <span className={`block font-medium ${isOn ? '' : 'text-ink-2'}`}>{s.title}</span>
                <span className="block text-[0.8125rem]">
                  <span className="mr-1.5 text-xs text-ink-3 md:hidden">Prerequisites</span>
                  <PrereqList curriculum={curriculum} prerequisites={s.prerequisites} onFile={s.prereqOnFile} compact />
                </span>
              </div>
              <span className="flex justify-end md:col-span-2">
                <Switch checked={isOn} onChange={() => onToggle(s.id)} label={`${s.code} offered this term`} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
