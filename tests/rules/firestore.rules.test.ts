import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const student = {
  id: 'stu1',
  studentNo: '2025-0001',
  firstName: 'Test',
  lastName: 'Student',
  program: 'BSCS',
  entryAY: '2025–2026',
  curriculumVersion: '2025–2026',
  yearStanding: null,
  transferee: false,
  records: [],
  ownerUid: 'stu1',
}
const req = { studentId: 'stu2', requestedAt: '2026-10-06T00:00:00Z', removed: [], remarks: '', caseDecisions: [] }
const decision = { kind: 'approved', at: 'x', subjectIds: [], remarks: '' }

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-advising', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'users/dean1'), { role: 'dean' })
    await setDoc(doc(c.firestore(), 'users/stu2'), { role: 'student', studentId: 'stu2' })
    await setDoc(doc(c.firestore(), 'students/stu2'), { ...student, id: 'stu2', ownerUid: 'stu2' })
  })
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

describe('users', () => {
  it('nobody signs themselves up; the dean creates student logins', () => assertFails(setDoc(doc(as('stu1'), 'users/stu1'), { role: 'student', studentId: 'stu1' })))
  it('nobody can sign up as dean', () => assertFails(setDoc(doc(as('stu1'), 'users/stu1'), { role: 'dean', studentId: 'stu1' })))
  it('a student cannot change their role later', () => assertFails(updateDoc(doc(as('stu2'), 'users/stu2'), { role: 'dean' })))
  it('signed-out visitors read nothing', () => assertFails(getDoc(doc(anon(), 'users/stu2'))))
})

describe('students', () => {
  it('a student cannot create a record, even an empty one', () => assertFails(setDoc(doc(as('stu1'), 'students/stu1'), student)))
  it('a student cannot create a profile with year standing', () => assertFails(setDoc(doc(as('stu1'), 'students/stu1'), { ...student, yearStanding: 4 })))
  it('a student cannot create a profile with grades', () => assertFails(setDoc(doc(as('stu1'), 'students/stu1'), { ...student, records: [{ id: 'x' }] })))
  it('a student cannot create a profile for someone else', () => assertFails(setDoc(doc(as('stu1'), 'students/stu3'), { ...student, id: 'stu3', ownerUid: 'stu3' })))
  it('a student cannot edit their record after creation', () => assertFails(updateDoc(doc(as('stu2'), 'students/stu2'), { yearStanding: 4 })))
  it('a student reads their own record', () => assertSucceeds(getDoc(doc(as('stu2'), 'students/stu2'))))
  it('a student cannot read another student', () => assertFails(getDoc(doc(as('stu1'), 'students/stu2'))))
  it('the dean reads and edits any student', async () => {
    await assertSucceeds(getDoc(doc(as('dean1'), 'students/stu2')))
    await assertSucceeds(updateDoc(doc(as('dean1'), 'students/stu2'), { yearStanding: 2 }))
  })
  it('the dean creates a student record from a scan, with grades and standing', () =>
    assertSucceeds(setDoc(doc(as('dean1'), 'students/s-2025-77001'), { ...student, id: 's-2025-77001', ownerUid: null, yearStanding: 2, records: [{ id: 'r1' }] })))
  it('a student cannot create a record outside their own id', () =>
    assertFails(setDoc(doc(as('stu1'), 'students/s-2025-77001'), { ...student, id: 's-2025-77001', ownerUid: 'stu1' })))
  it('nobody deletes a student', () => assertFails(deleteDoc(doc(as('dean1'), 'students/stu2'))))
})

