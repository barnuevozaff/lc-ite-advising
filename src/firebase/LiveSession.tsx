import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../store/AppStore'
import { liveAvailable } from './app'
import { watchSession } from './auth'
import { subscribe } from './sync'

/**
 * Keeps the store in step with Firebase: restores a signed-in session on load
 * and streams that user's documents while signed in. Renders nothing until
 * the first auth check finishes, so a live user never sees the sign-in page flash.
 */
export function LiveSession({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const [ready, setReady] = useState(!liveAvailable)
  const live = state.mode === 'live'
  const role = state.session?.role
  const studentId = state.session?.studentId

  useEffect(() => {
    if (!liveAvailable) return
    return watchSession((s) => {
      if (s) {
        dispatch({ type: 'setMode', mode: 'live' })
        dispatch({ type: 'signIn', session: s })
      } else dispatch({ type: 'liveSignedOut' })
      setReady(true)
    })
  }, [dispatch])

  useEffect(() => {
    if (!live || !role) return
    const who = role === 'dean' ? ({ role: 'dean' } as const) : ({ role: 'student', studentId: studentId! } as const)
    const needed = role === 'dean' ? ['students', 'advising', 'offerings', 'prereqOverrides', 'audit'] : ['students', 'advising', 'offerings', 'prereqOverrides']
    const seen = new Set<string>()
    return subscribe(
      who,
      (patch) => {
        Object.keys(patch).forEach((k) => seen.add(k))
        dispatch({ type: 'hydrate', patch: { ...patch, hydrated: needed.every((k) => seen.has(k)) } })
      },
      () => dispatch({ type: 'hydrate', patch: { syncError: 'Couldn’t load data. Check your connection and reload.' } }),
    )
  }, [live, role, studentId, dispatch])

  return ready ? <>{children}</> : null
}
