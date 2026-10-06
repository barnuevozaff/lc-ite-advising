import { CaretDownIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveAvailable } from '../firebase/app'
import { authMessage, resetPassword, signInLive } from '../firebase/auth'
import { useStore, type Session } from '../store/AppStore'

interface DemoAccount {
  email: string
  session: Session
  label: string
}

/** Demo accounts: synthetic data kept in this browser only. Works offline. */
const ACCOUNTS: DemoAccount[] = [
  { email: 'bmalabanan@student.lc.test', session: { role: 'student', studentId: 's-bea', name: 'Bea Malabanan' }, label: 'Student · Regular' },
  { email: 'jdimaculangan@student.lc.test', session: { role: 'student', studentId: 's-jerome', name: 'Jerome Dimaculangan' }, label: 'Student · Irregular' },
  { email: 'pesguerra@student.lc.test', session: { role: 'student', studentId: 's-paolo', name: 'Paolo Esguerra' }, label: 'Student · Transferee' },
  { email: 'dlacsamana@student.lc.test', session: { role: 'student', studentId: 's-dominic', name: 'Dominic Lacsamana' }, label: 'Student · Irregular' },
  { email: 'dean.ite@lc.test', session: { role: 'dean', name: 'Dean, ITE Department' }, label: 'Dean' },
]

const HOME = { student: '/student', dean: '/dean' } as const

export function SignIn() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const enter = (a: DemoAccount) => {
    dispatch({ type: 'setMode', mode: 'demo' })
    dispatch({ type: 'signIn', session: a.session })
    navigate(HOME[a.session.role])
  }

  // Live sign-in: the session listener (LiveSession) switches the store to live mode.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!liveAvailable) {
      const a = ACCOUNTS.find((x) => x.email === email.trim().toLowerCase())
      if (!a || !password) return setError('Wrong email or password.')
      return enter(a)
    }
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    try {
      await signInLive(email, password)
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <section className="panel w-full max-w-[420px] px-6 py-9 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(22_36_79/0.18)] sm:px-9" aria-labelledby="signin-h">
        <header className="text-center">
          <img src="/favicon.png" alt="Laguna College seal" width={76} height={76} className="mx-auto h-[76px] w-[76px]" />
          <p className="mt-4 text-[0.8125rem] font-semibold tracking-[0.16em] text-ink-2">LAGUNA COLLEGE</p>
          <p className="mt-0.5 text-xs text-ink-3">ITE Department · San Pablo City</p>
          <h1 id="signin-h" className="mt-5 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
            Academic Advising
          </h1>
          <p className="mt-1 text-sm text-ink-2">Sign in to continue</p>
        </header>

          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => (setEmail(e.target.value), setError(''))} />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                {liveAvailable && (
                  <button
                    type="button"
                    className="text-xs font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                    onClick={async () => {
                      setError('')
                      setNote('')
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter your email first, then tap Forgot password.')
                      try {
                        await resetPassword(email)
                      } catch (err) {
                        // Only connection problems are shown; whether the account exists is not revealed.
                        if (authMessage(err).startsWith('No connection')) return setError(authMessage(err))
                      }
                      setNote('If an account uses this email, a reset link has been sent. Check your inbox and spam folder.')
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => (setPassword(e.target.value), setError(''))} />
            </div>
            {error && (
              <p className="text-sm text-bad" role="alert">
                {error}
              </p>
            )}
            {note && (
              <p className="text-sm text-ink-2" role="status">
                {note}
              </p>
            )}
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {liveAvailable && <p className="mt-4 text-center text-sm text-ink-2">No account yet? The dean creates it when you are evaluated.</p>}

          {/* Demo accounts exist only when Firebase is not configured. */}
          {!liveAvailable && (
          <details data-demo-only className="group mt-8">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-ink-3 hover:text-ink-2 [&::-webkit-details-marker]:hidden">
              Demo accounts
              <CaretDownIcon size={14} className="transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="mt-2 space-y-0.5">
              {ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left text-sm hover:text-seal-text" onClick={() => enter(a)}>
                    <span className="font-medium">{a.session.name}</span>
                    <span className="text-xs text-ink-3">{a.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
          )}
      </section>
    </main>
  )
}
