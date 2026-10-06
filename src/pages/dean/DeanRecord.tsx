import {
  ArrowCounterClockwiseIcon,
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarXIcon,
  CertificateIcon,
  CheckCircleIcon,
  CheckIcon,
  HourglassMediumIcon,
  LockIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
  NotePencilIcon,
  PlusIcon,
  LockOpenIcon,
  PrinterIcon,
  ScanIcon,
  StampIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Modal, Segmented } from '../../components/controls'
import { Sheet } from '../../components/Sheet'
import { SubjectDetail } from '../../components/SubjectDetail'
import { Stamp, formatDate, formatDateTime } from '../../components/provenance'
import { AdvisingStateTag, StatusTag } from '../../components/status'
import { StudentHeading, useLatched } from '../../components/student-bits'
import { Page } from '../../layouts/AppShell'
import { composeLoad, decidedSubjects, isProposed, loadSubjectView, validateLoad, type LoadSubjectState, type LoadSubjectView } from '../../domain/advising'
import { groupByTerm } from '../../domain/curriculumAdmin'
import { LOAD_BASIS_LABEL, advisingState, deanReviewItems, unitsOf } from '../../domain/rules'
import { CURRENT_TERM, SEM_LABEL, YEAR_LABEL, termLabel } from '../../domain/term'
import type { AdvisingRecord, Evaluation, SubjectEvaluation, YearLevel } from '../../domain/types'
import { useStore } from '../../store/AppStore'
import { ScanGrades } from './ScanGrades'

