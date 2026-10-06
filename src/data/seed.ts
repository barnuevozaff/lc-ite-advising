/**
 * SYNTHETIC DEMONSTRATION DATA. Not real student records.
 *
 * Each student represents a scenario category from Table 5 of the proposal
 * (rule-based academic scenario testing). Names and student numbers are
 * fictional. Grades are numeric percentages; the passing grade is 75.
 */
import { BSCS_2018, BSCS_2025, BSIT_2018, BSIT_2025 } from './curricula'
import { CURRENT_TERM, curriculumVersionForEntryAY, shiftAY } from '../domain/term'
import type {
  AdvisingRecord,
  AuditEntry,
  Curriculum,
  Placement,
  Program,
  RecordEntry,
  RecordResult,
  Student,
  TermRef,
  YearLevel,
} from '../domain/types'

let seq = 0
const rid = () => `r${++seq}`

/** Deterministic, organic-looking passing grades (77–94). */
function gradeFor(key: string) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 77 + (h % 18)
}

function termOf(entryAY: string, year: number, sem: Placement): TermRef {
  return { ay: shiftAY(entryAY, year - 1), sem: sem === 3 ? 'Summer' : sem }
}

/**
 * Passing records for every subject placed before (year, sem) exclusive,
 * with per-code overrides. `null` override means "no record".
 */
function history(
  c: Curriculum,
  entryAY: string,
  upTo: { year: number; sem: Placement },
  overrides: Record<string, RecordResult | RecordResult[] | null> = {},
  key = '',
): RecordEntry[] {
  const out: RecordEntry[] = []
  for (const s of c.subjects) {
    const pos = s.year * 10 + s.semester
    if (pos >= upTo.year * 10 + upTo.sem) continue
    const o = overrides[s.code]
    if (o === null) continue
    const results = o === undefined ? [{ kind: 'grade', value: gradeFor(key + s.id) } as RecordResult] : Array.isArray(o) ? o : [o]
    for (const result of results) out.push({ id: rid(), subjectId: s.id, term: termOf(entryAY, s.year, s.semester), result })
  }
  return out
}

function student(
  id: string,
  studentNo: string,
  firstName: string,
  lastName: string,
  program: Program,
  entryAY: string,
  yearStanding: YearLevel | null,
  records: RecordEntry[],
  transferee = false,
): Student {
  return {
    id,
    studentNo,
    firstName,
    lastName,
    program,
    entryAY,
    curriculumVersion: curriculumVersionForEntryAY(entryAY),
    yearStanding,
    transferee,
    records,
  }
}

const find = (c: Curriculum, code: string) => c.subjects.find((s) => s.code === code)!.id

