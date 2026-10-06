import { FirebaseError } from 'firebase/app'
import { describe, expect, it } from 'vitest'
import { authMessage, passwordProblem } from './auth'

const fe = (code: string) => new FirebaseError(code, code)

describe('authMessage', () => {
  it('explains sign-in and password errors in plain words', () => {
    expect(authMessage(fe('auth/invalid-credential'))).toBe('Wrong email or password.')
    expect(authMessage(fe('auth/weak-password'))).toBe('Use at least 8 characters for the password.')
    expect(authMessage(fe('auth/too-many-requests'))).toBe('Too many attempts. Try again in a few minutes.')
    expect(authMessage(fe('auth/network-request-failed'))).toBe('No connection. Check your internet and try again.')
    expect(authMessage(fe('auth/email-already-in-use'))).toBe('An account already uses this email.')
  })
})

describe('passwordProblem', () => {
  it('asks for at least 8 characters and a matching confirmation', () => {
    expect(passwordProblem('short', 'short')).toBe('Use at least 8 characters for the password.')
    expect(passwordProblem('longenough1', 'different1')).toBe('The passwords don’t match.')
    expect(passwordProblem('longenough1', 'longenough1')).toBeNull()
  })
})
