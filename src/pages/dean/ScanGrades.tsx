import { CameraIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, PlusIcon, TrashIcon, UserCheckIcon, WarningIcon } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../../components/controls'
import { curriculumFor } from '../../data/curricula'
import { earliestAY, parseGradeReport, parseReportHeader, parseTermKey, readGradeInput, termKey, termOptions } from '../../domain/gradeReport'
import { resultText } from '../../domain/rules'
import { CURRENT_TERM, ENTRY_AY_OPTIONS, YEAR_LABEL, curriculumVersionForEntryAY } from '../../domain/term'
import type { Curriculum, Program, RecordResult, Student, TermRef, YearLevel } from '../../domain/types'
import { OcrCancelled, recognise } from '../../scan/ocr'
import { liveAvailable } from '../../firebase/app'
import { authMessage, createStudentLogin, tempPassword } from '../../firebase/auth'
import { studentIdForScan, useStore, type ScanProfile } from '../../store/AppStore'

interface EditRow {
  key: string
  subjectId: string
  term: string
  grade: string
  issues: string[]
}

type Phase = { kind: 'pick'; error?: string } | { kind: 'reading'; page: number; pages: number; progress: number } | { kind: 'review' }

interface Profile {
  lastName: string
  firstName: string
  studentNo: string
  program: Program
  entryAY: string
  yearStanding: string
  email: string
}

let nextKey = 0
const blankRow = (term = ''): EditRow => ({ key: `n${++nextKey}`, subjectId: '', term, grade: '', issues: [] })
const STUDENT_NO = /^\d{4}-\d{3,6}$/

function gradeText(r: { kind: string; value?: number }): string {
  return r.kind === 'grade' ? String(r.value) : r.kind === 'Dropped' ? 'DRP' : r.kind
}

function toRows(text: string, cur: Curriculum): { rows: EditRow[]; unmatched: string[] } {
  const parsed = parseGradeReport(text, cur)
  return {
    rows: parsed.rows.map((r) => ({ key: r.key, subjectId: r.subjectId, term: r.term ? termKey(r.term) : '', grade: r.result ? gradeText(r.result) : '', issues: r.issues })),
    unmatched: parsed.unmatched.map((u) => u.raw),
  }
}

const AY_CHOICES = [...new Set(['2018–2019', '2019–2020', '2020–2021', ...ENTRY_AY_OPTIONS])]

/**
 * Dean scans a student's printed Report of Grades, reviews what was read, then saves.
 * Without `student`, the record is created (or found by student number) from the scan.
 * The photo is never stored.
 */
