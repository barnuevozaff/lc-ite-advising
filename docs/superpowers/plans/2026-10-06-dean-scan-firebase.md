# Dean-only Evaluation, Grade-Record Scanning, Firebase (Spark) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Registrar role, let the dean scan a printed Report of Grades into a student's record with in-browser OCR, print a pre-enrollment form, and back the app with Firebase Auth + Firestore on the free plan while keeping an offline demo mode.

**Architecture:** The pure domain layer (`src/domain/*`) stays the single source of academic rules. A new pure parser turns OCR text into reviewable grade rows. The reducer in `src/store/AppStore.tsx` stays the state machine; a sync layer diffs state before/after each user action and writes only changed documents to Firestore, while Firestore snapshots hydrate state. Demo mode keeps today's localStorage behaviour with synthetic seed data.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind v4, Vitest, tesseract.js (OCR, browser), firebase (Auth, Firestore), Firebase CLI + Firestore emulator (rules tests, Java 26 is installed).

**Spec:** `docs/superpowers/specs/2026-10-06-dean-scan-firebase-design.md`

## Global Constraints

- Roles: `student` and `dean` only. No `registrar` anywhere in types, routes, copy or audit actors.
- Passing grade 75 (percentage). Remarks: `INC`, `UW` (Unauthorized Withdrawal), `DRP` (Dropped).
- UW is a non-pass: blocks dependents, retake allowed when offered.
- Year standing is set by the dean; never computed.
- The grade-record photo is never stored or uploaded; only the reviewed grades are saved.
- Firebase Spark plan only: Auth (email/password) + Firestore. No Cloud Functions, no Cloud Storage, no Gemini.
- Synthetic data only. No real student personal information in seed, fixtures or sample report.
- Do **not** `git commit` or `git push` (user instruction; the folder is not a git repo). Each task ends with a verification checkpoint instead of a commit.
- Copy stays terse (no tutorial/explanatory text), matching the existing UI.
- Firestore region `asia-southeast1`, project id `lc-ite-advising` (fallback `lc-ite-advising-<4 digits>` if taken).

## Review Focus

1. **Blurry or skewed photo** → OCR returns little or garbage: dean sees "No subjects recognised" with the photo and can add rows manually; nothing is saved automatically. (Task 5 test: empty parse result renders manual-entry state.)
2. **Code shared by two curricula / near-identical codes** (`ITE C102a` vs `ITE C102b`): fuzzy match must not silently pick one; ambiguous → unmatched. (Task 3 test.)
3. **Scanning the same report twice** → no duplicate records: rows for an existing subject+term replace, not append. (Task 3 `mergeScannedRecords` test.)
4. **Student tries to write their own grades or decision via the SDK** → rejected by security rules. (Task 9 rules tests.)
5. **Snapshot echo loop** → hydrating from Firestore must never trigger writes. (Task 8 `diffWrites` test: hydrate produces zero writes.)

---

## File map

| File | Responsibility |
|---|---|
| `src/domain/types.ts` (modify) | `Role` = student/dean; `RecordResult` `AW`→`UW`; remove `CorrectionRequest` |
| `src/domain/rules.ts` (modify) | UW outcome = failed; DRP label |
| `src/domain/gradeReport.ts` (create) | `parseGradeReport`, `mergeScannedRecords`, fuzzy code matching |
| `src/domain/gradeReport.test.ts` (create) | parser tests with OCR-noise fixtures |
| `src/scan/ocr.ts` (create) | image pre-processing + tesseract.js worker wrapper |
| `src/pages/dean/ScanGrades.tsx` (create) | capture → OCR → review → save sheet |
| `src/pages/dean/SampleReport.tsx` (create) | printable synthetic Report of Grades |
| `src/pages/dean/DeanStudents.tsx`, `DeanStudent.tsx` (move from records) | students list/profile under dean |
| `src/pages/dean/DeanCurricula.tsx` (move from records/Curricula.tsx) | curricula/offerings under dean |
| `src/pages/dean/ActivityLog.tsx` (extract from RecordsAdmin) | audit log |
| `src/pages/student/StudentPrint.tsx` (modify) | Pre-enrollment form layout |
| `src/firebase/app.ts` (create) | Firebase init from `VITE_FIREBASE_*` env |
| `src/firebase/sync.ts` (create) | `diffWrites` (pure) + `applyWrites` + `subscribe` |
| `src/firebase/sync.test.ts` (create) | diff tests |
| `src/firebase/auth.ts` (create) | sign in/up/out, load user role |
| `src/pages/SignIn.tsx` (modify) | email/password, student sign-up, demo mode |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` (create) | Firebase config |
| `tests/rules/firestore.rules.test.ts` (create) | security-rules tests on the emulator |
| `docs/paper-changes.md` (create) | change list for Chapters I–III |

---

### Task 1: UW replaces AW; DRP label

**Files:** Modify `src/domain/types.ts`, `src/domain/rules.ts`, `src/domain/advising.ts`, `src/data/seed.ts`, `src/components/CurriculumLedger.tsx`, `src/pages/student/StudentOverview.tsx`, `src/domain/assistant.ts`. Test: `src/domain/rules.test.ts`, `src/domain/advising.test.ts`.

**Interfaces:**
- Produces: `RecordResult` union member `{ kind: 'UW' }` (replaces `{ kind: 'AW' }`); `resultText` returns `'UW'` and `'DRP'`.

- [ ] **Step 1: Write failing tests** — in `src/domain/rules.test.ts` add:

```ts
it('UW is a non-pass that can be retaken when offered', () => {
  const s = seedStudents().find((x) => x.id === 's-dominic')!
  const ev = evaluateStudent(s, new Set(seedOfferings()), [])
  const cs121 = Object.values(ev.subjects).find((x) => x.subject.code === 'CS 121')!
  expect(cs121.status).toBe('failed')
  expect(cs121.reason).toContain('Unauthorized withdrawal (UW)')
})

