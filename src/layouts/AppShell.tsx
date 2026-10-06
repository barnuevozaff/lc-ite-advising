import {
  ArrowCounterClockwiseIcon,
  BooksIcon,
  ChartBarIcon,
  KeyIcon,
  ChatCircleTextIcon,
  ClockCounterClockwiseIcon,
  HouseIcon,
  ListIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  TrayIcon,
  TreeStructureIcon,
  UsersIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Modal } from '../components/controls'
import { SEM_LABEL, shiftAY, termLabel, type ActiveTerm } from '../domain/term'
import type { Placement } from '../domain/types'
import { authMessage, changePassword, passwordProblem, signOutLive } from '../firebase/auth'
import { useStore } from '../store/AppStore'
import type { Role } from '../domain/types'

interface NavItem {
  to: string
  label: string
  icon: Icon
  end?: boolean
  badge?: number
}

function useNav(role: Role): NavItem[] {
  if (role === 'student')
    return [
      { to: '/student', label: 'Subject load', icon: HouseIcon, end: true },
      { to: '/student/grades', label: 'Grades', icon: ChartBarIcon },
      { to: '/student/progress', label: 'Curriculum', icon: TreeStructureIcon },
      { to: '/student/assistant', label: 'Ask', icon: ChatCircleTextIcon },
    ]
  return [
    { to: '/dean', label: 'Evaluations', icon: TrayIcon, end: true },
    { to: '/dean/students', label: 'Students', icon: UsersIcon },
    { to: '/dean/curricula', label: 'Curricula', icon: BooksIcon },
    { to: '/dean/activity', label: 'Activity', icon: ClockCounterClockwiseIcon },
  ]
}

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  dean: 'Dean',
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src="/laguna-college-seal.png" alt="Laguna College seal" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full" />
      <div className="leading-tight">
        <div className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Laguna College</div>
        <div className="text-xs text-ink-3">Academic Advising</div>
      </div>
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => {
    try {
      return (localStorage.getItem('lc-theme') as 'light' | 'dark' | null) ?? null
    } catch {
      return null
    }
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.dataset.theme = theme
    else delete root.dataset.theme
    try {
      if (theme) localStorage.setItem('lc-theme', theme)
      else localStorage.removeItem('lc-theme')
    } catch {
      /* ignore */
    }
  }, [theme])
  const isDark = theme ? theme === 'dark' : typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  return { isDark, toggle: () => setTheme(isDark ? 'light' : 'dark') }
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((n) => (
        <li key={n.to}>
          <NavLink
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line)]' : 'text-ink-2 hover:bg-sunken hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <n.icon size={18} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-seal-text' : ''} aria-hidden />
                <span className="flex-1">{n.label}</span>
                {n.badge ? <span className="num rounded bg-act-tint px-1.5 text-xs font-semibold text-act">{n.badge}</span> : null}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function UserBlock({ compact }: { compact?: boolean }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const s = state.session!
  return (
    <div className={compact ? '' : 'border-t border-line pt-4'}>
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold text-ink-2" aria-hidden>
          {s.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{s.name}</div>
          <div className="truncate text-xs text-ink-3">
            {ROLE_LABEL[s.role]}
            {state.mode === 'demo' ? <span data-demo-only> · Demo</span> : ''}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        <button
          className="btn btn-ghost btn-sm flex-1 justify-start"
          onClick={() => {
            if (state.mode === 'live') void signOutLive()
            else dispatch({ type: 'signOut' })
            navigate('/')
          }}
        >
          <SignOutIcon size={16} />
          Sign out
        </button>
        {state.mode === 'live' && <PasswordButton />}
        <button className="btn btn-ghost btn-sm w-8 p-0" onClick={toggle} aria-label={isDark ? 'Use light theme' : 'Use dark theme'} title={isDark ? 'Light theme' : 'Dark theme'}>
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
        {state.mode === 'demo' && (
          <button
            className="btn btn-ghost btn-sm w-8 p-0"
            onClick={() => {
              if (confirm('Reset all demo data to the original synthetic records?')) dispatch({ type: 'reset' })
            }}
            aria-label="Reset demo data"
            title="Reset demo data"
            data-demo-only
          >
            <ArrowCounterClockwiseIcon size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function TermNote() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const cur = state.term
  // The natural next term: 2nd sem of the same AY, or 1st sem of the next AY.
  // The natural next term: 1st → 2nd → Summer → 1st of the next AY.
  const next: ActiveTerm = cur.sem === 1 ? { ay: cur.ay, sem: 2 } : cur.sem === 2 ? { ay: cur.ay, sem: 3 } : { ay: shiftAY(cur.ay, 1), sem: 1 }
  const [pick, setPick] = useState(next)
  const isDean = state.session?.role === 'dean'
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-ink-3">
      <span>
        Term <span className="ml-1 font-medium text-ink-2">{termLabel(cur, true)}</span>
      </span>
      {isDean && (
        <button
          className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          onClick={() => {
            setPick(next)
            setOpen(true)
          }}
        >
          Change
        </button>
      )}
      {isDean && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={<h2 className="text-lg font-semibold">Start new term</h2>}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={pick.ay === cur.ay && pick.sem === cur.sem}
                onClick={() => {
                  dispatch({ type: 'startTerm', term: pick })
                  setOpen(false)
                }}
              >
                Start {termLabel(pick, true)}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3 text-sm text-ink">
            <label className="block">
              <span className="field-label">Semester</span>
              <select className="input" value={pick.sem} onChange={(e) => setPick({ ...pick, sem: Number(e.target.value) as Placement })}>
                <option value={1}>{SEM_LABEL[1]}</option>
                <option value={2}>{SEM_LABEL[2]}</option>
                <option value={3}>{SEM_LABEL[3]}</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Academic year</span>
              <select className="input" value={pick.ay} onChange={(e) => setPick({ ...pick, ay: e.target.value })}>
                {[-1, 0, 1].map((n) => shiftAY(cur.ay, n)).map((a) => (
                  <option key={a} value={a}>
                    AY {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
            <li>Current evaluations and decisions for {termLabel(cur)} are archived.</li>
            <li>Offerings are reset to every {pick.sem === 3 ? 'summer' : pick.sem === 1 ? 'first-semester' : 'second-semester'} subject. Adjust them in Curricula.</li>
            <li>Students are evaluated again after their new grades are scanned.</li>
          </ul>
        </Modal>
      )}
    </div>
  )
}

function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      requestAnimationFrame(() => setShown(true))
    } else if (!open && d.open) {
      setShown(false)
      const t = setTimeout(() => d.close(), 220)
      return () => clearTimeout(t)
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
      onCancel={(e) => (e.preventDefault(), onClose())}
      aria-label="Navigation"
    >
      <div className="sheet-backdrop fixed inset-0" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} aria-hidden />
      <div
        className="sheet fixed inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col gap-6 bg-surface-2 p-4"
        style={{ transform: shown ? 'none' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button className="btn btn-ghost h-9 w-9 p-0" onClick={onClose} aria-label="Close navigation">
            <XIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function AppShell() {
  const { state } = useStore()
  const role = state.session!.role
  const items = useNav(role)
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const current = [...items].sort((a, b) => b.to.length - a.to.length).find((n) => location.pathname.startsWith(n.to))

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface-2 px-4 py-5 lg:flex">
        <Brand />
        <nav aria-label="Main" className="flex-1">
          <NavList items={items} />
        </nav>
        <TermNote />
        <UserBlock />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface-2/95 px-4 backdrop-blur-sm lg:hidden">
          {role !== 'student' && (
            <button className="btn btn-ghost -ml-2 h-10 w-10 p-0" onClick={() => setDrawer(true)} aria-label="Open navigation">
              <ListIcon size={20} />
            </button>
          )}
          <img src="/laguna-college-seal.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
          <span className="truncate text-sm font-semibold">{current?.label ?? 'Academic Advising'}</span>
          {role === 'student' && (
            <button className="btn btn-ghost ml-auto h-10 px-2 text-sm" onClick={() => setDrawer(true)} aria-label="Account">
              {state.session!.name.split(' ')[0]}
            </button>
          )}
        </header>

        <main className={`flex-1 ${role === 'student' ? 'pb-24 lg:pb-0' : ''}`}>
          <SyncError />
          {state.hydrated ? (
            <Outlet />
          ) : (
            <p className="px-4 py-16 text-center text-sm text-ink-3" role="status">
              Loading…
            </p>
          )}
        </main>

        {role === 'student' && (
          <nav
            aria-label="Main"
            className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
          >
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${isActive ? 'text-seal-text' : 'text-ink-3'}`}
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)}>
        {role !== 'student' && (
          <nav aria-label="Main" className="flex-1">
            <NavList items={items} onNavigate={() => setDrawer(false)} />
          </nav>
        )}
        <div className={role === 'student' ? 'flex-1' : ''}>
          <TermNote />
        </div>
        <UserBlock compact />
      </MobileDrawer>
    </div>
  )
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 lg:mb-8">
      {back}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2rem]">{title}</h1>
          {description && <div className="mt-1.5 max-w-[70ch] text-[0.9375rem] text-ink-2">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-6 md:px-8 md:py-8 lg:py-10 ${wide ? 'max-w-[1360px]' : 'max-w-[1120px]'}`}>{children}</div>
}

function SyncError() {
  const { state, dispatch } = useStore()
  if (!state.syncError) return null
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-act/30 bg-act-tint px-4 py-2.5 text-sm text-act md:px-8">
      <span className="flex-1">{state.syncError}</span>
      <button className="btn btn-ghost btn-sm h-8 w-8 p-0" aria-label="Dismiss" onClick={() => dispatch({ type: 'hydrate', patch: { syncError: undefined } })}>
        <XIcon size={16} />
      </button>
    </div>
  )
}

function PasswordButton() {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const close = () => {
    setOpen(false)
    setF({ current: '', next: '', confirm: '' })
    setError('')
    setDone(false)
  }
  const save = async () => {
    const p = passwordProblem(f.next, f.confirm)
    if (!f.current) return setError('Enter your current password.')
    if (p) return setError(p)
    setBusy(true)
    try {
      await changePassword(f.current, f.next)
      setDone(true)
    } catch (e) {
      setError(authMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const field = (k: keyof typeof f, label: string, auto: string) => (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="input" type="password" autoComplete={auto} value={f[k]} onChange={(e) => (setF({ ...f, [k]: e.target.value }), setError(''))} />
    </label>
  )
  return (
    <>
      <button className="btn btn-ghost btn-sm w-8 p-0" onClick={() => setOpen(true)} aria-label="Change password" title="Change password">
        <KeyIcon size={16} />
      </button>
      <Modal
        open={open}
        onClose={close}
        title={<h2 className="text-lg font-semibold">Change password</h2>}
        footer={
          done ? (
            <button className="btn btn-primary" onClick={close}>
              Done
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save password'}
              </button>
            </>
          )
        }
      >
        {done ? (
          <p className="text-sm" role="status">
            Password changed. Use the new password next time you sign in.
          </p>
        ) : (
          <div className="space-y-3">
            {field('current', 'Current password', 'current-password')}
            {field('next', 'New password (at least 8 characters)', 'new-password')}
            {field('confirm', 'Confirm new password', 'new-password')}
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
