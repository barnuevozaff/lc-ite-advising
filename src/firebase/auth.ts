import { FirebaseError, deleteApp, initializeApp } from 'firebase/app'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import type { Role, Student } from '../domain/types'
import type { Session } from '../store/AppStore'
import { firebase, firebaseConfig } from './app'
import { readDoc } from './sync'

const DEAN_NAME = 'Dean, ITE Department'

export function authMessage(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email')
    return 'Wrong email or password.'
  if (code === 'auth/email-already-in-use') return 'An account already uses this email.'
  if (code === 'auth/weak-password' || code === 'auth/missing-password') return 'Use at least 8 characters for the password.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a few minutes.'
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'No connection. Check your internet and try again.'
  if (e instanceof Error && e.message === 'no-role') return 'This account has no access to the advising system.'
  return 'Something went wrong. Try again.'
}

async function sessionFor(uid: string): Promise<Session> {
  const user = await readDoc<{ role: Role; studentId?: string }>(`users/${uid}`)
  if (!user || (user.role !== 'dean' && user.role !== 'student')) throw new Error('no-role')
  if (user.role === 'dean') return { role: 'dean', name: DEAN_NAME }
  const studentId = user.studentId ?? uid
  const s = await readDoc<Student>(`students/${studentId}`)
  return { role: 'student', studentId, name: s ? `${s.firstName} ${s.lastName}` : 'Student' }
}

export async function signInLive(email: string, password: string): Promise<Session> {
  const { auth } = firebase()
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  try {
    return await sessionFor(cred.user.uid)
  } catch (e) {
    await signOut(auth)
    throw e
  }
}

export function signOutLive(): Promise<void> {
  return signOut(firebase().auth)
}

/** Restores a signed-in live session on page load. Calls back once with null when nobody is signed in. */
export function watchSession(cb: (s: Session | null, error?: string) => void): () => void {
  return onAuthStateChanged(firebase().auth, (user) => {
    if (!user) return cb(null)
    sessionFor(user.uid).then(
      (s) => cb(s),
      (e) => {
        void signOutLive()
        cb(null, authMessage(e))
      },
    )
  })
}

/** Readable temporary password: no look-alike characters. */
export function tempPassword(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => abc[b % abc.length]).join('')
}

/**
 * The dean creates a login for a student record. A second app instance is used
 * so the dean stays signed in. Returns the temporary password to hand over.
 */
export async function createStudentLogin(email: string, studentId: string): Promise<string> {
  const password = tempPassword()
  const second = initializeApp(firebaseConfig, `provision-${Date.now()}`)
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(second), email.trim(), password)
    await setDoc(doc(firebase().db, `users/${cred.user.uid}`), { role: 'student', studentId })
    await signOut(getAuth(second))
    return password
  } finally {
    await deleteApp(second)
  }
}

/** Problem with a new password, or null when it is fine. */
export function passwordProblem(next: string, confirm: string): string | null {
  if (next.length < 8) return 'Use at least 8 characters for the password.'
  if (next !== confirm) return 'The passwords don’t match.'
  return null
}

/** Confirms the current password, then sets the new one. */
export async function changePassword(current: string, next: string): Promise<void> {
  const user = firebase().auth.currentUser
  if (!user?.email) throw new Error('Not signed in')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
  await updatePassword(user, next)
}

/** Sends Firebase's password-reset email. */
export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(firebase().auth, email.trim())
}
