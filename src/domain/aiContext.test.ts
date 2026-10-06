import { describe, expect, it } from 'vitest'
import { seedAdvising, seedOfferings, seedStudents } from '../data/seed'
import { studentContext, SYSTEM_INSTRUCTION } from './aiContext'
import { evaluateStudent } from './rules'

const students = seedStudents()
const advising = seedAdvising(students)
const ev = (id: string) => evaluateStudent(students.find((s) => s.id === id)!, new Set(seedOfferings()), [])

describe('studentContext', () => {
  it('never includes the student’s name or student number', () => {
    for (const s of students) {
      const c = studentContext(ev(s.id), advising[s.id])
      expect(c).not.toContain(s.lastName)
      expect(c).not.toContain(s.firstName)
      expect(c).not.toContain(s.studentNo)
    }
  })

  it('includes program, curriculum, standing, classification and every subject with its status and reason', () => {
    const e = ev('s-jerome')
    const c = studentContext(e, advising['s-jerome'])
    expect(c).toContain('BSCS')
    expect(c).toContain('2025–2026')
    expect(c).toContain('Second Year')
    expect(c).toContain('Irregular')
    for (const x of Object.values(e.subjects)) expect(c).toContain(x.subject.code)
    expect(c).toMatch(/ITE C103b.*Failed/)
  })

  it('lists the load only after the dean decides', () => {
    expect(studentContext(ev('s-jerome'), advising['s-jerome'])).toContain('not yet decided')
    expect(studentContext(ev('s-jerome'), advising['s-jerome'])).not.toContain('Approved load')
    const d = studentContext(ev('s-dominic'), advising['s-dominic'])
    expect(d).toContain('Approved load')
    expect(d).toContain('ITE P402')
  })

  it('tells the model it may explain but never decide', () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/only.*record/i)
    expect(SYSTEM_INSTRUCTION).toMatch(/dean/i)
  })
})