it('labels remarks as UW and DRP', () => {
  expect(resultText({ id: 'x', subjectId: 'y', term: { ay: '2025–2026', sem: 1 }, result: { kind: 'UW' } })).toBe('UW')
  expect(resultText({ id: 'x', subjectId: 'y', term: { ay: '2025–2026', sem: 1 }, result: { kind: 'Dropped' } })).toBe('DRP')
})
```

In `src/domain/advising.test.ts` replace the `'AW and Dropped are not completed and not addable'` test with:

```ts
it('UW is treated as failed; DRP stays not completed', () => {
  const vs = loadSubjectView(ev('s-dominic'), new Set(), new Set())
  expect(vs[sid(BSCS_2018, 'CS 121')].state).toMatch(/available|failed/)
  expect(vs[sid(BSCS_2018, 'CS 121')].reason).toContain('UW')
  expect(vs[sid(BSCS_2018, 'CS ELEC 2')]).toMatchObject({ state: 'notCompleted', addable: false, reason: 'DRP · not completed' })
  expect(vs[sid(BSCS_2018, 'CS ELEC 3')].reason).toContain('CS ELEC 2 dropped')
})
```

- [ ] **Step 2: Run** `npm test` — expect the new tests to FAIL (`kind: 'UW'` not assignable / status `notCompletedReview`).

- [ ] **Step 3: Implement**
  - `types.ts`: `| { kind: 'AW' }` → `| { kind: 'UW' }`; update the comment on `blockCause` ("failed, INC, UW, DRP, unvalidated credit").
  - `rules.ts` `outcomeOf`: `case 'UW': return 'failed'`. `resultText`: `case 'UW': return 'UW'`, `case 'Dropped': return 'DRP'`. In the `'failed'` branch build the reason as:

```ts
const uw = rs.latest?.result.kind === 'UW'
const head = uw ? 'Unauthorized withdrawal (UW).' : `Final grade ${g}, below the passing grade of ${PASSING_GRADE}.`
reason: `${head} ${canRetake && offered ? 'Offered for retake this semester.' : canRetake ? 'Not offered for retake this semester.' : ''}`.trim(),
```
    and the `notCompleted` reason → `'Dropped (DRP). Does not satisfy a prerequisite.'`; dependency text at line ~202 → `` `${subjectName(s)}: DRP, not completed` ``.
  - `advising.ts` `loadSubjectView`: retake reason → `` x.status === 'failed' ? `Retake · ${x.finalGrade ?? 'UW'}` : '' ``; failed-not-offered reason → `` `Failed · ${x.finalGrade ?? 'UW'} · not offered for retake this term` ``; `notCompleted` reason → `'DRP · not completed'`; `prerequisiteReason` label for failed with no grade → `` `${p.subject.code} UW` `` when `p.finalGrade === undefined`.
  - `seed.ts`: `'CS 121': { kind: 'UW' }`; remarks string → `'Retake CS 121 (UW). CS ELEC 3 stays blocked until CS ELEC 2 is completed.'`.
  - `CurriculumLedger.tsx` line 30: `r.kind === 'UW' ? 'UW'`.
  - `StudentOverview.tsx` `NOTE_FALLBACK`: `{ pending: 'INC', notCompleted: 'DRP' }`.
  - `assistant.ts` line 57: replace "an AW or Dropped record" with "a DRP record".

- [ ] **Step 4: Run** `npm test && npx tsc -b` — all pass, no type errors.

- [ ] **Checkpoint:** `grep -rn "'AW'\|\bAW\b" src` returns nothing.

---

### Task 2: Remove the Registrar role; dean owns students, curricula, offerings, year standing

**Files:**
- Modify: `src/domain/types.ts`, `src/store/AppStore.tsx`, `src/App.tsx`, `src/layouts/AppShell.tsx`, `src/pages/SignIn.tsx`, `src/components/provenance.tsx`, `src/domain/assistant.ts`, `src/pages/student/SubjectLoadPanel.tsx`, `src/domain/advising.ts`, `src/data/seed.ts`, `src/pages/dean/DeanRecord.tsx`, `src/pages/dean/DeanQueue.tsx`
- Move: `src/pages/records/RecordsStudents.tsx` → `src/pages/dean/DeanStudents.tsx`; `RecordsStudent.tsx` → `src/pages/dean/DeanStudent.tsx`; `Curricula.tsx` → `src/pages/dean/DeanCurricula.tsx`; `ActivityLog` from `RecordsAdmin.tsx` → `src/pages/dean/ActivityLog.tsx`
- Delete: `src/pages/records/` (after moves), `RecordsEquivalencies`, `RecordsRequests`, correction sheet in `DeanRecord.tsx`
- Test: `src/domain/advising.test.ts`

**Interfaces:**
- Produces: `Role = 'student' | 'dean'`; `requestStatus(ev, rec)` (2 args, no correction flag); store `AppState` without `corrections`/`equivalencies`; action `setStanding` audited as dean; route prefix `/dean/...` for students (`/dean/students`, `/dean/students/:id/profile`), curricula (`/dean/curricula`), activity (`/dean/activity`).

- [ ] **Step 1: Update tests first** — in `advising.test.ts` change the `'reports Action needed…'` test to:

```ts
it('reports Action needed only when year standing is missing', () => {
  const s = initial()
  expect(requestStatus(ev('s-rommel'), s.advising['s-rommel'])).toBe('actionNeeded')
  expect(requestStatus(ev('s-jerome'), s.advising['s-jerome'])).toBe('submitted')
})
```
  and update the two other `requestStatus(…, false)` calls to two arguments. Add a reducer test:

```ts
it('dean sets year standing and it is audited as the dean', () => {
  const s = [{ type: 'setStanding', studentId: 's-rommel', year: 2 } as const].reduce(reducer, initial())
  expect(s.students.find((x) => x.id === 's-rommel')!.yearStanding).toBe(2)
  expect(s.audit[0]).toMatchObject({ role: 'dean', studentId: 's-rommel' })
})
```

- [ ] **Step 2: Run** `npm test` — FAIL (arity/type errors).

- [ ] **Step 3: Implement**
  - `types.ts`: `export type Role = 'student' | 'dean'`; delete `CorrectionRequest`; keep `Equivalency` type only if `rules.ts` still needs it as a parameter (it does — pass `[]`).
  - `advising.ts` `requestStatus(ev, rec)`: `if (ev.classification === 'undetermined') return 'actionNeeded'`.
  - `AppStore.tsx`: remove `corrections`, `equivalencies` from `AppState`, `initial()`, actions `requestCorrection`, `resolveCorrection`, `addEquivalency`, `removeEquivalency`, `setSection`, `setEntryAY` stays (dean). Every `log(state, 'registrar', …)` → `log(state, 'dean', …)`. `ACTOR = { student: 'Student', dean: 'Dean, ITE Department' }`. `evaluateStudent(s, off, [], curricula)`. Bump `STORAGE_KEY` to `'lc-ite-advising/v3'`.
  - `seed.ts`: delete `seedCorrections`, `seedEquivalencies`; audit seed entries with role `registrar` → `dean` and actor `'Dean, ITE Department'`; drop the "Requested a record correction" audit row.
  - Moves: `git`-less move with `mv`; inside moved files replace `/records` links with the dean routes above and page titles stay ("Students", "Curricula").
  - `App.tsx`: remove registrar routes and `RequireRole role="registrar"`; dean routes:

```tsx
<Route path="/dean" element={<DeanQueue />} />
<Route path="/dean/students/:id" element={<DeanRecord />} />
<Route path="/dean/students" element={<DeanStudents />} />
<Route path="/dean/students/:id/profile" element={<DeanStudent />} />
<Route path="/dean/curricula" element={<DeanCurricula />} />
<Route path="/dean/activity" element={<ActivityLog />} />
```
    `HOME = { student: '/student', dean: '/dean' }`.
  - `AppShell.tsx`: dean nav = Requests (`/dean`), Students (`/dean/students`), Curricula (`/dean/curricula`), Activity (`/dean/activity`); delete registrar label/nav.
  - `SignIn.tsx`: remove the registrar demo account.
  - `provenance.tsx`: remove `registrar` source; records show `{ icon: ArchiveIcon, label: 'Encoded by the dean' }` under key `record`; update callers.
  - `DeanRecord.tsx`: remove `CorrectionSheet` and its button; add a **Year standing** `FieldSelect` (options: Not set, 1st–4th Year) at the top of the workspace dispatching `setStanding`; the Approve/Confirm button is disabled with the existing validation message "Status and placement are not yet determined." while standing is missing.
  - `DeanQueue.tsx`: tab `registrar` → id `standing`, label `Needs year standing`; `Issues` drops the correction argument.
  - `SubjectLoadPanel.tsx`: action-needed text → "The dean needs to set your year standing before deciding your load."; drop `corrections` prop.
  - `assistant.ts`: every "Registrar … record" sentence → dean wording: "The dean records it during your evaluation." Referrals: "Please see the dean."; keep "Please ask the Registrar about enrollment, schedules or payments." (Registrar still exists as an office, just not a system role).

- [ ] **Step 4: Run** `npm test && npx tsc -b && npx oxlint` — pass.

- [ ] **Checkpoint:** `grep -rni "registrar" src` shows only the enrollment/schedule referral in `assistant.ts` and the sample report header (Task 4).

---

### Task 3: Grade-report parser (pure)

**Files:** Create `src/domain/gradeReport.ts`, `src/domain/gradeReport.test.ts`.

**Interfaces:**
- Consumes: `Curriculum`, `RecordEntry`, `RecordResult`, `TermRef` from `types.ts`.
- Produces:

```ts
export type ScannedResult = { kind: 'grade'; value: number } | { kind: 'INC' } | { kind: 'UW' } | { kind: 'Dropped' }
export interface ScannedRow { key: string; lineNo: number; raw: string; subjectId: string; term: TermRef | null; result: ScannedResult | null; confidence: 'high' | 'check'; issues: string[] }
export interface ScannedReport { rows: ScannedRow[]; unmatched: { lineNo: number; raw: string }[] }
export function parseGradeReport(text: string, curriculum: Curriculum): ScannedReport
export function mergeScannedRecords(existing: RecordEntry[], rows: { subjectId: string; term: TermRef; result: RecordResult }[]): { keep: RecordEntry[]; add: Omit<RecordEntry, 'id'>[]; replaced: RecordEntry[] }
```

- [ ] **Step 1: Write failing tests** `src/domain/gradeReport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BSCS_2025 } from '../data/curricula'
import { mergeScannedRecords, parseGradeReport } from './gradeReport'