export function seedStudents(): Student[] {
  seq = 0
  const now = { year: 2, sem: CURRENT_TERM.sem }

  // Regular student, 2025–2026 curriculum: prescribed load for confirmation.
  const bea = student('s-bea', '2025-10318', 'Bea', 'Malabanan', 'BSCS', '2025–2026', 2, history(BSCS_2025, '2025–2026', now, {}, 'bea'))

  // Failed subject early in a prerequisite chain (ITE C103b → ITE ELEC 5 → ITE P128 → ITE P113 → ITE P113b).
  const jerome = student(
    's-jerome',
    '2025-10442',
    'Jerome',
    'Dimaculangan',
    'BSCS',
    '2025–2026',
    2,
    history(BSCS_2025, '2025–2026', now, { 'ITE C103b': { kind: 'grade', value: 72 } }, 'jerome'),
  )

  // INC in Intermediate Programming, which most second-year BSIT subjects depend on.
  const kristine = student(
    's-kristine',
    '2025-20117',
    'Kristine',
    'Abrenica',
    'BSIT',
    '2025–2026',
    2,
    history(BSIT_2025, '2025–2026', now, { 'ITE C103b': { kind: 'INC' } }, 'kristine'),
  )

  // Transferee with recorded Second Year standing: credited subjects, one credit not yet validated,
  // a higher-year subject without a standing prerequisite, and ITE P132 (requires Third Year standing).
  const paoloRecords = history(
    BSCS_2025,
    '2025–2026',
    now,
    {
      'ITE P101': { kind: 'Credited', validated: false, note: 'previous institution (transcript on file)' },
    },
    'paolo',
  ).map((r) => {
    const s = BSCS_2025.subjects.find((x) => x.id === r.subjectId)!
    if (s.year === 1 && s.semester === 1)
      return { ...r, result: { kind: 'Credited', validated: true, note: 'previous institution (transcript on file)' } as RecordResult }
    return r
  })
  const paolo = student('s-paolo', '2025-10590', 'Paolo', 'Esguerra', 'BSCS', '2025–2026', 2, paoloRecords, true)

  // 2018–2019 curriculum, regular, with a completed INC. Load already confirmed.
  const liza = student(
    's-liza',
    '2023-20064',
    'Liza',
    'Macaraig',
    'BSIT',
    '2023–2024',
    4,
    history(BSIT_2018, '2023–2024', { year: 4, sem: 1 }, { 'ITE P111': { kind: 'INC', completedGrade: 84 } }, 'liza'),
  )

  // Missing recorded year standing, record does not establish irregular status.
  const rommel = student('s-rommel', '2024-20231', 'Rommel', 'Tolentino', 'BSIT', '2024–2025', null, history(BSIT_2018, '2024–2025', { year: 3, sem: 1 }, {}, 'rommel'))

  // Missing year standing, but a failed earlier subject already establishes irregular status.
  const angelica = student(
    's-angelica',
    '2024-20288',
    'Angelica',
    'Sumulong',
    'BSIT',
    '2024–2025',
    null,
    history(BSIT_2018, '2024–2025', { year: 3, sem: 1 }, { 'ITE C105': { kind: 'grade', value: 70 } }, 'angelica'),
  )

  // Retaken subject, UW and DRP records, 2018–2019 BSCS. Approved by the dean with remarks.
  const domRecords = history(
    BSCS_2018,
    '2023–2024',
    { year: 4, sem: 1 },
    {
      'ITE P303': [{ kind: 'grade', value: 70 }],
      'ITE P307': null,
      'ITE P306': { kind: 'UW' },
      'FL 111': { kind: 'Dropped' },
      'FL 112': null,
    },
    'dominic',
  )
  domRecords.push({ id: rid(), subjectId: find(BSCS_2018, 'ITE P303'), term: { ay: '2025–2026', sem: 'Summer' }, result: { kind: 'grade', value: 81 } })
  const dominic = student('s-dominic', '2023-10127', 'Dominic', 'Lacsamana', 'BSCS', '2023–2024', 4, domRecords)

  // Regular after a retaken GE subject (failed, then passed in Summer).
  const carloRecords = history(BSIT_2025, '2025–2026', now, { 'GE 102': { kind: 'grade', value: 73 } }, 'carlo')
  carloRecords.push({ id: rid(), subjectId: find(BSIT_2025, 'GE 102'), term: { ay: '2025–2026', sem: 'Summer' }, result: { kind: 'grade', value: 80 } })
  const carlo = student('s-carlo', '2025-20203', 'Carlo', 'Navarro', 'BSIT', '2025–2026', 2, carloRecords)

  const hannah = student('s-hannah', '2024-10075', 'Hannah', 'Bautista', 'BSCS', '2024–2025', 3, history(BSCS_2018, '2024–2025', { year: 3, sem: 1 }, {}, 'hannah'))
  const ramon = student('s-ramon', '2023-20159', 'Ramon', 'Gatdula', 'BSIT', '2023–2024', 4, history(BSIT_2018, '2023–2024', { year: 4, sem: 1 }, {}, 'ramon'))

  // New First Year student under the 2025–2026 curriculum (entered AY 2026–2027).
  const joshua = student('s-joshua', '2026-20021', 'Joshua', 'Manalo', 'BSIT', '2026–2027', 1, [])

  return [bea, jerome, kristine, paolo, dominic, liza, rommel, angelica, carlo, hannah, ramon, joshua]
}

export function seedOfferings(): string[] {
  const ids: string[] = []
  const take = (c: Curriculum, keys: string[], extra: string[] = []) => {
    for (const s of c.subjects) if (keys.includes(`${s.year}.${s.semester}`)) ids.push(s.id)
    for (const code of extra) ids.push(find(c, code))
  }
  // Current semester offerings set by the dean (synthetic).
  take(BSCS_2025, ['1.1', '2.1'], ['ITE C103b', 'GE 109'])
  take(BSIT_2025, ['1.1', '2.1'], ['ITE C103b'])
  take(BSIT_2018, ['3.1', '4.1'], ['ITE P104'])
  take(BSCS_2018, ['3.1', '4.1'], ['ITE P306'])
  return ids
}

const at = (d: string) => new Date(d).toISOString()