export function ScanGrades({ open, onClose, student }: { open: boolean; onClose: () => void; student?: Student }) {
  const { state, dispatch, evaluate } = useStore()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const [photos, setPhotos] = useState<string[]>([])
  const [zoom, setZoom] = useState(false)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<EditRow[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile>({ lastName: '', firstName: '', studentNo: '', program: 'BSCS', entryAY: '', yearStanding: '', email: '' })
  const [parsedFor, setParsedFor] = useState('')
  const abort = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState<{ id: string; email: string; password: string } | null>(null)
  const [loginError, setLoginError] = useState('')
  const live = state.mode === 'live' && liveAvailable
  const inputId = useId()

  // Stop OCR and release photos if the page unmounts mid-scan.
  const photoRef = useRef(photos)
  useEffect(() => {
    photoRef.current = photos
  }, [photos])
  useEffect(
    () => () => {
      abort.current?.abort()
      photoRef.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  const findByNo = (no: string) => (STUDENT_NO.test(no.trim()) ? state.students.find((s) => s.id === studentIdForScan(state.students, no)) : undefined)

  // Which student and curriculum the scan belongs to.
  const existing = student ?? findByNo(profile.studentNo)
  const curriculumOf = (p: Profile, ex: Student | undefined): Curriculum | null =>
    ex ? evaluate(ex.id).curriculum : p.entryAY ? curriculumFor(p.program, curriculumVersionForEntryAY(p.entryAY)) : null
  const curriculum = curriculumOf(profile, existing)
  const entryAY = existing?.entryAY ?? profile.entryAY
  const terms = entryAY ? termOptions(entryAY, CURRENT_TERM) : []

  const close = () => {
    abort.current?.abort()
    photos.forEach((u) => URL.revokeObjectURL(u))
    setPhotos([])
    setPhase({ kind: 'pick' })
    setRows([])
    setUnmatched([])
    setText('')
    setZoom(false)
    onClose()
  }

  /** Re-reads the rows when the curriculum changes (new program, entry year or matched student). */
  const changeProfile = (p: Partial<Profile>) => {
    const next = { ...profile, ...p }
    setProfile(next)
    const cur = curriculumOf(next, student ?? findByNo(next.studentNo))
    if (text && cur && cur.id !== parsedFor) {
      const r = toRows(text, cur)
      setRows(r.rows)
      setUnmatched(r.unmatched)
      setParsedFor(cur.id)
    }
  }

  const read = async (files: File[]) => {
    if (!files.length) return
    setPhotos((p) => (p.forEach((u) => URL.revokeObjectURL(u)), files.map((f) => URL.createObjectURL(f))))
    const ctl = new AbortController()
    abort.current = ctl
    try {
      const texts: string[] = []
      for (let i = 0; i < files.length; i++) {
        setPhase({ kind: 'reading', page: i + 1, pages: files.length, progress: 0 })
        texts.push(await recognise(files[i], (p) => setPhase({ kind: 'reading', page: i + 1, pages: files.length, progress: p }), ctl.signal))
      }
      const all = texts.join('\n')
      const h = parseReportHeader(all)
      const match = student ?? (h.studentNo ? findByNo(h.studentNo) : undefined)
      const program = match?.program ?? h.program ?? 'BSCS'
      // First guess of the curriculum from the header, then the entry year from the earliest term read.
      const guess = match ? evaluate(match.id).curriculum : curriculumFor(program, h.curriculumVersion ?? '2025–2026')
      const first = parseGradeReport(all, guess)
      const ay = match?.entryAY ?? earliestAY(first.rows.map((r) => r.term)) ?? (h.curriculumVersion === '2025–2026' ? '2025–2026' : '')
      const p: Profile = {
        lastName: match?.lastName ?? h.lastName ?? '',
        firstName: match?.firstName ?? h.firstName ?? '',
        studentNo: match?.studentNo ?? h.studentNo ?? '',
        program,
        entryAY: ay,
        yearStanding: '',
        email: '',
      }
      const cur = curriculumOf(p, match) ?? guess
      const r = toRows(all, cur)
      setText(all)
      setProfile(p)
      setRows(r.rows)
      setUnmatched(r.unmatched)
      setParsedFor(cur.id)
      setPhase({ kind: 'review' })
    } catch (e) {
      if (e instanceof OcrCancelled) setPhase({ kind: 'pick' })
      else setPhase({ kind: 'pick', error: 'Couldn’t read the image. Try a clearer photo, or enter the grades manually.' })
    }
  }

  const manual = () => {
    const s = student
    setProfile(
      s
        ? { lastName: s.lastName, firstName: s.firstName, studentNo: s.studentNo, program: s.program, entryAY: s.entryAY, yearStanding: '', email: '' }
        : { lastName: '', firstName: '', studentNo: '', program: 'BSCS', entryAY: '', yearStanding: '', email: '' },
    )
    setText('')
    setRows([blankRow()])
    setUnmatched([])
    setPhase({ kind: 'review' })
  }

  const patch = (key: string, p: Partial<EditRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p, issues: [] } : r)))

  const valid = rows.map((r) => {
    const term = parseTermKey(r.term)
    const result = readGradeInput(r.grade)
    return r.subjectId && term && result ? { subjectId: r.subjectId, term, result } : null
  })
  const profileIssue = existing
    ? null
    : !profile.lastName.trim() || !profile.firstName.trim()
      ? 'Enter the student’s name'
      : !STUDENT_NO.test(profile.studentNo.trim())
        ? 'Student number must look like 2025-10442'
        : !profile.entryAY
          ? 'Choose the entry year'
          : profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
            ? 'Check the student email'
            : null
  const ready = !profileIssue && rows.length > 0 && valid.every(Boolean)

  const recorded = (subjectId: string, term: TermRef | null) =>
    term && existing ? existing.records.find((e) => e.subjectId === subjectId && e.term.ay === term.ay && e.term.sem === term.sem) : undefined

  const save = async () => {
    if (!ready || busy) return
    const saved = valid as { subjectId: string; term: TermRef; result: RecordResult }[]
    const p: ScanProfile = {
      studentNo: existing?.studentNo ?? profile.studentNo.trim(),
      firstName: profile.firstName,
      lastName: profile.lastName,
      program: existing?.program ?? profile.program,
      entryAY: existing?.entryAY ?? profile.entryAY,
      yearStanding: profile.yearStanding ? (Number(profile.yearStanding) as YearLevel) : null,
    }
    const id = existing?.id ?? studentIdForScan(state.students, p.studentNo)
    const email = !existing ? profile.email.trim() : ''
    dispatch({ type: 'encodeScan', profile: { ...p, email: email || undefined }, rows: saved })
    if (email) {
      // New student scanned with an email: create the login and show it once before moving on.
      setBusy(true)
      try {
        // Demo: a sample password only; no account is created.
        setLogin({ id, email, password: live ? await createStudentLogin(email, id) : tempPassword() })
      } catch (err) {
        setLoginError(`Grades saved, but the login was not created: ${authMessage(err)}`)
        setLogin({ id, email, password: '' })
      } finally {
        setBusy(false)
      }
      return
    }
    close()
    if (!student) navigate(`/dean/students/${id}`)
  }

  const finish = () => {
    const id = login?.id
    setLogin(null)
    setLoginError('')
    close()
    if (id) navigate(`/dean/students/${id}`)
  }

  const toCheck = rows.filter((r) => r.issues.length).length

  if (login)
    return (
      <Modal
        open={open}
        onClose={finish}
        title={<h2 className="text-lg font-semibold">{login.password ? 'Student login created' : 'Grades saved'}</h2>}
        footer={
          <button className="btn btn-primary" onClick={finish}>
            Continue to evaluation
          </button>
        }
      >
        {login.password ? (
          <>
            <p className="text-sm text-ink-2">Give these to the student. The password is shown only once.</p>
            {!live && <p className="mt-1 text-xs text-ink-3">Demo: sample credentials only. No account is created.</p>}
            <dl className="mt-4 space-y-3 rounded-lg bg-sunken p-4">
              <div>
                <dt className="text-xs text-ink-3">Email</dt>
                <dd className="font-medium">{login.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Temporary password</dt>
                <dd className="num text-lg font-semibold tracking-wide">{login.password}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p role="alert" className="text-sm text-bad">
            {loginError}
          </p>
        )}
      </Modal>
    )

  return (
    <Modal
      open={open}
      onClose={close}
      xl
      title={
        <div>
          <h2 className="text-lg font-semibold">Scan grade record</h2>
          {student && (
            <p className="text-sm text-ink-2">
              {student.lastName}, {student.firstName} · {student.program} {student.curriculumVersion}
            </p>
          )}
        </div>
      }
      footer={
        phase.kind === 'review' ? (
          <>
            <span className="mr-auto self-center text-sm text-ink-2">
              {profileIssue ? (
                <span className="font-medium text-act">{profileIssue}</span>
              ) : (
                <>
                  <span className="num">{rows.length}</span> subject{rows.length === 1 ? '' : 's'}
                  {toCheck > 0 && (
                    <>
                      {' · '}
                      <span className="font-medium text-act">
                        <span className="num">{toCheck}</span> to check
                      </span>
                    </>
                  )}
                </>
              )}
            </span>
            <button className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={!ready || busy} onClick={() => void save()}>
              {busy ? 'Creating login…' : student ? 'Save grades' : 'Save and evaluate'}
            </button>
          </>
        ) : undefined
      }
    >
      {phase.kind === 'pick' && (
        <div className="flex flex-col items-center px-5 py-12 text-center">
          <CameraIcon size={36} className="text-ink-3" aria-hidden />
          <label htmlFor={inputId} className="btn btn-primary mt-5 cursor-pointer">
            Take photo or choose file
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void read(files)
            }}
          />
          <p className="mt-3 text-sm text-ink-2">Printed Report of Grades from the Registrar. One photo per page.</p>
          {phase.error && (
            <p role="alert" className="mt-5 inline-flex items-center gap-2 rounded-md bg-act-tint px-3 py-2 text-sm text-act">
              <WarningIcon size={16} aria-hidden /> {phase.error}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <button className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline" onClick={manual}>
              Enter manually
            </button>
            <Link to={`/dean/sample-report/${student?.id ?? 'new'}`} target="_blank" className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Sample report
            </Link>
          </div>
        </div>
      )}

      {phase.kind === 'reading' && (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center px-5 py-16 text-center">
          <p className="font-medium">Reading{phase.pages > 1 ? ` page ${phase.page} of ${phase.pages}` : ''}</p>
          <div
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            aria-label="Reading the grade record"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(phase.progress * 100)}
          >
            <div className="h-full rounded-full bg-ink transition-[width] duration-200 ease-out" style={{ width: `${Math.max(4, phase.progress * 100)}%` }} />
          </div>
          <button className="btn btn-ghost mt-6" onClick={() => abort.current?.abort()}>
            Cancel
          </button>
        </div>
      )}

      {phase.kind === 'review' && (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 overflow-y-auto px-5 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:content-stretch lg:overflow-hidden">
          {photos.length > 0 && (
            <div className="relative h-[38dvh] shrink-0 overflow-y-auto rounded-lg lg:h-auto lg:min-h-0">
              <button className="btn btn-secondary btn-sm sticky top-2 float-right z-10 mt-2 mr-2" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Fit photo' : 'Zoom photo'}>
                {zoom ? <MagnifyingGlassMinusIcon size={16} /> : <MagnifyingGlassPlusIcon size={16} />}
              </button>
              <div className={`space-y-2 rounded-lg bg-sunken p-2 ${zoom ? 'overflow-x-auto' : ''}`}>
                {photos.map((u, i) => (
                  <img key={u} src={u} alt={`Grade record, page ${i + 1}`} className={zoom ? 'w-[200%] max-w-none' : 'w-full'} />
                ))}
              </div>
            </div>
          )}

          <div className={`lg:min-h-0 lg:overflow-y-auto ${photos.length ? '' : 'lg:col-span-2'}`}>
            <section aria-label="Student" className="mb-5">
              {existing && !student && (
                <p className="mb-3 flex items-center gap-2 rounded-md bg-mute-tint px-3 py-2 text-sm">
                  <UserCheckIcon size={16} aria-hidden />
                  <span>
                    Existing record:{' '}
                    <span className="font-semibold">
                      {existing.lastName}, {existing.firstName}
                    </span>{' '}
                    · {existing.program} {existing.curriculumVersion}
                  </span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                {!student && (
                  <>
                    <Field label="Last name" className="sm:col-span-2">
                      <input className="input h-9 text-sm" value={existing?.lastName ?? profile.lastName} disabled={!!existing} onChange={(e) => changeProfile({ lastName: e.target.value })} />
                    </Field>
                    <Field label="First name" className="sm:col-span-2">
                      <input className="input h-9 text-sm" value={existing?.firstName ?? profile.firstName} disabled={!!existing} onChange={(e) => changeProfile({ firstName: e.target.value })} />
                    </Field>
                    <Field label="Student number" className="col-span-2 sm:col-span-2">
                      <input className="input num h-9 text-sm" placeholder="2025-10442" value={profile.studentNo} onChange={(e) => changeProfile({ studentNo: e.target.value })} />
                    </Field>
                    <Field label="Program" className="sm:col-span-2">
                      <select className="input h-9 text-sm" value={existing?.program ?? profile.program} disabled={!!existing} onChange={(e) => changeProfile({ program: e.target.value as Program })}>
                        <option value="BSCS">BSCS</option>
                        <option value="BSIT">BSIT</option>
                      </select>
                    </Field>
                    <Field label="Entry year" className="sm:col-span-2">
                      <select className="input h-9 text-sm" value={existing?.entryAY ?? profile.entryAY} disabled={!!existing} onChange={(e) => changeProfile({ entryAY: e.target.value })}>
                        <option value="">Choose</option>
                        {AY_CHOICES.map((a) => (
                          <option key={a} value={a}>
                            AY {a}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
                {!existing && (
                  <Field label="Student email (for login, optional)" className="col-span-2 sm:col-span-4">
                    <input
                      className="input h-9 text-sm"
                      type="email"
                      autoComplete="off"
                      placeholder="student@email.com"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </Field>
                )}
                <Field label="Year standing" className={student ? 'col-span-2 sm:col-span-3' : 'sm:col-span-2'}>
                  <select className="input h-9 text-sm" value={profile.yearStanding} onChange={(e) => setProfile({ ...profile, yearStanding: e.target.value })}>
                    <option value="">{existing?.yearStanding ? `Keep ${YEAR_LABEL[existing.yearStanding]}` : 'Set later'}</option>
                    {([1, 2, 3, 4] as const).map((y) => (
                      <option key={y} value={y}>
                        {YEAR_LABEL[y]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {!existing && curriculum && (
                <p className="mt-2 text-xs text-ink-3">
                  Curriculum {curriculum.program} {curriculum.version}
                </p>
              )}
            </section>

            <h3 className="mb-2 text-sm font-semibold">Grades</h3>
            {rows.length === 0 && <p className="border-y border-line py-6 text-center text-sm text-ink-2">No subjects recognised</p>}
            <ul className="divide-y divide-line border-y border-line">
              {rows.map((r, i) => {
                const term = parseTermKey(r.term)
                const old = r.subjectId ? recorded(r.subjectId, term) : undefined
                const gradeOk = !r.grade || readGradeInput(r.grade)
                const flagged = r.issues.length > 0
                return (
                  <li key={r.key} className={`grid grid-cols-[minmax(0,1fr)_88px_36px] gap-2 px-2 py-2.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_88px_36px] ${flagged ? 'bg-act-tint' : ''}`}>
                    <select className="input h-9 text-sm" aria-label={`Subject, row ${i + 1}`} value={r.subjectId} onChange={(e) => patch(r.key, { subjectId: e.target.value })}>
                      <option value="">Subject</option>
                      {(curriculum?.subjects ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code}: {s.title}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input col-span-3 row-start-2 h-9 text-sm sm:col-span-1 sm:row-start-auto"
                      aria-label={`Term, row ${i + 1}`}
                      value={r.term}
                      onChange={(e) => patch(r.key, { term: e.target.value })}
                    >
                      <option value="">Term</option>
                      {terms.map((t) => (
                        <option key={termKey(t)} value={termKey(t)}>
                          {t.sem === 'Summer' ? 'Summer' : t.sem === 1 ? '1st Sem' : '2nd Sem'} {t.ay}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`input num h-9 text-sm ${gradeOk ? '' : 'border-act'}`}
                      aria-label={`Grade, row ${i + 1}`}
                      aria-invalid={!gradeOk || undefined}
                      placeholder="Grade"
                      value={r.grade}
                      onChange={(e) => patch(r.key, { grade: e.target.value })}
                    />
                    <button className="btn btn-ghost h-9 w-9 p-0" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      <TrashIcon size={16} />
                    </button>
                    {(flagged || old || !gradeOk) && (
                      <p className="col-span-full text-xs">
                        {flagged && <span className="font-medium text-act">{r.issues.join(' · ')}</span>}
                        {!gradeOk && <span className="font-medium text-act">{flagged ? ' · ' : ''}Grade must be 50–100, INC, UW or DRP</span>}
                        {old && (
                          <span className="text-ink-3">
                            {flagged || !gradeOk ? ' · ' : ''}
                            {r.grade.trim().toUpperCase() === gradeText(old.result.kind === 'INC' ? { kind: 'INC' } : old.result) ? 'Already on record' : `Replaces ${resultText(old)}`}
                          </span>
                        )}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
            <button className="btn btn-ghost btn-sm mt-2" disabled={!curriculum} onClick={() => setRows((rs) => [...rs, blankRow(rs.at(-1)?.term ?? '')])}>
              <PlusIcon size={16} /> Add row
            </button>
            {unmatched.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-ink-2 hover:text-ink">
                  Not recognised <span className="num">({unmatched.length})</span>
                </summary>
                <ul className="mt-2 space-y-1 border-l border-line-strong pl-3 font-mono text-xs text-ink-2">
                  {unmatched.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-3">{label}</span>
      {children}
    </label>
  )
}