const code = (id: string) => BSCS_2025.subjects.find((s) => s.id === id)!.code
const idOf = (c: string) => BSCS_2025.subjects.find((s) => s.code === c)!.id

const REPORT = `LAGUNA COLLEGE
OFFICE OF THE REGISTRAR
REPORT OF GRADES
FIRST SEMESTER, A.Y. 2025-2026
Subject Code Descriptive Title Units Final Grade Remarks
ITE C101 Introduction to Computing 3 88 PASSED
1TE C1O2a Computer Programming 1 3 74 FAILED
GE 1 Understanding the Self 3 INC INCOMPLETE
SECOND SEMESTER, A.Y. 2025-2026
ITE C103b Computer Programming 2 3 UW UNAUTHORIZED WITHDRAWAL
GE 4 Mathematics in the Modern World 3 DRP DROPPED
XYZ 999 Not in curriculum 3 90 PASSED
Registrar`

describe('parseGradeReport', () => {
  const r = parseGradeReport(REPORT, BSCS_2025)
  const row = (c: string) => r.rows.find((x) => x.subjectId === idOf(c))!

  it('reads codes, grades and remarks per term', () => {
    expect(row('ITE C101')).toMatchObject({ result: { kind: 'grade', value: 88 }, term: { ay: '2025–2026', sem: 1 }, confidence: 'high' })
    expect(row('GE 1').result).toEqual({ kind: 'INC' })
    expect(row('ITE C103b')).toMatchObject({ result: { kind: 'UW' }, term: { ay: '2025–2026', sem: 2 } })
    expect(row('GE 4').result).toEqual({ kind: 'Dropped' })
  })

  it('repairs common OCR confusions in codes (1/I, O/0)', () => {
    expect(row('ITE C102a').result).toEqual({ kind: 'grade', value: 74 })
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

  it('refuses an ambiguous fuzzy match instead of guessing', () => {
    // "ITE C102" is one edit away from both ITE C102a and ITE C102b.
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE C102 Computer Programming 3 80', BSCS_2025)
    expect(x.rows).toHaveLength(0)
    expect(x.unmatched).toHaveLength(1)
  })

  it('flags duplicate subjects in the same term', () => {
    const x = parseGradeReport('FIRST SEMESTER, A.Y. 2025-2026\nITE C101 Intro 3 88\nITE C101 Intro 3 90', BSCS_2025)
    expect(x.rows.every((r) => r.confidence === 'check' && r.issues.includes('Listed twice'))).toBe(true)
  })

  it('returns nothing for empty or garbage text', () => {
    expect(parseGradeReport('', BSCS_2025)).toEqual({ rows: [], unmatched: [] })
    expect(parseGradeReport('~~ ## ..', BSCS_2025).rows).toEqual([])
  })
})

describe('mergeScannedRecords', () => {
  const t = { ay: '2025–2026', sem: 1 as const }
  const existing = [{ id: 'r1', subjectId: idOf('ITE C101'), term: t, result: { kind: 'grade' as const, value: 70 } }]

  it('replaces the same subject in the same term instead of duplicating', () => {
    const m = mergeScannedRecords(existing, [{ subjectId: idOf('ITE C101'), term: t, result: { kind: 'grade', value: 88 } }])
    expect(m.replaced.map((r) => r.id)).toEqual(['r1'])
    expect(m.keep).toEqual([])
    expect(m.add).toHaveLength(1)
  })

  it('keeps a different term as a separate attempt', () => {
    const m = mergeScannedRecords(existing, [{ subjectId: idOf('ITE C101'), term: { ay: '2026–2027', sem: 1 }, result: { kind: 'grade', value: 88 } }])
    expect(m.keep).toHaveLength(1)
    expect(m.replaced).toEqual([])
  })
})
void code
```

  (Before running, confirm the fixture codes exist: `grep -n "ITE C101\|ITE C102a\|ITE C102b\|ITE C103b\|'GE 1'\|'GE 4'" src/data/curricula.ts`. If a code is absent from `BSCS_2025`, swap in an existing code of the same shape and keep the test intent.)

- [ ] **Step 2: Run** `npx vitest run src/domain/gradeReport.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement** `src/domain/gradeReport.ts`:

```ts
/**
 * Turns OCR text of a printed Report of Grades into reviewable rows.
 * Codes are matched only against the student's own curriculum, so OCR noise
 * can be repaired without guessing outside it. Nothing here is saved; the dean
 * reviews every row first.
 */
import type { Curriculum, RecordEntry, RecordResult, Semester, TermRef } from './types'

export type ScannedResult = { kind: 'grade'; value: number } | { kind: 'INC' } | { kind: 'UW' } | { kind: 'Dropped' }

export interface ScannedRow {
  key: string
  lineNo: number
  raw: string
  subjectId: string
  term: TermRef | null
  result: ScannedResult | null
  confidence: 'high' | 'check'
  issues: string[]
}

export interface ScannedReport {
  rows: ScannedRow[]
  unmatched: { lineNo: number; raw: string }[]
}

/** Fold characters OCR commonly confuses so "1TE C1O2a" compares equal to "ITE C102a". */
export function foldCode(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/0/g, 'O')
    .replace(/[1L]/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B')
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

const REMARK: Record<string, ScannedResult> = { INC: { kind: 'INC' }, UW: { kind: 'UW' }, DRP: { kind: 'Dropped' }, DROPPED: { kind: 'Dropped' } }

function readResult(tokens: string[]): ScannedResult | null {
  for (const t of tokens) {
    const r = REMARK[t.toUpperCase().replace(/[^A-Z]/g, '')]
    if (r) return r
    if (/^\d{2,3}(\.\d{1,2})?$/.test(t)) {
      const v = Number(t)
      if (v >= 50 && v <= 100) return { kind: 'grade', value: v }
    }
  }
  return null
}

function readTerm(line: string): TermRef | null {
  const u = line.toUpperCase()
  const sem: Semester | 'Summer' | null = /\b(FIRST|1ST)\s+SEM/.test(u) ? 1 : /\b(SECOND|2ND)\s+SEM/.test(u) ? 2 : /\bSUMMER\b/.test(u) ? 'Summer' : null
  const ay = u.match(/(20\d{2})\s*[-–]\s*(20\d{2})/)
  return sem && ay ? { ay: `${ay[1]}–${ay[2]}`, sem } : null
}

function matchCode(tokens: string[], codes: { id: string; folded: string }[]): { id: string; used: number; exact: boolean } | 'ambiguous' | null {
  for (let k = Math.min(4, tokens.length); k >= 1; k--) {
    const f = foldCode(tokens.slice(0, k).join(''))
    const hit = codes.find((c) => c.folded === f)
    if (hit) return { id: hit.id, used: k, exact: true }
  }
  for (let k = Math.min(4, tokens.length); k >= 2; k--) {
    const f = foldCode(tokens.slice(0, k).join(''))
    if (f.length < 4) continue
    const near = codes.filter((c) => distance(c.folded, f) === 1)
    if (near.length === 1) return { id: near[0].id, used: k, exact: false }
    if (near.length > 1) return 'ambiguous'
  }
  return null
}

export function parseGradeReport(text: string, curriculum: Curriculum): ScannedReport {
  const codes = curriculum.subjects.map((s) => ({ id: s.id, folded: foldCode(s.code) }))
  const rows: ScannedRow[] = []
  const unmatched: ScannedReport['unmatched'] = []
  let term: TermRef | null = null

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const raw = rawLine.trim()
    if (!raw) return
    const t = readTerm(raw)
    if (t) {
      term = t
      return
    }
    const tokens = raw.split(/\s+/)
    const m = matchCode(tokens, codes)
    if (!m || m === 'ambiguous') {
      if (readResult(tokens)) unmatched.push({ lineNo: i + 1, raw })
      return
    }
    const result = readResult(tokens.slice(m.used))
    const issues: string[] = []
    if (!m.exact) issues.push('Code partly read')
    if (!result) issues.push('Grade not read')
    if (!term) issues.push('Term not read')
    rows.push({ key: `${i + 1}`, lineNo: i + 1, raw, subjectId: m.id, term, result, confidence: issues.length ? 'check' : 'high', issues })
  })

  const seen = new Map<string, ScannedRow[]>()
  for (const r of rows) {
    const k = `${r.subjectId}|${r.term?.ay}|${r.term?.sem}`
    seen.set(k, [...(seen.get(k) ?? []), r])
  }
  for (const group of seen.values())
    if (group.length > 1)
      for (const r of group) {
        r.issues.push('Listed twice')
        r.confidence = 'check'
      }

  return { rows, unmatched }
}

const sameTerm = (a: TermRef, b: TermRef) => a.ay === b.ay && a.sem === b.sem

/** Same subject + same term replaces the existing entry; anything else is kept. */
export function mergeScannedRecords(
  existing: RecordEntry[],
  rows: { subjectId: string; term: TermRef; result: RecordResult }[],
): { keep: RecordEntry[]; add: Omit<RecordEntry, 'id'>[]; replaced: RecordEntry[] } {
  const replaced = existing.filter((e) => rows.some((r) => r.subjectId === e.subjectId && sameTerm(r.term, e.term)))
  return { keep: existing.filter((e) => !replaced.includes(e)), add: rows.map((r) => ({ subjectId: r.subjectId, term: r.term, result: r.result })), replaced }
}
```

  Remove the stray `void code` line and the unused `code` helper from the test once green.

- [ ] **Step 4: Run** `npx vitest run src/domain/gradeReport.test.ts` — PASS. Then `npm test` — all pass.

---

### Task 4: Sample Report of Grades (printable, synthetic)

**Files:** Create `src/pages/dean/SampleReport.tsx`; modify `src/App.tsx` (route `/dean/sample-report/:id`, dean-only, outside `AppShell` like `/student/print`), `src/pages/dean/DeanRecord.tsx` (link "Sample report" in the scan sheet footer, Task 5).

**Interfaces:** Consumes `useStore().state.students`, `useStore().curricula`, `resultText`, `termLabel`. Produces route `/dean/sample-report/:id`.

- [ ] **Step 1: Implement** — layout (A4, black on white, Geist, print CSS already in `index.css` via `.no-print`):

```tsx
import { PrinterIcon } from '@phosphor-icons/react'
import { useParams } from 'react-router-dom'
import { resultText } from '../../domain/rules'
import { termLabel } from '../../domain/term'
import { useStore } from '../../store/AppStore'

const REMARK: Record<string, string> = { UW: 'UNAUTHORIZED WITHDRAWAL', DRP: 'DROPPED', INC: 'INCOMPLETE' }

/** Synthetic Report of Grades used to test and demonstrate scanning. Not an official document. */
export function SampleReport() {
  const { id } = useParams()
  const { state, curricula } = useStore()
  const s = state.students.find((x) => x.id === id)
  if (!s) return null
  const cur = curricula.find((c) => c.program === s.program && c.version === s.curriculumVersion)!
  const byTerm = new Map<string, typeof s.records>()
  for (const r of s.records) byTerm.set(termLabel(r.term), [...(byTerm.get(termLabel(r.term)) ?? []), r])

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex justify-end">
        <button className="btn btn-primary" onClick={() => window.print()}><PrinterIcon size={18} /> Print</button>
      </div>
      <article className="bg-white px-10 py-10 font-[Geist_Variable] text-[13px] text-black">
        <header className="text-center">
          <img src="/laguna-college-seal.png" alt="" width={56} height={56} className="mx-auto h-14 w-14" />
          <div className="mt-2 text-base font-semibold tracking-wide">LAGUNA COLLEGE</div>
          <div>OFFICE OF THE REGISTRAR</div>
          <div className="mt-3 text-lg font-bold tracking-[0.2em]">REPORT OF GRADES</div>
          <div className="mt-1 text-[11px]">SAMPLE FOR TESTING · SYNTHETIC DATA · NOT AN OFFICIAL DOCUMENT</div>
        </header>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1">
          <div>Name: <b>{s.lastName.toUpperCase()}, {s.firstName.toUpperCase()}</b></div>
          <div>Student No.: <b>{s.studentNo}</b></div>
          <div>Program: <b>{s.program}</b></div>
          <div>Curriculum: <b>{s.curriculumVersion}</b></div>
        </dl>
        {[...byTerm].map(([term, recs]) => (
          <section key={term} className="mt-6 break-inside-avoid">
            <h2 className="font-bold uppercase">{term.replace('AY', 'A.Y.')}</h2>
            <table className="mt-1 w-full border-collapse">
              <thead><tr className="border-y border-black text-left"><th className="py-1">Subject Code</th><th>Descriptive Title</th><th className="text-right">Units</th><th className="text-right">Final Grade</th><th className="pl-4">Remarks</th></tr></thead>
              <tbody>
                {recs.map((r) => {
                  const sub = cur.subjects.find((x) => x.id === r.subjectId)!
                  const g = resultText(r)
                  const remark = REMARK[g] ?? (Number(g) >= 75 ? 'PASSED' : 'FAILED')
                  return (
                    <tr key={r.id}>
                      <td className="py-0.5 pr-4 whitespace-nowrap">{sub.code}</td>
                      <td>{sub.title}</td>
                      <td className="text-right">{sub.units}</td>
                      <td className="text-right">{g.replace(/^INC → /, '')}</td>
                      <td className="pl-4">{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ))}
        <footer className="mt-12 grid grid-cols-2 gap-8 text-center">
          <div><div className="border-t border-black pt-1">Prepared by</div></div>
          <div><div className="border-t border-black pt-1">University Registrar</div></div>
        </footer>
      </article>
    </div>
  )
}
```

  `termLabel` must output "First Semester, AY 2025–2026"; the `replace('AY','A.Y.')` yields the heading form the parser reads. Verify with `grep -n "export function termLabel" -A8 src/domain/term.ts` and adjust the heading string so it contains `FIRST SEMESTER` / `SECOND SEMESTER` / `SUMMER` and `20xx-20xx`.

- [ ] **Step 2: Verify the round trip in a test** — append to `gradeReport.test.ts`:

```ts
it('parses the sample report text for a seeded student', () => {
  // Same text the SampleReport renders, line by line.
  const s = seedStudents().find((x) => x.id === 's-jerome')!
  const lines = [...new Set(s.records.map((r) => termLabel(r.term)))].flatMap((t) => [
    t.toUpperCase().replace('AY', 'A.Y.'),
    ...s.records.filter((r) => termLabel(r.term) === t).map((r) => {
      const sub = BSCS_2025.subjects.find((x) => x.id === r.subjectId)!
      return `${sub.code} ${sub.title} ${sub.units} ${resultText(r)}`
    }),
  ])
  const parsed = parseGradeReport(lines.join('\n'), BSCS_2025)
  expect(parsed.rows).toHaveLength(s.records.length)
  expect(parsed.rows.every((r) => r.confidence === 'high')).toBe(true)
})
```
  (imports: `seedStudents` from `../data/seed`, `resultText` from `./rules`, `termLabel` from `./term`). If Jerome is not on `BSCS_2025`, use a seeded student who is.

- [ ] **Step 3: Run** `npm test` — PASS.

---

### Task 5: Scan grade record (capture → OCR → review → save)

**Files:** Create `src/scan/ocr.ts`, `src/pages/dean/ScanGrades.tsx`; modify `src/store/AppStore.tsx` (action `saveScannedRecords`), `src/pages/dean/DeanRecord.tsx` (button), `package.json` (`tesseract.js`). Test: `src/domain/advising.test.ts` (reducer).

**Interfaces:**
- Consumes: `parseGradeReport`, `mergeScannedRecords`, `ScannedRow` (Task 3).
- Produces: `recognise(file: File, onProgress: (p: number) => void, signal: AbortSignal): Promise<string>`; action `{ type: 'saveScannedRecords'; studentId: string; rows: { subjectId: string; term: TermRef; result: RecordResult }[] }`.

- [ ] **Step 1: Failing reducer test**:

```ts
it('saves scanned grades, replacing the same subject and term', () => {
  const st = initial().students.find((x) => x.id === 's-jerome')!
  const first = st.records[0]
  const s = reducer(initial(), { type: 'saveScannedRecords', studentId: 's-jerome', rows: [{ subjectId: first.subjectId, term: first.term, result: { kind: 'grade', value: 99 } }] })
  const recs = s.students.find((x) => x.id === 's-jerome')!.records
  expect(recs.filter((r) => r.subjectId === first.subjectId && r.term.ay === first.term.ay && r.term.sem === first.term.sem)).toHaveLength(1)
  expect(recs.length).toBe(st.records.length)
  expect(s.audit[0].action).toBe('Encoded 1 grade from a scanned record')
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Reducer** in `AppStore.tsx`:

```ts
case 'saveScannedRecords': {
  const n = a.rows.length
  return {
    ...state,
    students: patchStudent(state, a.studentId, (s) => {
      const m = mergeScannedRecords(s.records, a.rows)
      return { ...s, records: [...m.keep, ...m.add.map((e) => ({ ...e, id: uid() }))] }
    }),
    audit: log(state, 'dean', `Encoded ${n} grade${n === 1 ? '' : 's'} from a scanned record`, a.studentId),
  }
}
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Install OCR** — `npm install tesseract.js` (record the installed version in the paper-changes doc, Task 10).

- [ ] **Step 6: `src/scan/ocr.ts`**:

```ts
/** In-browser OCR. The image never leaves the device; only language data is downloaded once. */
export async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.filter = 'grayscale(1) contrast(1.4)'
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return c
}

export async function recognise(file: File, onProgress: (p: number) => void, signal: AbortSignal): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => m.status === 'recognizing text' && onProgress(m.progress),
  })
  const stop = () => void worker.terminate()
  signal.addEventListener('abort', stop)
  try {
    const { data } = await worker.recognize(await prepare(file))
    return data.text
  } finally {
    signal.removeEventListener('abort', stop)
    await worker.terminate().catch(() => {})
  }
}
```

- [ ] **Step 7: `src/pages/dean/ScanGrades.tsx`** — a `Sheet` (existing component) with three states:
  1. **Pick**: `<input type="file" accept="image/*" capture="environment" multiple>` styled as `btn btn-primary` "Take photo or choose file"; link "Sample report" → `/dean/sample-report/:id` (new tab).
  2. **Reading**: progress bar (`role="progressbar"` with `aria-valuenow`), file name, `Cancel` (aborts the `AbortController`). Pages are recognised in turn; texts are joined with `\n`.
  3. **Review**: two columns at `lg` (`grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`), stacked below. Left: object-URL preview `<img>` (revoked on close) with zoom toggle. Right: table rows from `parseGradeReport(text, ev.curriculum)` with editable cells: Subject (`select` of curriculum codes), Term (`select` of AY × sem, built from the student's entry AY up to `CURRENT_TERM`), Grade (`input` accepting 50–100 or INC/UW/DRP), remove button. Rows with `confidence === 'check'` get `bg-act-tint` and their `issues` joined under the code. Rows replacing an existing record show "Replaces {old}" in `text-ink-3`. "Add row" appends an empty row. Unmatched lines listed below in a `details` "Not recognised (n)". Empty parse → message "No subjects recognised" + "Add row".
  4. **Save** button disabled while any row lacks subject, term or a valid grade; on click dispatch `saveScannedRecords` with rows converted (`INC` → `{kind:'INC'}`, `UW` → `{kind:'UW'}`, `DRP` → `{kind:'Dropped'}`, number → `{kind:'grade', value}`), close, and the workspace recomputes.
  - Grade input validation helper (export it and unit-test it in `gradeReport.test.ts`):

```ts
export function readGradeInput(v: string): RecordResult | null {
  const t = v.trim().toUpperCase()
  if (t === 'INC') return { kind: 'INC' }
  if (t === 'UW') return { kind: 'UW' }
  if (t === 'DRP') return { kind: 'Dropped' }
  if (!/^\d{2,3}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n >= 50 && n <= 100 ? { kind: 'grade', value: n } : null
}
```
    Tests: `readGradeInput('88')` → grade 88; `'inc'` → INC; `'4'` → null; `'101'` → null; `'abc'` → null. Put `readGradeInput` in `src/domain/gradeReport.ts`.

- [ ] **Step 8: Wire** — in `DeanRecord.tsx` add a `btn btn-secondary` "Scan grade record" (icon `ScanIcon`) next to the year-standing control; disabled after the decision.

- [ ] **Step 9: Verify** `npm test && npx tsc -b && npm run build`. Manual: `npm run dev`, sign in as dean (demo), open Jerome, open the sample report in a new tab, screenshot it, upload the screenshot in the scan sheet → rows appear with high confidence → Save → workspace shows the grades.

---

### Task 6: Pre-enrollment form

**Files:** Modify `src/pages/student/StudentPrint.tsx`, `src/pages/student/SubjectLoadPanel.tsx` (button label).

- [ ] **Step 1: Implement** — keep data and route; change the document:
  - Header right block: title `PRE-ENROLLMENT FORM`, `termLabel(CURRENT_TERM)`.
  - Student block: Name, Student No., Program, Curriculum, Year standing, Classification.
  - Table: `Subject Code | Descriptive Title | Units`, total units row.
  - Dean's remarks if any.
  - Signature block, two columns: `Evaluated and approved by — Dean, ITE Department — {formatDateTime(d.at)}` and `Received by — Registrar`.
  - Remove the provisional-layout comment; replace with `/** Pre-enrollment form the student brings to the Registrar for scheduling. */`.
  - `SubjectLoadPanel`: footer button label `Print pre-enrollment form`.

- [ ] **Step 2: Verify** `npx tsc -b`; manual print preview as Liza (demo, already decided).

---

### Task 7: Firebase project, app config, SDK

**Files:** Create `src/firebase/app.ts`, `.env.local` (git-ignored), `.env.example`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`; modify `package.json`, `.gitignore`.

- [ ] **Step 1: Create the project** (Firebase MCP): `firebase_create_project` `{ project_id: 'lc-ite-advising', display_name: 'LC ITE Advising' }`; on "already exists" retry with `lc-ite-advising-<4 random digits>`. Then `firebase_update_environment` `{ active_project: <id>, project_dir: '/Users/zafbarnuevo/Desktop/capstone' }`.
- [ ] **Step 2: Web app + config**: `firebase_create_app` `{ platform: 'web', display_name: 'Advising web' }`; `firebase_get_sdk_config` `{ platform: 'web' }`.
- [ ] **Step 3: Init services**: `firebase_init` with `auth.providers.emailPassword = true` and `firestore = { location_id: 'asia-southeast1', rules_filename: 'firestore.rules' }` (rules content is written in Task 9; init with the deny-all placeholder `allow read, write: if false;`). Confirm `firebase.json` has `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }` and an `"emulators": { "firestore": { "port": 8080 }, "auth": { "port": 9099 } }` block (add it if missing).
- [ ] **Step 4: Env** — `.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```
  filled from Step 2; `.env.example` with the same keys and empty values; ensure `.gitignore` contains `.env.local`.
- [ ] **Step 5: SDK** — `npm install firebase`; `src/firebase/app.ts`:

```ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Live mode is available only when the Firebase web config is present. */
export const liveAvailable = Boolean(cfg.apiKey && cfg.projectId)

let app: FirebaseApp | null = null
export function firebase(): { auth: Auth; db: Firestore } {
  app ??= initializeApp(cfg)
  return { auth: getAuth(app), db: getFirestore(app) }
}
```
- [ ] **Step 6: Verify** `npx tsc -b && npm run build`.

---

### Task 8: Live data — auth, sign-up, sync, demo mode

**Files:** Create `src/firebase/sync.ts`, `src/firebase/sync.test.ts`, `src/firebase/auth.ts`; modify `src/store/AppStore.tsx`, `src/pages/SignIn.tsx`, `src/layouts/AppShell.tsx` (sign-out calls auth in live mode; "Demo" tag in demo mode).

**Interfaces:**
- Consumes: `AppState`, `reducer`, `Action` (store); `firebase()` (Task 7).
- Produces:

```ts
// sync.ts
export type Write =
  | { op: 'set'; path: string; data: unknown }
  | { op: 'add'; collection: 'audit'; data: unknown }
export function diffWrites(prev: AppState, next: AppState): Write[]
export async function applyWrites(writes: Write[]): Promise<void>
export function subscribe(who: { role: 'dean' } | { role: 'student'; studentId: string }, onPatch: (p: Partial<AppState>) => void): () => void
// auth.ts
export async function signInLive(email: string, password: string): Promise<Session>
export async function signUpStudent(input: { email: string; password: string; firstName: string; lastName: string; studentNo: string; program: Program; entryAY: string }): Promise<Session>
export async function signOutLive(): Promise<void>
export function watchSession(cb: (s: Session | null) => void): () => void
// store
type Mode = 'demo' | 'live'
// new actions: { type: 'hydrate'; patch: Partial<AppState> } | { type: 'setMode'; mode: Mode }
```

  Firestore layout (records embedded in the student doc — simpler rules, one read per student, far below the 1 MiB doc limit):
  `users/{uid}` `{ role, studentId }` · `students/{uid}` (Student incl. `records`) · `requests/{studentId}` (AdvisingRecord + `studentId`) · `config/offerings` `{ subjectIds }` · `config/prerequisites` `{ overrides }` · `audit/{auto}` (AuditEntry + `actorUid`).

- [ ] **Step 1: Failing tests** `src/firebase/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { initial, reducer } from '../store/AppStore'
import { diffWrites } from './sync'

describe('diffWrites', () => {
  it('writes only the changed student', () => {
    const a = initial()
    const b = reducer(a, { type: 'setStanding', studentId: 's-rommel', year: 2 })
    const w = diffWrites(a, b)
    expect(w.filter((x) => x.op === 'set').map((x) => (x as { path: string }).path)).toEqual(['students/s-rommel'])
    expect(w.filter((x) => x.op === 'add')).toHaveLength(1)
  })

  it('writes the request doc for advising changes', () => {
    const a = initial()
    const b = reducer(a, { type: 'requestLoad', studentId: 's-bea' })
    expect(diffWrites(a, b).some((x) => x.op === 'set' && x.path === 'requests/s-bea')).toBe(true)
  })

  it('writes offerings and prerequisite config', () => {
    const a = initial()
    const b = reducer(a, { type: 'toggleOffering', subjectId: a.offerings[0] })
    expect(diffWrites(a, b).some((x) => x.op === 'set' && x.path === 'config/offerings')).toBe(true)
  })

  it('produces no writes for hydrate or session changes', () => {
    const a = initial()
    expect(diffWrites(a, reducer(a, { type: 'hydrate', patch: { students: [...a.students] } }))).toEqual([])
    expect(diffWrites(a, reducer(a, { type: 'signOut' }))).toEqual([])
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement**
  - Store: add `mode: Mode` and `hydrated: boolean` to `AppState` (demo default `mode: 'demo'`); actions `hydrate` (merges patch, sets `hydrated: true`, **marks the state with a module-level `WeakSet` of hydrated states** so `diffWrites` can skip it) and `setMode`.
  - `sync.ts` `diffWrites(prev, next)`:

```ts
const HYDRATED = new WeakSet<AppState>()
export const markHydrated = (s: AppState) => (HYDRATED.add(s), s)

export function diffWrites(prev: AppState, next: AppState): Write[] {
  if (HYDRATED.has(next)) return []
  const w: Write[] = []
  const before = new Map(prev.students.map((s) => [s.id, s]))
  for (const s of next.students) if (before.get(s.id) !== s) w.push({ op: 'set', path: `students/${s.id}`, data: s })
  for (const [id, r] of Object.entries(next.advising)) if (prev.advising[id] !== r) w.push({ op: 'set', path: `requests/${id}`, data: { ...r, studentId: id } })
  if (prev.offerings !== next.offerings) w.push({ op: 'set', path: 'config/offerings', data: { subjectIds: next.offerings } })
  if (prev.prereqOverrides !== next.prereqOverrides) w.push({ op: 'set', path: 'config/prerequisites', data: { overrides: next.prereqOverrides } })
  const known = new Set(prev.audit.map((a) => a.id))
  for (const a of next.audit) if (!known.has(a.id)) w.push({ op: 'add', collection: 'audit', data: a })
  return w
}
```
    The reducer's `hydrate` case returns `markHydrated({ ...state, ...a.patch, hydrated: true })` (import `markHydrated` from `../firebase/sync`; `sync.ts` must not import React).
  - `applyWrites`: `writeBatch(db)`; `set` → `batch.set(doc(db, path), stripUndefined(data))`; `add` → `batch.set(doc(collection(db, 'audit')), { ...data, actorUid: auth.currentUser!.uid })`; `commit()`. `stripUndefined = (x) => JSON.parse(JSON.stringify(x))`.
  - `subscribe`: dean → `onSnapshot` on `collection('students')`, `collection('requests')`, `doc('config/offerings')`, `doc('config/prerequisites')`, `query(collection('audit'), orderBy('at','desc'), limit(200))`; student → `doc('students/{id}')`, `doc('requests/{id}')`, both config docs. Each snapshot calls `onPatch` with the slice (`students`, `advising` keyed by `studentId`, `offerings`, `prereqOverrides`, `audit`). If `config/offerings` does not exist and role is dean, write `seedOfferings()` once.
  - Store provider: keep `useReducer`; wrap dispatch:

```ts
const ref = useRef(state); ref.current = state
const send = useCallback((a: Action) => {
  if (ref.current.mode === 'live') {
    const next = reducer(ref.current, a)
    const w = diffWrites(ref.current, next)
    if (w.length) applyWrites(w).catch((e) => dispatch({ type: 'hydrate', patch: { syncError: String(e) } }))
  }
  dispatch(a)
}, [])
```
    Expose `send` as `dispatch` in context. Add optional `syncError?: string` to `AppState`; `AppShell` shows it in a dismissible `role="alert"` bar ("Couldn’t save. Check your connection.").
    Persist to localStorage **only in demo mode**. In live mode, `initial()` data is replaced by an empty live state: `{ ...initial(), students: [], advising: {}, audit: [], offerings: [], prereqOverrides: {}, mode: 'live', hydrated: false }`; pages render a skeleton while `!hydrated`.
  - `auth.ts`: `signInLive` → `signInWithEmailAndPassword`, then read `users/{uid}`; `role` from that doc, `studentId = uid` for students; dean name `'Dean, ITE Department'`, student name from `students/{uid}`. `signUpStudent` → `createUserWithEmailAndPassword`, then batch: `users/{uid}` `{ role: 'student', studentId: uid }` and `students/{uid}` `{ id: uid, studentNo, firstName, lastName, program, entryAY, curriculumVersion: curriculumVersionForEntryAY(entryAY), yearStanding: null, transferee: false, records: [], ownerUid: uid }`. Map Firebase errors to short messages: `auth/invalid-credential` → "Wrong email or password", `auth/email-already-in-use` → "An account already uses this email", `auth/weak-password` → "Use at least 6 characters", network → "No connection".
  - `SignIn.tsx`: when `liveAvailable`, show email/password form (primary) with a "Create student account" toggle (fields: first name, last name, student number, program select BSCS/BSIT, entry AY select from 2018–2019 to current); below, a quiet `details` "Demo accounts (offline)" containing the existing demo buttons, which `setMode('demo')` and sign in locally. When not `liveAvailable`, show demo accounts only.
  - App start: `watchSession` restores a live session; on session → `setMode('live')`, `signIn`, `subscribe(...)` → `hydrate`; on sign-out → unsubscribe, `signOutLive()`, reset to demo state.

- [ ] **Step 4: Run** `npm test && npx tsc -b && npm run build` — PASS.

- [ ] **Step 5: Dean account** — create the dean user in the Firebase console (Authentication → Add user), then in Firestore create `users/{that uid}` = `{ role: 'dean' }`. Give the user the exact steps; do not create credentials yourself.

---

### Task 9: Firestore security rules + emulator tests

**Files:** Create/replace `firestore.rules`; create `tests/rules/firestore.rules.test.ts`, `vitest.rules.config.ts`; modify `package.json` (script `test:rules`, devDependency `@firebase/rules-unit-testing`).

- [ ] **Step 1: Failing tests** `tests/rules/firestore.rules.test.ts`:

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const student = { id: 'stu1', studentNo: '2025-0001', firstName: 'Test', lastName: 'Student', program: 'BSCS', entryAY: '2025–2026', curriculumVersion: '2025–2026', yearStanding: null, transferee: false, records: [], ownerUid: 'stu1' }

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

describe('students', () => {
  it('a student creates their own empty profile', async () => {
    await assertSucceeds(setDoc(doc(as('stu1'), 'users/stu1'), { role: 'student', studentId: 'stu1' }))
    await assertSucceeds(setDoc(doc(as('stu1'), 'students/stu1'), student))
  })
  it('a student cannot sign up as dean', () => assertFails(setDoc(doc(as('stu1'), 'users/stu1'), { role: 'dean', studentId: 'stu1' })))
  it('a student cannot create a profile with grades or standing', async () => {
    await assertFails(setDoc(doc(as('stu1'), 'students/stu1'), { ...student, yearStanding: 4 }))
    await assertFails(setDoc(doc(as('stu1'), 'students/stu1'), { ...student, records: [{ id: 'x' }] }))
  })
  it('a student cannot edit their record after creation', () => assertFails(updateDoc(doc(as('stu2'), 'students/stu2'), { yearStanding: 4 })))
  it('a student cannot read another student', () => assertFails(getDoc(doc(as('stu1'), 'students/stu2'))))
  it('the dean reads and edits any student', async () => {
    await assertSucceeds(getDoc(doc(as('dean1'), 'students/stu2')))
    await assertSucceeds(updateDoc(doc(as('dean1'), 'students/stu2'), { yearStanding: 2 }))
  })
})

describe('requests', () => {
  const req = { studentId: 'stu2', requestedAt: '2026-10-06T00:00:00Z', removed: [], remarks: '', caseDecisions: [] }
  it('a student creates their own request', () => assertSucceeds(setDoc(doc(as('stu2'), 'requests/stu2'), req)))
  it('a student cannot create a request with a decision', () =>
    assertFails(setDoc(doc(as('stu2'), 'requests/stu2'), { ...req, decision: { kind: 'approved', at: 'x', subjectIds: [], remarks: '' } })))
  it('a student cannot request for someone else', () => assertFails(setDoc(doc(as('stu1'), 'requests/stu2'), req)))
  it('a student cannot change a request', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertFails(updateDoc(doc(as('stu2'), 'requests/stu2'), { remarks: 'x' }))
  })
  it('the dean decides', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'requests/stu2'), req))
    await assertSucceeds(updateDoc(doc(as('dean1'), 'requests/stu2'), { decision: { kind: 'approved', at: 'x', subjectIds: [], remarks: '' } }))
  })
})

describe('config and audit', () => {
  it('students read config, only the dean writes it', async () => {
    await assertSucceeds(getDoc(doc(as('stu2'), 'config/offerings')))
    await assertFails(setDoc(doc(as('stu2'), 'config/offerings'), { subjectIds: [] }))
    await assertSucceeds(setDoc(doc(as('dean1'), 'config/offerings'), { subjectIds: [] }))
  })
  it('audit entries carry the writer and only the dean reads them', async () => {
    await assertSucceeds(setDoc(doc(as('stu2'), 'audit/a1'), { action: 'Requested', actorUid: 'stu2' }))
    await assertFails(setDoc(doc(as('stu2'), 'audit/a2'), { action: 'Requested', actorUid: 'dean1' }))
    await assertFails(getDoc(doc(as('stu2'), 'audit/a1')))
    await assertSucceeds(getDoc(doc(as('dean1'), 'audit/a1')))
  })
})
```

  `vitest.rules.config.ts`: `export default defineConfig({ test: { include: ['tests/rules/**/*.test.ts'], environment: 'node' } })`. Exclude `tests/rules` from the default `vitest` run (add `test: { exclude: ['tests/rules/**', 'node_modules/**'] }` to `vite.config.ts`). Script: `"test:rules": "firebase emulators:exec --only firestore --project demo-advising 'vitest run -c vitest.rules.config.ts'"`.

- [ ] **Step 2: Run** `npm i -D @firebase/rules-unit-testing firebase-tools && npm run test:rules` — FAIL (deny-all rules).

- [ ] **Step 3: Write** `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function self(id) { return signedIn() && request.auth.uid == id; }
    function dean() {
      return signedIn() && exists(/databases/$(db)/documents/users/$(request.auth.uid))
        && get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == 'dean';
    }

    match /users/{uid} {
      allow read: if self(uid) || dean();
      allow create: if self(uid)
        && request.resource.data.keys().hasOnly(['role', 'studentId'])
        && request.resource.data.role == 'student'
        && request.resource.data.studentId == uid;
      allow update, delete: if false;
    }

    match /students/{id} {
      allow read: if self(id) || dean();
      allow create: if self(id)
        && request.resource.data.ownerUid == id
        && request.resource.data.records.size() == 0
        && request.resource.data.yearStanding == null;
      allow update: if dean();
      allow delete: if false;
    }

    match /requests/{id} {
      allow read: if self(id) || dean();
      allow create: if self(id)
        && request.resource.data.studentId == id
        && request.resource.data.keys().hasOnly(['studentId', 'requestedAt', 'removed', 'remarks', 'caseDecisions']);
      allow update: if dean();
      allow delete: if false;
    }

    match /config/{name} {
      allow read: if signedIn();
      allow write: if dean();
    }

    match /audit/{id} {
      allow read: if dean();
      allow create: if signedIn() && request.resource.data.actorUid == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

  The student's first request write from `diffWrites` must match `hasOnly(...)`: in `applyWrites`, `stripUndefined` drops `added`, `reviewStartedAt`, `decision` when absent; confirm the `requestLoad` reducer output has exactly `studentId, requestedAt, removed, remarks, caseDecisions` (add `studentId` in `diffWrites`, already done in Task 8).

- [ ] **Step 4: Run** `npm run test:rules` — PASS.
- [ ] **Step 5: Deploy rules** — Firebase MCP `firebase_deploy` `{ only: 'firestore' }`; check with `firebase_deploy_status`; read back with `firebase_get_security_rules` `{ type: 'firestore' }`.

---

### Task 10: End-to-end check and documentation

**Files:** Create `docs/paper-changes.md`; modify `README.md`, `PRODUCT.md`, `DESIGN.md` (only sections that mention the Registrar role, AW, or Gemini).

- [ ] **Step 1: Full verification** — `npm test && npm run test:rules && npx tsc -b && npx oxlint && npm run build`.
- [ ] **Step 2: Live smoke test** (`npm run dev`):
  1. Create a student account → request a load → status Submitted.
  2. Sign in as the dean (console-created) → request appears → open (student sees Under review) → set year standing → scan a printed/screenshot sample report → review → save → suggested load appears → approve.
  3. Student sees Approved + prints the pre-enrollment form.
  4. Demo mode still works offline (disable network in devtools, open demo accounts).
- [ ] **Step 3: `docs/paper-changes.md`** — table `Section | Was | Now | Reason`, covering: roles (3 → 2), Registrar encoding replaced by dean scanning + review, OCR (tesseract.js, in-browser, image not stored), UW replaces AW (non-pass, retakeable), DRP label, year standing set by dean, corrections and equivalencies removed, transferee crediting out of scope, student sign-up and request step, pre-enrollment form output, backend = Firebase Spark (Auth + Firestore), no Cloud Functions/Gemini (assistant is rule-based), security rules summary, offline demo mode, evaluation additions (OCR accuracy per row on N sample reports).
- [ ] **Step 4:** Update `README.md` run instructions (`.env.local`, `npm run test:rules`, dean account steps) and remove Registrar references from `PRODUCT.md` / `DESIGN.md`.
