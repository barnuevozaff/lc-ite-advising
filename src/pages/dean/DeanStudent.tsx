import { ArchiveIcon, ArrowCounterClockwiseIcon, ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../../components/controls'
import { formatDate } from '../../components/provenance'
import { ClassificationTag, StatusTag } from '../../components/status'
import { Page } from '../../layouts/AppShell'
import { curriculumFor } from '../../data/curricula'
import { PASSING_GRADE, outcomeOf, resultText } from '../../domain/rules'
import { CURRENT_TERM, ENTRY_AY_OPTIONS, YEAR_LABEL, curriculumVersionForEntryAY, shiftAY, termLabel, termOrder } from '../../domain/term'
import type { RecordEntry, RecordResult, Semester, YearLevel } from '../../domain/types'
import { useStore } from '../../store/AppStore'

export function DeanStudent() {
  const { id = '' } = useParams()
  const { state, dispatch, evaluate } = useStore()
  const student = state.students.find((s) => s.id === id)
  if (!student)
    return (
      <Page>
        <p className="text-ink-2">Student record not found.</p>
      </Page>
    )
  const ev = evaluate(id)
  const curriculum = curriculumFor(student.program, student.curriculumVersion)

  const terms = [...new Map(student.records.map((r) => [`${r.term.ay}|${r.term.sem}`, r.term])).values()].sort((a, b) => termOrder(b) - termOrder(a))
  const subj = (sid: string) => curriculum.subjects.find((s) => s.id === sid)

  return (
    <Page wide>
      <Link to={student.archived ? '/dean/students?archived=1' : '/dean/students'} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeftIcon size={14} /> {student.archived ? 'Archive' : 'Students'}
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2rem]">
        {student.firstName} {student.lastName}
      </h1>
      <p className="mt-2 text-[0.9375rem] text-ink-2">
        <span className="num text-[0.875rem]">{student.studentNo}</span> · {student.program} {student.curriculumVersion}
      </p>
      {student.archived ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-mute-tint px-3 py-2 text-sm">
          <span className="flex items-start gap-2">
            <ArchiveIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">Archived {formatDate(student.archived.at)}</span> · {student.archived.reason}
            </span>
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: 'restoreStudent', studentId: student.id })}>
            <ArrowCounterClockwiseIcon size={16} /> Restore
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/dean/students/${student.id}`} className="btn btn-secondary btn-sm">
            Open evaluation
          </Link>
          <ArchiveButton studentId={student.id} name={`${student.firstName} ${student.lastName}`} />
        </div>
      )}


      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          <ProfileEditor studentId={id} />
          <section className="px-1" aria-labelledby="ev-h">
            <h2 id="ev-h" className="flex items-center justify-between text-sm font-semibold">
              Evaluation
              <ClassificationTag value={ev.classification} />
            </h2>
            {ev.missingData.length > 0 && (
              <p className="mt-2 text-sm text-ink-2">
                Missing: <strong className="text-ink">{ev.missingData.join(', ')}</strong>
              </p>
            )}
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {(ev.classification === 'irregular' ? ev.classificationReasons : []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="rec-h">
          <div className="flex items-baseline justify-between">
            <h2 id="rec-h" className="text-lg font-semibold">
              Academic record
            </h2>

          </div>
          <AddRecordForm studentId={id} />
          {terms.length === 0 ? (
            <p className="mt-4 py-8 text-center text-sm text-ink-2">No entries</p>
          ) : (
            <div className="mt-6 space-y-8">
              {terms.map((t) => {
                const entries = student.records.filter((r) => r.term.ay === t.ay && r.term.sem === t.sem)
                return (
                  <div key={`${t.ay}${t.sem}`} className="overflow-x-auto border-t-2 border-ink">
                    <h3 className="border-b border-line-strong px-1 py-2.5 text-sm font-semibold">{termLabel(t)}</h3>
                    <table className="ledger min-w-[560px]">
                      <tbody>
                        {entries.map((e) => (
                          <EntryRow key={e.id} e={e} studentId={id} code={subj(e.subjectId)?.code ?? '?'} title={subj(e.subjectId)?.title ?? 'Subject not in this curriculum'} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}

function ArchiveButton({ studentId, name }: { studentId: string; name: string }) {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => (setReason(''), setOpen(true))}>
        <ArchiveIcon size={16} /> Archive
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={<h2 className="text-lg font-semibold">Archive {name}</h2>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!reason.trim()}
              onClick={() => {
                dispatch({ type: 'archiveStudent', studentId, reason })
                setOpen(false)
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
        <p className="mt-2 text-xs text-ink-3">Nothing is deleted. The student moves to the Archive in Student records and can be restored there.</p>
      </Modal>
    </>
  )
}

function ProfileEditor({ studentId }: { studentId: string }) {
  const { state, dispatch } = useStore()
  const s = state.students.find((x) => x.id === studentId)!
  const [standing, setStanding] = useState<string>(s.yearStanding ? String(s.yearStanding) : '')
  const [entry, setEntry] = useState(s.entryAY)
  const [saved, setSaved] = useState(false)
  const dirty = standing !== (s.yearStanding ? String(s.yearStanding) : '') || entry !== s.entryAY
  const nextVersion = curriculumVersionForEntryAY(entry)

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (entry !== s.entryAY) dispatch({ type: 'setEntryAY', studentId, entryAY: entry })
    const y = standing ? (Number(standing) as YearLevel) : null
    if (y !== s.yearStanding) dispatch({ type: 'setStanding', studentId, year: y })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form className="panel px-4 py-4" onSubmit={save} aria-labelledby="pf-h">
      <h2 id="pf-h" className="font-semibold">
        Academic profile
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Program</dt>
          <dd className="font-medium">{s.program}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Transferee</dt>
          <dd className="font-medium">{s.transferee ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <label className="field-label" htmlFor="entry">
          Entry academic year
        </label>
        <select id="entry" className="input" value={entry} onChange={(e) => setEntry(e.target.value)}>
          {ENTRY_AY_OPTIONS.map((a) => (
            <option key={a} value={a}>
              AY {a}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-ink-3">
          Curriculum <span className="font-medium text-ink-2">{nextVersion}</span>
        </p>
      </div>
      <div className="mt-4">
        <label className="field-label" htmlFor="standing">
          Recorded year standing
        </label>
        <select id="standing" className="input" value={standing} onChange={(e) => setStanding(e.target.value)}>
          <option value="">Not recorded</option>
          {([1, 2, 3, 4] as const).map((y) => (
            <option key={y} value={y}>
              {YEAR_LABEL[y]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-ok" role="status">
            <CheckIcon size={14} /> Saved
          </span>
        )}
        <button className="btn btn-primary" type="submit" disabled={!dirty}>
          Save
        </button>
      </div>
    </form>
  )
}

function EntryRow({ e, studentId, code, title }: { e: RecordEntry; studentId: string; code: string; title: string }) {
  const { dispatch } = useStore()
  const [grade, setGrade] = useState('')
  const r = e.result
  const o = outcomeOf(e)
  const statusMap = { passed: 'passed', failed: 'failed', pending: 'pending', notCompletedReview: 'notCompletedReview', notCompleted: 'notCompleted', credited: 'credited', creditPending: 'deanReview' } as const
  const valid = grade !== '' && Number(grade) >= 0 && Number(grade) <= 100
  return (
    <tr>
      <td className="code w-28 pl-1">{code}</td>
      <td className="min-w-[12rem]">{title}</td>
      <td className="num w-20">{resultText(e)}</td>
      <td className="w-1 whitespace-nowrap">
        <StatusTag status={statusMap[o]} quiet={statusMap[o] === 'passed'} />
      </td>
      <td className="w-1 pr-1 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {r.kind === 'INC' && r.completedGrade === undefined && (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(ev) => {
                ev.preventDefault()
                if (valid) dispatch({ type: 'updateRecord', studentId, entryId: e.id, result: { kind: 'INC', completedGrade: Number(grade) } })
              }}
            >
              <label className="sr-only" htmlFor={`g-${e.id}`}>
                Final grade for {code}
              </label>
              <input id={`g-${e.id}`} className="input num h-8 w-20 text-sm" inputMode="numeric" placeholder="Grade" value={grade} onChange={(x) => setGrade(x.target.value.replace(/[^0-9.]/g, ''))} />
              <button className="btn btn-secondary btn-sm" disabled={!valid}>
                Complete INC
              </button>
            </form>
          )}
          {r.kind === 'Credited' && !r.validated && (
            <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: 'updateRecord', studentId, entryId: e.id, result: { ...r, validated: true } })}>
              Record validation
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm w-8 p-0"
            aria-label={`Remove ${code} entry`}
            title="Remove entry"
            onClick={() => {
              if (confirm(`Remove the ${code} entry from this record?`)) dispatch({ type: 'removeRecord', studentId, entryId: e.id })
            }}
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddRecordForm({ studentId }: { studentId: string }) {
  const { state, dispatch } = useStore()
  const s = state.students.find((x) => x.id === studentId)!
  const curriculum = curriculumFor(s.program, s.curriculumVersion)
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(curriculum.subjects[0].id)
  const ayOptions = Array.from({ length: 5 }, (_, i) => shiftAY(s.entryAY, i)).filter((a) => parseInt(a) <= parseInt(CURRENT_TERM.ay))
  const [ay, setAy] = useState(ayOptions.at(-1) ?? s.entryAY)
  const [sem, setSem] = useState<'1' | '2' | 'Summer'>('1')
  const [kind, setKind] = useState<RecordResult['kind']>('grade')
  const [grade, setGrade] = useState('')
  const [note, setNote] = useState('')
  const [validated, setValidated] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let result: RecordResult
    if (kind === 'grade') {
      const g = Number(grade)
      if (grade === '' || isNaN(g) || g < 0 || g > 100) return setError('Enter a numerical percentage grade from 0 to 100.')
      result = { kind: 'grade', value: g }
    } else if (kind === 'Credited') {
      if (!note.trim()) return setError('Enter the source of the credit.')
      result = { kind: 'Credited', validated, note: note.trim() }
    } else result = { kind } as RecordResult
    dispatch({ type: 'addRecord', studentId, entry: { subjectId, term: { ay, sem: sem === 'Summer' ? 'Summer' : (Number(sem) as Semester) }, result } })
    setGrade('')
    setNote('')
    setError('')
    setOpen(false)
  }

  if (!open)
    return (
      <button className="btn btn-secondary mt-4" onClick={() => setOpen(true)}>
        <PlusIcon size={16} /> Add entry
      </button>
    )

  return (
    <form onSubmit={submit} className="panel mt-4 px-4 py-4" aria-label="Encode record entry">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="ns">
            Subject
          </label>
          <select id="ns" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {curriculum.subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code}: {x.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="nay">
            Academic year
          </label>
          <select id="nay" className="input" value={ay} onChange={(e) => setAy(e.target.value)}>
            {ayOptions.map((a) => (
              <option key={a} value={a}>
                AY {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="nsem">
            Term
          </label>
          <select id="nsem" className="input" value={sem} onChange={(e) => setSem(e.target.value as '1' | '2' | 'Summer')}>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
            <option value="Summer">Summer</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="nk">
            Result
          </label>
          <select id="nk" className="input" value={kind} onChange={(e) => setKind(e.target.value as RecordResult['kind'])}>
            <option value="grade">Final grade</option>
            <option value="INC">INC</option>
            <option value="UW">UW</option>
            <option value="Dropped">DRP</option>
          </select>
        </div>
        {kind === 'grade' && (
          <div>
            <label className="field-label" htmlFor="ng">
              Grade (%)
            </label>
            <input id="ng" className="input num" inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} aria-describedby="ng-h" />
            <p id="ng-h" className="mt-1.5 text-xs text-ink-3">
              Passing: {PASSING_GRADE}
            </p>
          </div>
        )}
        {kind === 'Credited' && (
          <>
            <div>
              <label className="field-label" htmlFor="nn">
                Source of credit
              </label>
              <input id="nn" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={validated} onChange={(e) => setValidated(e.target.checked)} className="h-4 w-4 accent-[var(--seal)]" />
              Validated
            </label>
          </>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => (setOpen(false), setError(''))}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Add entry
        </button>
      </div>
    </form>
  )
}
