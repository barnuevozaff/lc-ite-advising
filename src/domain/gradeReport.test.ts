import { describe, expect, it } from 'vitest'
import { BSCS_2025, BSIT_2025, curriculumFor } from '../data/curricula'
import { sampleNewStudent, seedStudents } from '../data/seed'
import { earliestAY, mergeScannedRecords, parseGradeReport, parseReportHeader, parseTermKey, readGradeInput, reportSections, termKey, termOptions } from './gradeReport'

const idOf = (c: string) => BSCS_2025.subjects.find((s) => s.code === c)!.id

const REPORT = `LAGUNA COLLEGE
OFFICE OF THE REGISTRAR
REPORT OF GRADES
FIRST SEMESTER, A.Y. 2025-2026
Subject Code Descriptive Title Units Final Grade Remarks
ITE C101 Introduction to Computing 3 88 PASSED
1TE C1O2a Fundamentals of Programming 3 74 FAILED
GE 101 Purposive Communication 3 INC INCOMPLETE
SECOND SEMESTER, A.Y. 2025-2026
ITE C103b Intermediate Programming 3 UW UNAUTHORIZED WITHDRAWAL
GE 105 Understanding the Self 3 DRP DROPPED
XYZ 999 Not in curriculum 3 90 PASSED
University Registrar`

describe('parseGradeReport', () => {
  const r = parseGradeReport(REPORT, BSCS_2025)
  const row = (c: string) => r.rows.find((x) => x.subjectId === idOf(c))!

  it('reads codes, grades and remarks per term', () => {
    expect(row('ITE C101')).toMatchObject({ result: { kind: 'grade', value: 88 }, term: { ay: '2025–2026', sem: 1 }, confidence: 'high' })
    expect(row('GE 101').result).toEqual({ kind: 'INC' })
    expect(row('ITE C103b')).toMatchObject({ result: { kind: 'UW' }, term: { ay: '2025–2026', sem: 2 } })
    expect(row('GE 105').result).toEqual({ kind: 'Dropped' })
    expect(r.rows).toHaveLength(5)
  })

  it('repairs common OCR confusions in codes (1/I, O/0)', () => {
    expect(row('ITE C102a')).toMatchObject({ result: { kind: 'grade', value: 74 }, confidence: 'high' })
  })

  it('lists grade-like lines with no curriculum code as unmatched', () => {
    expect(r.unmatched.map((u) => u.raw)).toEqual(['XYZ 999 Not in curriculum 3 90 PASSED'])
  })

  it('does not mistake units for grades', () => {
    expect(r.rows.every((x) => x.result?.kind !== 'grade' || x.result.value >= 50)).toBe(true)
  })

  it('marks a missing grade for checking', () => {
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE C101 Introduction to Computing 3', BSCS_2025)
    expect(x.rows[0]).toMatchObject({ result: null, confidence: 'check' })
  })

  it('marks a missing term heading for checking', () => {
    const x = parseGradeReport('ITE C101 Introduction to Computing 3 88 PASSED', BSCS_2025)
    expect(x.rows[0]).toMatchObject({ term: null, confidence: 'check' })
  })

  it('accepts a one-character misread when only one code is that close', () => {
    const y = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE P1Z8 Software Engineering 1 3 81', BSCS_2025)
    expect(y.rows[0]).toMatchObject({ subjectId: idOf('ITE P128'), confidence: 'check' })
    expect(y.rows[0].issues).toContain('Code partly read')
  })

  it('refuses an ambiguous fuzzy match instead of guessing', () => {
    // "ITE C10" is one edit away from ITE C101, ITE C104, ITE C105 and ITE C106.
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE C10 Computing 3 80', BSCS_2025)
    expect(x.rows).toHaveLength(0)
    expect(x.unmatched).toHaveLength(1)
  })

  it('flags duplicate subjects in the same term', () => {
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE C101 Intro 3 88\nITE C101 Intro 3 90', BSCS_2025)
    expect(x.rows).toHaveLength(2)
    expect(x.rows.every((r) => r.confidence === 'check' && r.issues.includes('Listed twice'))).toBe(true)
  })

  it('reads decimal grades and summer terms', () => {
    const x = parseGradeReport('SUMMER, A.Y. 2025–2026\nGE 109 Life and Works of Rizal 3 85.50 PASSED', BSCS_2025)
    expect(x.rows[0]).toMatchObject({ result: { kind: 'grade', value: 85.5 }, term: { ay: '2025–2026', sem: 'Summer' } })
  })

  it('ignores a grading legend or other prose lines with numbers', () => {
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nPassing grade: 75. INC: Incomplete. UW: Unauthorized Withdrawal.\nITE C101 Introduction to Computing 3 88', BSCS_2025)
    expect(x.unmatched).toEqual([])
    expect(x.rows).toHaveLength(1)
  })

  it('returns nothing for empty or garbage text', () => {
    expect(parseGradeReport('', BSCS_2025)).toEqual({ rows: [], unmatched: [] })
    expect(parseGradeReport('~~ ## ..\n|||', BSCS_2025)).toEqual({ rows: [], unmatched: [] })
  })
})