export function seedAdvising(students: Student[]): Record<string, AdvisingRecord> {
  const ids = (c: Curriculum, codes: string[]) => codes.map((x) => find(c, x))
  const blank = (studentId: string, requestedAt: string, reviewStartedAt?: string): AdvisingRecord => ({
    studentId,
    requestedAt: at(requestedAt),
    reviewStartedAt: reviewStartedAt ? at(reviewStartedAt) : undefined,
    removed: [],
    remarks: '',
    caseDecisions: [],
  })
  // Evaluations the dean has started this term (synthetic). Bea is not yet evaluated.
  const out: Record<string, AdvisingRecord> = {
    's-jerome': blank('s-jerome', '2026-10-01T08:20:00+08:00'),
    's-kristine': blank('s-kristine', '2026-10-01T09:05:00+08:00'),
    's-paolo': blank('s-paolo', '2026-10-01T10:12:00+08:00', '2026-10-02T13:30:00+08:00'),
    's-angelica': blank('s-angelica', '2026-10-01T13:47:00+08:00'),
    's-rommel': blank('s-rommel', '2026-10-01T14:02:00+08:00', '2026-10-03T08:50:00+08:00'),
    's-carlo': blank('s-carlo', '2026-10-02T08:31:00+08:00'),
    's-hannah': blank('s-hannah', '2026-10-02T09:16:00+08:00'),
    's-ramon': blank('s-ramon', '2026-10-02T11:40:00+08:00'),
    's-joshua': blank('s-joshua', '2026-10-03T07:58:00+08:00'),
    's-liza': {
      ...blank('s-liza', '2026-09-30T15:10:00+08:00', '2026-10-02T09:02:00+08:00'),
      decision: {
        kind: 'confirmed',
        at: at('2026-10-02T09:14:00+08:00'),
        subjectIds: ids(BSIT_2018, ['ITE P113', 'ITE P114', 'ITE ELEC 3', 'ITE ELEC 4', 'ITE P118']),
        remarks: '',
      },
    },
    's-dominic': {
      ...blank('s-dominic', '2026-09-30T16:25:00+08:00', '2026-10-02T10:30:00+08:00'),
      decision: {
        kind: 'approved',
        at: at('2026-10-02T10:41:00+08:00'),
        subjectIds: ids(BSCS_2018, ['FL 111', 'ITE P306', 'ITE P402', 'ITE P403', 'GE 109']),
        remarks: 'Retake ITE P306 and FL 111. Take ITE P405 next sem.',
      },
    },
  }
  for (const id of Object.keys(out)) if (!students.some((s) => s.id === id)) delete out[id]
  return out
}

export function seedAudit(): AuditEntry[] {
  return [
    // Newest first, like the live log.
    { id: 'a3', at: at('2026-10-02T10:41:00+08:00'), actor: 'Dean, ITE Department', role: 'dean', action: 'Approved subject load, with remarks', studentId: 's-dominic' },
    { id: 'a2', at: at('2026-10-02T09:14:00+08:00'), actor: 'Dean, ITE Department', role: 'dean', action: 'Confirmed subject load', studentId: 's-liza' },
    { id: 'a1', at: at('2026-10-01T15:20:00+08:00'), actor: 'Dean, ITE Department', role: 'dean', action: 'Updated subject offerings for First Semester, AY 2026–2027' },
  ]
}

export { BSCS_2018, BSCS_2025, BSIT_2018, BSIT_2025 }

/**
 * A synthetic student who is NOT in the system, used only to print a sample
 * Report of Grades and demonstrate creating a record from a scan.
 */
export function sampleNewStudent(): Student {
  const s1: [string, RecordResult][] = [
    ['ENG 101', { kind: 'grade', value: 87 }],
    ['GE 101', { kind: 'grade', value: 86 }],
    ['GE 102', { kind: 'grade', value: 83 }],
    ['GE 103', { kind: 'grade', value: 79 }],
    ['GE 104', { kind: 'grade', value: 88 }],
    ['ITE C101', { kind: 'grade', value: 90 }],
    ['ITE C102a', { kind: 'grade', value: 81 }],
    ['NSTP 111', { kind: 'grade', value: 88 }],
    ['PE 115', { kind: 'grade', value: 92 }],
  ]
  const s2: [string, RecordResult][] = [
    ['GE 105', { kind: 'grade', value: 84 }],
    ['GE 106', { kind: 'grade', value: 87 }],
    ['GE ELEC 2', { kind: 'grade', value: 85 }],
    ['ITE C103b', { kind: 'grade', value: 73 }],
    ['ITE C104', { kind: 'grade', value: 80 }],
    ['ITE P119', { kind: 'INC' }],
    ['GE ELEC 1', { kind: 'grade', value: 89 }],
    ['NSTP 112', { kind: 'grade', value: 89 }],
    ['PE 116', { kind: 'grade', value: 90 }],
  ]
  const rec = (sem: 1 | 2) => ([code, result]: [string, RecordResult], i: number): RecordEntry => ({
    id: `sample-${sem}-${i}`,
    subjectId: find(BSIT_2025, code),
    term: { ay: '2025–2026', sem },
    result,
  })
  return {
    id: 'sample-new',
    studentNo: '2025-30118',
    firstName: 'Mika',
    lastName: 'Santos',
    program: 'BSIT',
    entryAY: '2025–2026',
    curriculumVersion: '2025–2026',
    yearStanding: null,
    transferee: false,
    records: [...s1.map(rec(1)), ...s2.map(rec(2))],
  }
}