describe('requests', () => {
  it('a student cannot create a request; the dean opens it when scanning', () => assertFails(setDoc(doc(as('stu2'), 'requests/stu2'), req)))
  it('a student cannot create a request with a decision', () => assertFails(setDoc(doc(as('stu2'), 'requests/stu2'), { ...req, decision })))
  it('a student cannot request for someone else', () => assertFails(setDoc(doc(as('stu1'), 'requests/stu2'), req)))
  it('a student cannot change a request', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertFails(updateDoc(doc(as('stu2'), 'requests/stu2'), { decision }))
  })
  it('a student reads their own request, not others', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertSucceeds(getDoc(doc(as('stu2'), 'requests/stu2')))
    await assertFails(getDoc(doc(as('stu1'), 'requests/stu2')))
  })
  it('the dean opens a request for a scanned student', () =>
    assertSucceeds(setDoc(doc(as('dean1'), 'requests/s-2025-77001'), { ...req, studentId: 's-2025-77001', reviewStartedAt: 'x' })))
  it('the dean decides', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertSucceeds(updateDoc(doc(as('dean1'), 'requests/stu2'), { decision }))
  })
})

describe('accounts the dean creates for scanned students', () => {
  beforeEach(() =>
    env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'students/s-202530118'), { ...student, id: 's-202530118', ownerUid: null })
      await setDoc(doc(c.firestore(), 'users/login9'), { role: 'student', studentId: 's-202530118' })
    }),
  )
  it('the dean links a student login to a record', () => assertSucceeds(setDoc(doc(as('dean1'), 'users/login8'), { role: 'student', studentId: 's-202530118' })))
  it('the dean cannot create another dean', () => assertFails(setDoc(doc(as('dean1'), 'users/login8'), { role: 'dean' })))
  it('the linked student reads their record and request', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/s-202530118'), { ...req, studentId: 's-202530118' }))
    await assertSucceeds(getDoc(doc(as('login9'), 'students/s-202530118')))
    await assertSucceeds(getDoc(doc(as('login9'), 'requests/s-202530118')))
  })
  it('the linked student cannot create requests', async () => {
    await assertFails(setDoc(doc(as('login9'), 'requests/s-202530118'), { ...req, studentId: 's-202530118' }))
    await assertFails(setDoc(doc(as('login9'), 'requests/stu2'), req))
  })
  it('the linked student cannot read other records or edit their own', async () => {
    await assertFails(getDoc(doc(as('login9'), 'students/stu2')))
    await assertFails(updateDoc(doc(as('login9'), 'students/s-202530118'), { yearStanding: 4 }))
  })
})

describe('starting a new term', () => {
  it('only the dean archives and clears requests', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertFails(deleteDoc(doc(as('stu2'), 'requests/stu2')))
    await assertSucceeds(setDoc(doc(as('dean1'), 'archive/2026–2027_1'), { requests: {} }))
    await assertFails(getDoc(doc(as('stu2'), 'archive/2026–2027_1')))
    await assertSucceeds(deleteDoc(doc(as('dean1'), 'requests/stu2')))
  })
})

describe('config', () => {
  it('signed-in users read config; only the dean writes it', async () => {
    await assertSucceeds(getDoc(doc(as('stu2'), 'config/offerings')))
    await assertFails(setDoc(doc(as('stu2'), 'config/offerings'), { subjectIds: [] }))
    await assertSucceeds(setDoc(doc(as('dean1'), 'config/offerings'), { subjectIds: [] }))
  })
})

describe('audit', () => {
  it('entries carry their writer', async () => {
    await assertSucceeds(setDoc(doc(as('dean1'), 'audit/a1'), { action: 'Approved', role: 'dean', actorUid: 'dean1' }))
    await assertFails(setDoc(doc(as('dean1'), 'audit/a2'), { action: 'Approved', role: 'dean', actorUid: 'stu2' }))
    await assertFails(setDoc(doc(as('stu2'), 'audit/a4'), { action: 'Requested', role: 'student', actorUid: 'stu2' }))
  })
  it('a student cannot log an action as the dean', () => assertFails(setDoc(doc(as('stu2'), 'audit/a3'), { action: 'Approved', role: 'dean', actorUid: 'stu2' })))
  it('only the dean reads the log, and nobody edits it', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'audit/a1'), { action: 'x', role: 'student', actorUid: 'stu2' }))
    await assertFails(getDoc(doc(as('stu2'), 'audit/a1')))
    await assertSucceeds(getDoc(doc(as('dean1'), 'audit/a1')))
    await assertFails(updateDoc(doc(as('dean1'), 'audit/a1'), { action: 'y' }))
  })
})