describe('mergeScannedRecords', () => {
  const t = { ay: '2025–2026', sem: 1 as const }
  const existing = [{ id: 'r1', subjectId: idOf('ITE C101'), term: t, result: { kind: 'grade' as const, value: 70 } }]

  it('replaces the same subject in the same term instead of duplicating', () => {
    const m = mergeScannedRecords(existing, [{ subjectId: idOf('ITE C101'), term: t, result: { kind: 'grade', value: 88 } }])
    expect(m.replaced.map((r) => r.id)).toEqual(['r1'])
    expect(m.keep).toEqual([])
    expect(m.add).toEqual([{ subjectId: idOf('ITE C101'), term: t, result: { kind: 'grade', value: 88 } }])
  })

  it('keeps a different term as a separate attempt', () => {
    const m = mergeScannedRecords(existing, [{ subjectId: idOf('ITE C101'), term: { ay: '2026–2027', sem: 1 }, result: { kind: 'grade', value: 88 } }])
    expect(m.keep).toHaveLength(1)
    expect(m.replaced).toEqual([])
  })
})

describe('sample Report of Grades', () => {
  it('scans back exactly the records it prints, for every seeded student', () => {
    for (const st of [...seedStudents(), sampleNewStudent()]) {
      const cur = curriculumFor(st.program, st.curriculumVersion)
      const text = reportSections(st, cur)
        .flatMap((sec) => [sec.heading, ...sec.rows.map((r) => `${r.code} ${r.title} ${r.units} ${r.grade} ${r.remark}`)])
        .join('\n')
      const parsed = parseGradeReport(text, cur)
      const printable = st.records.filter((r) => r.result.kind !== 'Credited')
      expect(parsed.rows, st.id).toHaveLength(printable.length)
      expect(parsed.unmatched, st.id).toEqual([])
      for (const row of parsed.rows) expect(row.issues.filter((i) => i !== 'Listed twice' && i !== 'Code used twice in the prospectus'), `${st.id} ${row.raw}`).toEqual([])
      // Every row lands on the same subject the record had, including shared codes.
      expect(parsed.rows.map((r) => r.subjectId).sort(), st.id).toEqual(printable.map((r) => r.subjectId).sort())
    }
  })

  it('labels remarks the way the parser reads them', () => {
    const st = seedStudents().find((x) => x.id === 's-dominic')!
    const rows = reportSections(st, curriculumFor(st.program, st.curriculumVersion)).flatMap((s) => s.rows)
    expect(rows.find((r) => r.code === 'ITE P306')).toMatchObject({ grade: 'UW', remark: 'UNAUTHORIZED WITHDRAWAL' })
    expect(rows.find((r) => r.code === 'FL 111')).toMatchObject({ grade: 'DRP', remark: 'DROPPED' })
  })
})

describe('readGradeInput', () => {
  it('accepts grades 50–100 and the remarks INC, UW, DRP', () => {
    expect(readGradeInput('88')).toEqual({ kind: 'grade', value: 88 })
    expect(readGradeInput(' 85.5 ')).toEqual({ kind: 'grade', value: 85.5 })
    expect(readGradeInput('inc')).toEqual({ kind: 'INC' })
    expect(readGradeInput('UW')).toEqual({ kind: 'UW' })
    expect(readGradeInput('drp')).toEqual({ kind: 'Dropped' })
  })
  it('rejects units, out-of-range numbers and text', () => {
    for (const v of ['', '4', '101', '49', 'abc', '8 8']) expect(readGradeInput(v), v).toBeNull()
  })
})

describe('term options for the review screen', () => {
  it('lists every term from entry up to the current term, newest first', () => {
    const opts = termOptions('2025–2026', { ay: '2026–2027', sem: 1 })
    expect(opts.map(termKey)).toEqual(['2026–2027|1', '2025–2026|Summer', '2025–2026|2', '2025–2026|1'])
  })
  it('round-trips term keys', () => {
    expect(parseTermKey('2025–2026|Summer')).toEqual({ ay: '2025–2026', sem: 'Summer' })
    expect(parseTermKey('2025–2026|2')).toEqual({ ay: '2025–2026', sem: 2 })
    expect(parseTermKey('')).toBeNull()
  })
})

