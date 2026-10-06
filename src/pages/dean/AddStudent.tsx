import { CheckIcon, CopyIcon, ScanIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/controls'
import { ENTRY_AY_OPTIONS, YEAR_LABEL, curriculumVersionForEntryAY } from '../../domain/term'
import type { Program, YearLevel } from '../../domain/types'
import { liveAvailable } from '../../firebase/app'
import { authMessage, createStudentLogin, tempPassword } from '../../firebase/auth'
import { studentIdForScan, useStore } from '../../store/AppStore'

const STUDENT_NO = /^\d{4}-\d{3,6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AY_CHOICES = [...new Set(['2018–2019', '2019–2020', '2020–2021', ...ENTRY_AY_OPTIONS])]
const blank = { lastName: '', firstName: '', studentNo: '', program: 'BSCS' as Program, entryAY: '', yearStanding: '', email: '' }

/** Dean adds a student, optionally with a login, then goes straight to scanning the grade record. */
export function AddStudent({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan?: () => void }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [f, setF] = useState(blank)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState<{ id: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const live = state.mode === 'live' && liveAvailable

  const existing = STUDENT_NO.test(f.studentNo.trim()) ? state.students.find((s) => s.id === studentIdForScan(state.students, f.studentNo)) : undefined

  const close = () => {
    setF(blank)
    setError('')
    setLogin(null)
    setCopied(false)
    onClose()
  }

  const goScan = (id: string) => {
    close()
    navigate(`/dean/students/${id}?scan=1`)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (existing) return goScan(existing.id)
    if (!f.lastName.trim() || !f.firstName.trim()) return setError('Enter the student’s name.')
    if (!STUDENT_NO.test(f.studentNo.trim())) return setError('Student number must look like 2025-10442.')
    if (!f.entryAY) return setError('Choose the entry year.')
    if (f.email.trim() && !EMAIL.test(f.email.trim())) return setError('Check the email address.')
    const id = studentIdForScan(state.students, f.studentNo)
    const email = f.email.trim()
    dispatch({
      type: 'encodeScan',
      profile: {
        studentNo: f.studentNo.trim(),
        firstName: f.firstName,
        lastName: f.lastName,
        program: f.program,
        entryAY: f.entryAY,
        yearStanding: f.yearStanding ? (Number(f.yearStanding) as YearLevel) : null,
        email: email || undefined,
      },
      rows: [],
    })
    if (!email) return goScan(id)
    setBusy(true)
    try {
      // Demo: a sample password only; no account is created.
      const password = live ? await createStudentLogin(email, id) : tempPassword()
      setLogin({ id, email, password })
    } catch (err) {
      setError(`Student added, but the login was not created: ${authMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const set = (p: Partial<typeof blank>) => (setF({ ...f, ...p }), setError(''))

  if (login)
    return (
      <Modal
        open={open}
        onClose={() => goScan(login.id)}
        title={<h2 className="text-lg font-semibold">Student login created</h2>}
        footer={
          <button className="btn btn-primary" onClick={() => goScan(login.id)}>
            Continue to scan
          </button>
        }
      >
        <p className="text-sm text-ink-2">Give these to the student. The password is shown only once.</p>
        {!live && <p data-demo-only className="mt-1 text-xs text-ink-3">Demo: sample credentials only. No account is created.</p>}
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
        <button
          className="btn btn-secondary btn-sm mt-3"
          onClick={() => {
            void navigator.clipboard?.writeText(`Email: ${login.email}\nPassword: ${login.password}`).then(() => setCopied(true))
          }}
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </Modal>
    )

  return (
    <Modal
      open={open}
      onClose={close}
      title={<h2 className="text-lg font-semibold">Add student</h2>}
      footer={
        <>
          {onScan && (
            <button
              className="btn btn-ghost mr-auto"
              onClick={() => {
                close()
                onScan()
              }}
            >
              <ScanIcon size={18} /> Upload grade record instead
            </button>
          )}
          <button className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" form="add-student" disabled={busy}>
            {busy ? 'Creating login…' : existing ? 'Open and scan' : 'Add and scan grades'}
          </button>
        </>
      }
    >
      <form id="add-student" onSubmit={submit} noValidate className="grid grid-cols-2 gap-3">
        <Field label="Student number" className="col-span-2">
          <input className="input num" placeholder="2025-10442" value={f.studentNo} onChange={(e) => set({ studentNo: e.target.value })} data-autofocus />
        </Field>
        {existing ? (
          <p className="col-span-2 rounded-md bg-mute-tint px-3 py-2 text-sm">
            Already in the system: <span className="font-semibold">{existing.lastName}, {existing.firstName}</span> · {existing.program} {existing.curriculumVersion}
          </p>
        ) : (
          <>
            <Field label="Last name">
              <input className="input" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} />
            </Field>
            <Field label="First name">
              <input className="input" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} />
            </Field>
            <Field label="Program">
              <select className="input" value={f.program} onChange={(e) => set({ program: e.target.value as Program })}>
                <option value="BSCS">BSCS</option>
                <option value="BSIT">BSIT</option>
              </select>
            </Field>
            <Field label="Entry year">
              <select className="input" value={f.entryAY} onChange={(e) => set({ entryAY: e.target.value })}>
                <option value="">Choose</option>
                {AY_CHOICES.map((a) => (
                  <option key={a} value={a}>
                    AY {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year standing">
              <select className="input" value={f.yearStanding} onChange={(e) => set({ yearStanding: e.target.value })}>
                <option value="">Set later</option>
                {([1, 2, 3, 4] as const).map((y) => (
                  <option key={y} value={y}>
                    {YEAR_LABEL[y]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="self-end pb-2 text-xs text-ink-3">{f.entryAY && `Curriculum ${f.program} ${curriculumVersionForEntryAY(f.entryAY)}`}</div>
            <Field label="Student email (for login, optional)" className="col-span-2">
              <input className="input" type="email" autoComplete="off" placeholder="student@email.com" value={f.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </>
        )}
        {error && (
          <p role="alert" className="col-span-2 text-sm text-bad">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}
