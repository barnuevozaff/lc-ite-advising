/**
 * Domain types for the Rule-Based Academic Advising and Subject-Load
 * Evaluation System. Terminology follows Chapters I–III of the proposal.
 */

export type Program = 'BSCS' | 'BSIT'
export type CurriculumVersion = '2018–2019' | '2025–2026'
export type YearLevel = 1 | 2 | 3 | 4
export type Semester = 1 | 2
export type Role = 'student' | 'dean'

/** A subject or condition that must be satisfied before taking a subject. */
export type Prerequisite =
  | { kind: 'subject'; subjectId: string }
  | { kind: 'standing'; year: YearLevel }

/** Where a subject sits in the prospectus: 1st sem, 2nd sem, or 3 = summer. */
export type Placement = 1 | 2 | 3

export interface CurriculumSubject {
  /** Internal record identifier (not the subject code alone). */
  id: string
  code: string
  title: string
  units: number
  year: YearLevel
  semester: Placement
  prerequisites: Prerequisite[]
  /** The prerequisite exactly as printed on the prerequisite sheet. */
  prereqText: string
  /** False when the sheet has a blank, a dash, or no page for this subject. */
  prereqOnFile: boolean
  /** A source conflict the dean should verify with the Registrar. */
  verify?: string
  /** Transcribed from the official prospectus and prerequisite sheets. */
  source: 'official'
}

export interface Curriculum {
  id: string
  program: Program
  version: CurriculumVersion
  subjects: CurriculumSubject[]
}

export interface TermRef {
  /** Academic year, e.g. "2025–2026" */
  ay: string
  sem: Semester | 'Summer'
}

/** A single academic record line, encoded by the dean from the student's grade record. */
export type RecordResult =
  | { kind: 'grade'; value: number }
  | { kind: 'INC'; completedGrade?: number }
  | { kind: 'UW' }
  | { kind: 'Dropped' }
  | { kind: 'Credited'; validated: boolean; note: string }

export interface RecordEntry {
  id: string
  subjectId: string
  term: TermRef
  result: RecordResult
}

export interface Student {
  id: string
  studentNo: string
  firstName: string
  lastName: string
  program: Program
  /** Academic Year in which the student first entered the program. */
  entryAY: string
  /** Stored on the profile; assigned from the entry academic year. */
  curriculumVersion: CurriculumVersion
  /** Set by the dean. Never computed by the system. */
  yearStanding: YearLevel | null
  /** Set when the dean archives the student. Records are kept; nothing is deleted. */
  archived?: { reason: string; at: string }
  /** Login email, when the dean created an account for the student. */
  email?: string
  /** Class section (e.g. "A"). Not used by the rule-based evaluation. */
  section?: string | null
  transferee: boolean
  records: RecordEntry[]
}

export interface Equivalency {
  id: string
  /** Subject taken (may belong to another curriculum version). */
  fromSubjectId: string
  /** Requirement it satisfies. */
  toSubjectId: string
  reference: string
  recordedOn: string
}

/* ---------- Evaluation output ---------- */

export type SubjectStatus =
  | 'passed'
  | 'failed'
  | 'notTaken'
  | 'eligible'
  | 'blocked'
  | 'notOffered'
  | 'enrolled'
  | 'pending'
  | 'notCompletedReview'
  | 'notCompleted'
  | 'credited'
  | 'recordUpdate'
  | 'deanReview'

export type Flag = 'needsAction' | 'needsAttention'

export interface PrereqCheck {
  prereq: Prerequisite
  satisfied: boolean
  /** Year standing is missing: cannot be checked. */
  unknown?: boolean
  detail: string
  /** When satisfied through a recorded equivalency. */
  viaEquivalency?: string
}

/** One link of a traced prerequisite chain, ordered root → subject. */
export interface ChainLink {
  subjectId?: string
  standing?: YearLevel
  label: string
  note: string
}

export interface SubjectEvaluation {
  subject: CurriculumSubject
  status: SubjectStatus
  flag?: Flag
  attempts: RecordEntry[]
  finalGrade?: number
  offered: boolean
  checks: PrereqCheck[]
  /** Each path ends at the evaluated subject and starts at the root cause. */
  chains: ChainLink[][]
  /**
   * Root cause of a block: an unresolved record (failed, INC, UW, DRP,
   * unvalidated credit), an unmet year-standing requirement, or prerequisites
   * that are simply not yet taken in the normal sequence.
   */
  blockCause?: 'record' | 'standing' | 'sequence'
  /** Subjects that list this subject as a prerequisite (direct). */
  dependents: string[]
  /** Explanation produced by the rule-based evaluation. */
  reason: string
  /** Shortest useful reason, shown next to the status. */
  note?: string
  /** For failed subjects: may be retaken this semester. */
  retakeAvailable?: boolean
}

export type Classification = 'regular' | 'irregular' | 'undetermined'

export interface LoadLine {
  subjectId: string
  /** Why the rules placed it in the load. */
  basis: 'prescribed' | 'retake' | 'back' | 'current' | 'ahead' | 'higherYear' | 'unplaced'
}

export interface Evaluation {
  student: Student
  curriculum: Curriculum
  classification: Classification
  classificationReasons: string[]
  missingData: string[]
  subjects: Record<string, SubjectEvaluation>
  load:
    | { kind: 'prescribed'; lines: LoadLine[]; exceptions: string[] }
    | { kind: 'recommended'; lines: LoadLine[] }
    | { kind: 'none' }
  /** Units of the prescribed curriculum semester for the recorded standing (reference only). */
  normalUnits?: number
}

/* ---------- Advising workflow ---------- */

export type AdvisingState =
  | 'awaitingConfirmation'
  | 'awaitingReview'
  | 'recordUpdate'
  | 'confirmed'
  | 'approved'

export interface DeanCaseDecision {
  subjectId: string
  note: string
  at: string
}

export interface AdvisingRecord {
  studentId: string
  /** When the student requested a load evaluation for the current term. */
  requestedAt?: string
  /** When the dean first opened the request. */
  reviewStartedAt?: string
  /** Proposed subjects the dean removed from the working load. */
  removed: string[]
  /** Eligible, offered subjects the dean added to the working load. */
  added?: string[]
  /** Blocked subjects the dean allowed for this student, with the reason. */
  allowed?: { subjectId: string; reason: string; at: string }[]
  remarks: string
  decision?: {
    kind: 'confirmed' | 'approved'
    at: string
    subjectIds: string[]
    remarks: string
  }
  caseDecisions: DeanCaseDecision[]
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: Role
  action: string
  studentId?: string
}