describe('OCR-style noise on official codes', () => {
  // Misreads seen from tesseract.js on printed reports: merged spaces, O for 0, S for 5, lowercase, stray dot.
  const OCR = `FIRST SEMESTER, A.Y. 2025-2026
SUBJECT CODE DESCRIPTIVE TITLE UNITS FINAL GRADE REMARKS
ENG1O1 English Enrichment Course 3 88 PASSED
GE 102 Readings in Philippine History 3 91 PASSED
GE1O3 Mathematics in the Modern World 3 93 PASSED
ITE C101 Introduction to Computing 3 84 PASSED
ITE C1022. Fundamentals of Programming 3 94 PASSED
PE 11S PathFit 1 - Movement Competency Training 2 84 PASSED
NSTP 111 NSTP 1 - Civic Welfare Training Service 3 89 PASSED
SECOND SEMESTER, AY. 2025-2026
GE1OS Understanding the Self 3 92 PASSED
ite c103b Intermediate Programming 3 72 FAILED`

  it('reads every subject, repairing merged and misread codes', () => {
    const r = parseGradeReport(OCR, BSCS_2025)
    const got = Object.fromEntries(r.rows.map((x) => [BSCS_2025.subjects.find((s) => s.id === x.subjectId)!.code, x.result]))
    expect(got).toEqual({
      'ENG 101': { kind: 'grade', value: 88 },
      'GE 102': { kind: 'grade', value: 91 },
      'GE 103': { kind: 'grade', value: 93 },
      'ITE C101': { kind: 'grade', value: 84 },
      'ITE C102a': { kind: 'grade', value: 94 },
      'PE 115': { kind: 'grade', value: 84 },
      'NSTP 111': { kind: 'grade', value: 89 },
      'GE 105': { kind: 'grade', value: 92 },
      'ITE C103b': { kind: 'grade', value: 72 },
    })
    expect(r.rows.find((x) => x.raw.startsWith('ITE C1022.'))!.confidence).toBe('check')
    expect(r.unmatched).toEqual([])
  })
})

describe('OCR of a report with ruled table cells', () => {
  // Real tesseract output of a bordered-table report after grid lines are removed: stray "|" and a wrapped title.
  const OCR = `FIRST SEMESTER, A.Y. 2025-2026
SUBJECT CODE DESCRIPTIVE TITLE UNITS FINAL REMARKS
GRADE

ENG 101 English Enrichment Course 3 80 PASSED
NSTP 111 NSTP 1 - Civic Welfare Training Service 3 84 PASSED

PathFit 1 - Movement Competency
| PE 115 Training 2 91 PASSED
SECOND SEMESTER, A.Y. 2025-2026
| SUBJECT CODE DESCRIPTIVE TITLE units EL REMARKS
GE ELEC 2 Entrepreneurial Mind 3 96 PASSED`

  it('reads rows that start with a stray border character', () => {
    const r = parseGradeReport(OCR, BSCS_2025)
    const got = Object.fromEntries(r.rows.map((x) => [BSCS_2025.subjects.find((s) => s.id === x.subjectId)!.code, x.result]))
    expect(got).toEqual({
      'ENG 101': { kind: 'grade', value: 80 },
      'NSTP 111': { kind: 'grade', value: 84 },
      'PE 115': { kind: 'grade', value: 91 },
      'GE ELEC 2': { kind: 'grade', value: 96 },
    })
    expect(r.unmatched).toEqual([])
  })
})

describe('a code printed twice in one prospectus', () => {
  // BSIT 2025–2026 uses ITE P119 for both Discrete Mathematics (1st year) and Practicum (4th year).
  const both = BSIT_2025.subjects.filter((s) => s.code === 'ITE P119')

  it('picks the subject whose title is on the line, and asks the dean to check', () => {
    const r = parseGradeReport('SECOND SEMESTER, A.Y. 2025-2026\nITE P119 Discrete Mathematics 3 81 PASSED\nITE P119 Practicum 6 90 PASSED', BSIT_2025)
    expect(r.rows.map((x) => x.subjectId)).toEqual([both[0].id, both[1].id])
    expect(r.rows.every((x) => x.confidence === 'check' && x.issues.includes('Code used twice in the prospectus'))).toBe(true)
  })
})

describe('parseReportHeader', () => {
  it('reads name, student number, program and curriculum from real OCR output', () => {
    const h = parseReportHeader('LAGUNA COLLEGE\nName: DIMACULANGAN, JEROME Student No.: 2025-10442\nProgram: BSCS Curriculum: 2025-2026\nFIRST SEMESTER, A.Y. 2025-2026')
    expect(h).toEqual({ lastName: 'Dimaculangan', firstName: 'Jerome', studentNo: '2025-10442', program: 'BSCS', curriculumVersion: '2025–2026' })
  })
  it('handles two-word names, Ñ and OCR spacing', () => {
    const h = parseReportHeader('Name : DE LA CRUZ, MARIA JOSE  Student No 2023 - 20064\nProgram: BSIT   Curriculum: 2018 – 2019')
    expect(h).toEqual({ lastName: 'De La Cruz', firstName: 'Maria Jose', studentNo: '2023-20064', program: 'BSIT', curriculumVersion: '2018–2019' })
    expect(parseReportHeader('Name: PEÑA, ANA Student No.: 2024-00001').lastName).toBe('Peña')
  })
  it('recognises the program from its full name', () => {
    expect(parseReportHeader('Program: Bachelor of Science in Information Technology').program).toBe('BSIT')
  })
  it('returns only what it could read', () => {
    expect(parseReportHeader('REPORT OF GRADES')).toEqual({})
    expect(parseReportHeader('Curriculum: 2020-2021').curriculumVersion).toBeUndefined()
  })
})

describe('earliestAY', () => {
  it('takes the earliest academic year among the rows, for the entry year', () => {
    expect(earliestAY([{ ay: '2025–2026', sem: 2 }, { ay: '2024–2025', sem: 1 }, null])).toBe('2024–2025')
    expect(earliestAY([null])).toBeUndefined()
  })
})