export function DeanRecord() {
  const { id = '' } = useParams()
  const { state, dispatch, evaluate } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const shown = useLatched(selected)
  const [fresh, setFresh] = useState(false)
  const [params, setParams] = useSearchParams()
  // Arriving from "Add student" opens the scanner right away.
  const [scanning, setScanning] = useState(params.get('scan') === '1')
  const [reopening, setReopening] = useState(false)
  const [reason, setReason] = useState('')
  const student = state.students.find((s) => s.id === id)
  const rec = state.advising[id]

  // Opening a submitted request marks it as under review for the student.
  useEffect(() => {
    if (rec?.requestedAt && !rec.reviewStartedAt && !rec.decision) dispatch({ type: 'startReview', studentId: id })
  }, [id, rec?.requestedAt, rec?.reviewStartedAt, rec?.decision, dispatch])

  if (!student)
    return (
      <Page>
        <p className="text-ink-2">Student not found.</p>
        <Link to="/dean" className="btn btn-secondary mt-4">
          Back
        </Link>
      </Page>
    )

  const ev = evaluate(id)
  const st = advisingState(ev, rec)
  const decided = rec?.decision
  const requested = !!rec?.requestedAt
  const archived = student.archived
  const editable = requested && !decided && !archived && ev.load.kind !== 'none'
  const load = composeLoad(ev, rec)
  const cases = deanReviewItems(ev)
  const unresolved = Object.values(ev.subjects).filter((x) => ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview', 'recordUpdate'].includes(x.status))
  const history = state.audit.filter((a) => a.studentId === id)

  const decide = () => {
    dispatch({ type: 'decide', studentId: id, kind: ev.classification === 'regular' ? 'confirmed' : 'approved', subjectIds: load })
    setFresh(true)
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <Page wide>
      <Link to="/dean" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeftIcon size={14} /> Requests
      </Link>
      <StudentHeading
        ev={ev}
        actions={
          archived ? (
            <Link to={`/dean/students/${id}/profile`} className="btn btn-secondary btn-sm h-9">
              Open student record
            </Link>
          ) : (
          <>
            {!decided && requested && <AdvisingStateTag state={st} />}
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-ink-3">Year standing</span>
              <select
                className={`input h-9 w-auto text-sm ${student.yearStanding ? '' : 'border-act text-act'}`}
                value={student.yearStanding ?? ''}
                disabled={!!decided}
                onChange={(e) => dispatch({ type: 'setStanding', studentId: id, year: e.target.value ? (Number(e.target.value) as YearLevel) : null })}
              >
                <option value="">Not set</option>
                {([1, 2, 3, 4] as const).map((y) => (
                  <option key={y} value={y}>
                    {YEAR_LABEL[y]}
                  </option>
                ))}
              </select>
            </label>
            {decided ? (
              <>
                <button className="btn btn-ghost btn-sm h-9" onClick={() => setReopening(true)}>
                  <ArrowCounterClockwiseIcon size={16} /> Reopen
                </button>
                <Link to={`/dean/students/${id}/print`} className="btn btn-primary btn-sm h-9">
                  <PrinterIcon size={16} /> Print pre-enrollment form
                </Link>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm h-9" onClick={() => setScanning(true)}>
                <ScanIcon size={16} /> Scan grade record
              </button>
            )}
          </>
          )
        }
      />

      {archived && (
        <p className="-mt-4 mb-8 flex items-start gap-2 rounded-md bg-mute-tint px-3 py-2 text-sm">
          <ArchiveIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Archived {formatDate(archived.at)}</span> · {archived.reason}. Records are kept and read-only until restored from Student records.
          </span>
        </p>
      )}

      {unresolved.length > 0 && (
        <div className="-mt-4 mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm">
          <span className="text-xs font-medium text-ink-3">Needs attention</span>
          {unresolved.map((x) => (
            <button key={x.subject.id} className="inline-flex items-baseline gap-1.5 hover:underline" onClick={() => setSelected(x.subject.id)}>
              <span className="code">{x.subject.code}</span>
              <StatusTag status={x.status} quiet />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-10">
        <div className="xl:sticky xl:top-6 xl:self-start">
          {!requested && !decided ? (
            <section className="panel px-5 py-6" aria-label="Not yet evaluated">
              <h2 className="font-semibold">Not yet evaluated for {termLabel(CURRENT_TERM)}</h2>
              <p className="mt-1 text-sm text-ink-2">Scan the student’s grade record to start.</p>
              <button className="btn btn-primary mt-4" onClick={() => setScanning(true)}>
                <ScanIcon size={18} /> Scan grade record
              </button>
            </section>
          ) : ev.load.kind === 'none' && !decided ? (
            <RecordUpdatePanel ev={ev} />
          ) : (
            <LoadPanel
              ev={ev}
              rec={rec}
              ids={load}
              editable={editable}
              fresh={fresh}
              onRemove={(sid) => dispatch({ type: 'removeFromLoad', studentId: id, subjectId: sid })}
              onRestore={(sid) => dispatch({ type: 'addToLoad', studentId: id, subjectId: sid })}
              onSelect={setSelected}
              onRemarks={(r) => dispatch({ type: 'setRemarks', studentId: id, remarks: r })}
              onConfirm={decide}
            />
          )}

          {cases.length > 0 && (
            <section className="mt-8" aria-labelledby="cases-h">
              <h2 id="cases-h" className="flex items-center gap-2 font-semibold">
                <StampIcon size={17} className="text-seal-text" aria-hidden /> Dean review <span className="num text-sm font-normal text-ink-3">{cases.length}</span>
              </h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {cases.map((c) => (
                  <CaseItem key={c.subject.id} c={c} studentId={id} decisions={(rec?.caseDecisions ?? []).filter((d) => d.subjectId === c.subject.id)} onSelect={setSelected} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <CurriculumExplorer
          ev={ev}
          rec={rec}
          load={load}
          editable={editable}
          onAdd={(sid) => dispatch({ type: 'addToLoad', studentId: id, subjectId: sid })}
          onAllow={(sid, reason) => dispatch({ type: 'allowSubject', studentId: id, subjectId: sid, reason })}
          onSelect={setSelected}
        />
      </div>

      <details className="group mt-12 border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Academic record and history
        </summary>
        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold">{ev.classification === 'regular' ? 'Regular' : ev.classification === 'irregular' ? 'Irregular because' : 'Status not yet determined'}</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {ev.classificationReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">History</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ink-3">None</p>
            ) : (
              <ol className="mt-3 space-y-3 border-l border-line-strong pl-4">
                {history.map((h) => (
                  <li key={h.id} className="text-sm">
                    <div>{h.action}</div>
                    <div className="text-xs text-ink-3">
                      {h.actor}, {formatDateTime(h.at)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </details>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={shown ? <span className="code text-lg">{ev.subjects[shown]?.subject.code}</span> : ''}
        subtitle={shown ? ev.subjects[shown]?.subject.title : ''}
      >
        {shown && <SubjectDetail ev={ev} subjectId={shown} onSelect={setSelected} />}
      </Sheet>

      <ScanGrades
        open={scanning}
        onClose={() => {
          setScanning(false)
          if (params.has('scan')) setParams({}, { replace: true })
        }}
        student={student}
      />
      <Modal
        open={reopening}
        onClose={() => setReopening(false)}
        title={<h2 className="text-lg font-semibold">Reopen decision</h2>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setReopening(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!reason.trim()}
              onClick={() => {
                dispatch({ type: 'reopen', studentId: id, reason })
                setReason('')
                setReopening(false)
              }}
            >
              Reopen
            </button>
          </>
        }
      >
        <label className="block">
          <span className="field-label">Reason</span>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus placeholder="e.g. Wrong subject approved" />
        </label>
        <p className="mt-2 text-xs text-ink-3">The student’s printed form is no longer valid. The reason is kept in the activity log.</p>
      </Modal>
    </Page>
  )
}

/* ---------------- Proposed / decided load ---------------- */

function LoadPanel({
  ev,
  rec,
  ids,
  editable,
  fresh,
  onRemove,
  onRestore,
  onSelect,
  onRemarks,
  onConfirm,
}: {
  ev: Evaluation
  rec: AdvisingRecord | undefined
  ids: string[]
  editable: boolean
  fresh: boolean
  onRemove: (id: string) => void
  onRestore: (id: string) => void
  onSelect: (id: string) => void
  onRemarks: (r: string) => void
  onConfirm: () => void
}) {
  const decided = rec?.decision
  const issues = editable ? validateLoad(ev, ids, rec) : []
  const removed = (rec?.removed ?? []).filter((id) => isProposed(ev, id) && !ids.includes(id))
  const added = new Set(rec?.added ?? [])
  const basisOf = (id: string) => (ev.load.kind === 'none' ? undefined : ev.load.lines.find((l) => l.subjectId === id)?.basis)
  const title = decided ? (decided.kind === 'approved' ? 'Approved load' : 'Confirmed load') : 'Proposed load'

  return (
    <section className="panel overflow-hidden" aria-labelledby="load-h">
      <header className="flex flex-col gap-1 px-5 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 id="load-h" className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm text-ink-3">{termLabel(CURRENT_TERM)}</p>
        </div>
        <p className="text-sm text-ink-2 sm:pt-1 sm:text-right" aria-live="polite">
          <span className="num font-semibold text-ink">{ids.length}</span> subject{ids.length === 1 ? '' : 's'} · <span className="num font-semibold text-ink">{unitsOf(ids)}</span> units
          {!decided && ev.normalUnits !== undefined && ev.load.kind === 'recommended' && (
            <span className="block text-xs text-ink-3">
              Normal load <span className="num">{ev.normalUnits}</span> units
            </span>
          )}
        </p>
      </header>

      {decided && (
        <div className="flex items-center justify-between gap-6 border-t border-line bg-surface-2 px-5 py-4">
          <div className="min-w-0 text-sm">
            <p className="text-ink-3">
              {decided.kind === 'approved' ? 'Approved' : 'Confirmed'} {formatDate(decided.at)}
            </p>
            {decided.remarks && <p className="mt-1.5 max-w-[52ch] text-[0.9375rem] leading-relaxed">{decided.remarks}</p>}
          </div>
          <Stamp kind={decided.kind} at={decided.at} fresh={fresh} />
        </div>
      )}

      {ids.length === 0 ? (
        <p className="border-t border-line px-5 py-8 text-center text-sm text-ink-2">No subjects. Add eligible subjects from the curriculum.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {ids.map((sid) => {
            const x = ev.subjects[sid]
            // A decided subject that is no longer in the curriculum (e.g. after the prospectus was updated).
            if (!x)
              return (
                <li key={sid} className="flex items-center gap-2 py-2.5 pr-3 pl-5 text-sm text-act">
                  <WarningIcon size={14} aria-hidden className="shrink-0" /> {decidedSubjects(ev, [sid])[0].title}
                </li>
              )
            const basis = basisOf(sid)
            const meta = [
              added.has(sid) ? 'Added' : '',
              basis === 'retake' ? `Retake · previous grade ${x.finalGrade}` : basis && basis !== 'current' && basis !== 'prescribed' ? LOAD_BASIS_LABEL[basis] : '',
            ].filter(Boolean)
            const issue = issues.find((i) => i.subjectId === sid)
            return (
              <li key={sid} className={`grid grid-cols-[minmax(0,1fr)_2rem_2rem] items-center gap-3 py-2.5 pr-3 pl-5 sm:grid-cols-[7rem_minmax(0,1fr)_2.5rem_2rem] ${added.has(sid) ? 'enter' : ''}`}>
                <span className="min-w-0 sm:contents">
                <span className="code block text-ink-2">{x.subject.code}</span>
                <span className="block min-w-0">
                  <button className="block text-left font-medium hover:underline" onClick={() => onSelect(sid)}>
                    {x.subject.title}
                  </button>
                  {(meta.length > 0 || issue) && (
                    <span className={`flex items-center gap-1 text-xs ${issue ? 'text-bad' : 'text-ink-3'}`}>
                      {issue && <WarningIcon size={12} aria-hidden className="shrink-0" />}
                      {issue ? issue.message : meta.join(' · ')}
                    </span>
                  )}
                </span>
                </span>
                <span className="num text-right">{x.subject.units}</span>
                {editable ? (
                  <button className="btn btn-ghost h-8 w-8 p-0 text-ink-3 hover:text-ink" onClick={() => onRemove(sid)} aria-label={`Remove ${x.subject.code} from load`} title="Remove">
                    <XIcon size={15} />
                  </button>
                ) : (
                  <span />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editable && removed.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-line px-5 py-2 text-sm text-ink-2">
          <span className="mr-1 text-xs text-ink-3">Removed</span>
          {removed.map((sid) => (
            <button key={sid} className="btn btn-ghost btn-sm h-7 px-2" onClick={() => onRestore(sid)}>
              <ArrowCounterClockwiseIcon size={13} aria-hidden /> Restore <span className="code">{ev.subjects[sid]?.subject.code ?? '—'}</span>
            </button>
          ))}
        </div>
      )}

      {editable && (
        <>
          {issues.length > 0 && (
            <div className="flex gap-2.5 border-t border-line bg-warn-tint px-5 py-2.5 text-sm" role="alert">
              <WarningIcon size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <div>
                <p className="font-medium">Resolve before confirming</p>
                <ul className="mt-0.5 text-ink-2">
                  {issues.map((i) => (
                    <li key={i.message}>{i.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="border-t border-line px-5 pt-4">
            <label className="field-label" htmlFor="remarks">
              Remarks for the student
            </label>
            <textarea id="remarks" className="input" rows={2} value={rec?.remarks ?? ''} onChange={(e) => onRemarks(e.target.value)} />
          </div>
          <footer className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="text-sm text-ink-2">
              <span className="num font-semibold text-ink">{ids.length}</span> subjects · <span className="num font-semibold text-ink">{unitsOf(ids)}</span> units
            </span>
            <button className="btn btn-primary" onClick={onConfirm} disabled={issues.length > 0}>
              <StampIcon size={18} /> {ev.classification === 'regular' ? 'Confirm load' : 'Approve load'}
            </button>
          </footer>
        </>
      )}
    </section>
  )
}

/* ---------------- Curriculum explorer ---------------- */

const STATE_ICON: Partial<Record<LoadSubjectState, Icon>> = {
  completed: CheckCircleIcon,
  credited: CertificateIcon,
  prerequisite: LockIcon,
  standing: LockIcon,
  notOffered: CalendarXIcon,
  failed: XCircleIcon,
  inc: HourglassMediumIcon,
  notCompleted: MinusCircleIcon,
  recordUpdate: NotePencilIcon,
  deanReview: StampIcon,
}

function CurriculumExplorer({
  ev,
  rec,
  load,
  editable,
  onAdd,
  onAllow,
  onSelect,
}: {
  ev: Evaluation
  rec: AdvisingRecord | undefined
  load: string[]
  editable: boolean
  onAdd: (id: string) => void
  onAllow: (id: string, reason: string) => void
  onSelect: (id: string) => void
}) {
  const years = [...new Set(ev.curriculum.subjects.map((s) => s.year))].sort() as YearLevel[]
  const [year, setYear] = useState<YearLevel>(ev.student.yearStanding && years.includes(ev.student.yearStanding) ? ev.student.yearStanding : years[0])
  const [query, setQuery] = useState('')
  const views = useMemo(() => loadSubjectView(ev, new Set(load), new Set(rec?.removed ?? []), rec), [ev, load, rec])
  const [allowing, setAllowing] = useState<LoadSubjectView | null>(null)
  const [reason, setReason] = useState('')

  const q = query.trim().toLowerCase()
  const subjects = ev.curriculum.subjects.filter((s) => (q ? s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) : s.year === year))
  const groups = groupByTerm(subjects)
  const addableIn = (y: YearLevel) => Object.values(views).filter((v) => v.addable && v.subject.year === y).length

  return (
    <section className="min-w-0" aria-labelledby="cur-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="cur-h" className="text-lg font-semibold">
          Curriculum
        </h2>
        <span className="text-sm text-ink-3">
          {ev.curriculum.program} · {ev.curriculum.version}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented<string>
          label="Curriculum year"
          value={String(year)}
          panelId="cur-panel"
          onChange={(v) => {
            setYear(Number(v) as YearLevel)
            setQuery('')
          }}
          options={years.map((y) => {
            const n = editable ? addableIn(y) : 0
            return { value: String(y), label: `${YEAR_LABEL[y].replace(' Year', '')}${n ? ` · ${n}` : ''}` }
          })}
        />
        <label className="relative block flex-1">
          <span className="sr-only">Search this curriculum</span>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input type="search" className="input h-9 pl-9 text-sm" placeholder="Search code or title" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <div id="cur-panel" role="tabpanel" aria-labelledby={`tab-${year}`} className="mt-4 space-y-6">
        {groups.length === 0 && <p className="border-y border-line py-10 text-center text-sm text-ink-2">No subjects match “{query.trim()}”.</p>}
        {groups.map((y) =>
          y.semesters.map((g) => (
            <div key={`${y.year}-${g.semester}`}>
              <h3 className="flex items-baseline gap-2 border-b border-line-strong pb-1.5 text-sm">
                {q && <span className="font-semibold text-ink-2">{YEAR_LABEL[y.year]}</span>}
                <span className={q ? 'text-ink-3' : 'font-semibold text-ink-2'}>{SEM_LABEL[g.semester]}</span>
              </h3>
              <ul className="mt-1 space-y-0.5">
                {g.subjects.map((s) => (
                  <ExplorerRow key={s.id} v={views[s.id]} editable={editable} onAdd={() => onAdd(s.id)} onAllow={() => (setReason(''), setAllowing(views[s.id]))} onSelect={() => onSelect(s.id)} />
                ))}
              </ul>
            </div>
          )),
        )}
      </div>
      <Modal
        open={!!allowing}
        onClose={() => setAllowing(null)}
        title={<h2 className="text-lg font-semibold">Allow {allowing?.subject.code}</h2>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAllowing(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!reason.trim()}
              onClick={() => {
                if (allowing) onAllow(allowing.subject.id, reason)
                setAllowing(null)
              }}
            >
              Allow and add to load
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          <span className="font-medium text-ink">{allowing?.subject.title}</span> · {allowing?.reason}
        </p>
        <label className="mt-4 block">
          <span className="field-label">Reason (kept in the activity log)</span>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus placeholder="e.g. Graduating student; taking ITE C103b retake in the same term" />
        </label>
      </Modal>
    </section>
  )
}

function ExplorerRow({ v, editable, onAdd, onAllow, onSelect }: { v: LoadSubjectView; editable: boolean; onAdd: () => void; onAllow: () => void; onSelect: () => void }) {
  // Prerequisite and year-standing blocks can be overridden by the dean case by case.
  const allowable = editable && (v.state === 'prerequisite' || v.state === 'standing')
  const muted = !v.addable && v.state !== 'selected'
  const I = STATE_ICON[v.state]
  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 sm:grid-cols-[6.5rem_minmax(0,1fr)_2rem_5rem] ${
        v.addable ? 'bg-surface' : ''
      }`}
    >
      <span className="min-w-0 sm:contents">
      <span className={`code block ${muted ? 'text-ink-3' : 'text-ink-2'}`}>{v.subject.code}</span>
      <span className="block min-w-0">
        <button className={`block text-left text-sm hover:underline ${muted ? 'text-ink-3' : v.state === 'selected' ? 'text-ink-2' : 'font-medium text-ink'}`} onClick={onSelect}>
          {v.subject.title}
        </button>
        {v.addable ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
            <StatusTag status="eligible" quiet />
            {v.reason}
          </span>
        ) : v.state === 'selected' && v.reason.startsWith('Allowed') ? (
          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-seal-text">{v.reason}</span>
        ) : (
          v.reason &&
          v.state !== 'selected' && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
              {I && <I size={12} aria-hidden className="shrink-0" />}
              {v.reason}
            </span>
          )
        )}
      </span>
      </span>
      <span className={`num hidden text-right text-sm sm:block ${muted ? 'text-ink-3' : ''}`}>{v.subject.units}</span>
      <span className="flex justify-end">
        {v.state === 'selected' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
            <CheckIcon size={13} weight="bold" aria-hidden /> In load
          </span>
        ) : v.addable && editable ? (
          <button className="btn btn-secondary btn-sm h-7 px-2.5" onClick={onAdd} aria-label={`Add ${v.subject.code} to load`}>
            <PlusIcon size={13} weight="bold" /> Add
          </button>
        ) : v.addable ? (
          <span className="text-xs text-ink-3">Eligible</span>
        ) : allowable ? (
          <button className="btn btn-ghost btn-sm h-7 px-2.5 text-ink-2" onClick={onAllow} aria-label={`Allow ${v.subject.code} despite the block`}>
            <LockOpenIcon size={13} /> Allow
          </button>
        ) : null}
      </span>
    </li>
  )
}

/* ---------------- Supporting pieces ---------------- */

function RecordUpdatePanel({ ev }: { ev: Evaluation }) {
  return (
    <section className="panel flex gap-3 px-5 py-5" aria-label="Record update needed">
      <NotePencilIcon size={20} className="mt-0.5 shrink-0 text-data" aria-hidden />
      <div>
        <h2 className="font-semibold">Set the year standing</h2>
        <p className="mt-0.5 text-sm text-ink-2">Missing: {ev.missingData.join(', ').toLowerCase()}. Status and load not yet determined.</p>
      </div>
    </section>
  )
}

function CaseItem({
  c,
  studentId,
  decisions,
  onSelect,
}: {
  c: SubjectEvaluation
  studentId: string
  decisions: { note: string; at: string }[]
  onSelect: (id: string) => void
}) {
  const { dispatch } = useStore()
  const [note, setNote] = useState('')
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button className="text-left hover:underline" onClick={() => onSelect(c.subject.id)}>
          <span className="code">{c.subject.code}</span> <span className="font-medium">{c.subject.title}</span>
        </button>
        <span className="text-sm text-ink-2">{c.reason}</span>
      </div>
      {decisions.map((d, i) => (
        <div key={i} className="mt-3 text-sm">
          <p>{d.note}</p>
          <p className="text-xs text-ink-3">Recorded {formatDateTime(d.at)}</p>
        </div>
      ))}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!note.trim()) return
          dispatch({ type: 'recordCase', studentId, subjectId: c.subject.id, note: note.trim() })
          setNote('')
        }}
      >
        <label className="sr-only" htmlFor={`case-${c.subject.id}`}>
          Decision for {c.subject.code}
        </label>
        <input id={`case-${c.subject.id}`} className="input flex-1" placeholder="Decision and reasons" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-secondary" type="submit" disabled={!note.trim()}>
          Record decision
        </button>
      </form>
    </li>
  )
}
