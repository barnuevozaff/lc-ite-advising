# Dean-only evaluation with grade-record scanning, on Firebase (Spark)

Date: 2026-10-06 · Status: draft for review

## Problem

An irregular student leaves the Registrar with a **pre-form** and goes to the dean
for evaluation. The dean currently looks up the student's paper records one by
one to see which subjects were taken and passed, and, for each subject to add,
whether its prerequisites are met. This is slow and error-prone.

The system shortens this: the dean scans the student's grade record, the system
reads it, shows the standing of every curriculum subject, and suggests a load of
subjects whose prerequisites are complete. The dean's decision becomes the
pre-form the student returns to the Registrar for scheduling (the Registrar's
existing scheduling system is out of scope).

## Decisions

| Topic | Decision |
|---|---|
| Roles | **Student** and **Dean** only. Registrar role removed. |
| Start of the flow | Student signs up and requests an evaluation (existing request flow kept). |
| Grade input | Dean scans or photographs the printed grade record; **OCR** reads it in the browser (Tesseract.js, no AI model, nothing sent to a third party). Dean reviews and corrects before saving. Manual entry remains as fallback. |
| Photo | Used only during review; **never stored**. |
| Grade record format | Invented, formal "Report of Grades" (printed), synthetic data only. |
| Grades | Percentage, **75 passing**; remarks **INC**, **UW** (Unauthorized Withdrawal), **DRP** (Dropped). `AW` is renamed `UW` everywhere. |
| Year standing | Set by the dean during evaluation. |
| Curricula, prerequisites, offerings | Managed by the dean. |
| Output | Printable **Pre-enrollment form** listing the approved subjects. |
| Backend | Firebase **Spark (free)**: Authentication (email/password) + Cloud Firestore. No Cloud Functions, no Cloud Storage (both need Blaze). |
| Assistant | Stays rule-based (deterministic); no Gemini on Spark. |

## Roles and flows

### Student
1. Sign up: email, password, first/last name, student number, program, entry AY.
   Curriculum version derives from entry AY (existing rule).
2. Request an evaluation for the active term (one per term; duplicates blocked).
3. Track status: Submitted → Under review → Approved. *Action needed* when the dean
   marks the record incomplete (e.g. grade record not readable, missing year standing).
4. After the decision: see the approved subjects and print the **Pre-enrollment form**.
5. Never sees a draft load.

### Dean
1. **Requests** list (existing queue: tabs, program/year filters, search).
2. Open a request → **Evaluation workspace**:
   1. Set **year standing** (required before the load can be decided).
   2. **Scan grade record** → review screen → save grades.
   3. Curriculum view with each subject's status (existing explorer).
   4. Suggested load (existing composeLoad); add/remove with validation (existing).
   5. Approve with optional remarks → pre-form available to the student.
3. **Curricula**: structure, prerequisites, offerings this term (moved from Registrar).
4. **Students**: list and profile (read; year standing and grades editable).
5. **Activity log** (moved from Registrar).

## Scan feature

### Flow
1. **Capture**: `<input type="file" accept="image/*" capture="environment">` (camera on
   phones, file picker on desktop). Multiple pages allowed; each page processed in turn.
2. **Pre-process** in a canvas: downscale to ≤ 2000 px long edge, grayscale, contrast stretch.
3. **OCR**: Tesseract.js (`eng`), lazy-loaded only on this screen, run in a Web Worker.
   Progress shown; cancellable.
4. **Parse** (pure function, unit-tested): `parseGradeReport(text, curriculum)`.
   - Split into lines; find a subject code per line by fuzzy matching against **the
     student's curriculum codes only** (normalise O→0, I/l→1 in digit positions,
     collapse spaces; Levenshtein distance ≤ 2 on normalised code).
   - Grade token on the same line: integer/decimal 50–100, or `INC`, `UW`, `DRP`.
   - Term headings (`FIRST SEMESTER`, `SECOND SEMESTER`, `SUMMER`, `A.Y. 2025–2026`)
     set the term of following rows.
   - Each row gets `confidence: 'high' | 'check'` (`check` = fuzzy code match,
     unreadable grade, out-of-range grade, or duplicate code).
   - Lines with no match are listed as *unmatched text* for the dean to dismiss or map.
5. **Review** (side by side on desktop, stacked on phone): photo (zoomable) | table of
   Code · Title · Term · Grade/Remark · confidence. Rows marked *Check* are highlighted.
   Dean can edit, add, or delete rows. Existing grades for the same subject and term
   are shown as conflicts; the dean chooses which to keep.
6. **Save** writes the record entries, logs "Grades encoded from scan (n subjects)",
   and the evaluation recomputes.

### Report of Grades (sample format)
Printed A4 page, formal: school seal, "Laguna College", "Office of the Registrar",
title "REPORT OF GRADES", student block (name, student no., program, curriculum),
then per term a table **Subject Code | Descriptive Title | Units | Final Grade | Remarks**,
signature block. A route renders it for any seeded student so it can be printed and
scanned during testing and the defense. Synthetic data only.

## Rule changes

- `AW` → `UW` (Unauthorized Withdrawal): **not completed**; blocks dependents; offered
  for retake like a failed subject. (Previously AW went to dean review because policy
  was undefined; UW is treated as a non-pass.)
- `Dropped` label → `DRP`; behaviour unchanged (not completed, blocks dependents).
- The equivalency and correction screens are removed with the Registrar role.
  The rule engine still reads existing Credited entries, but nothing in the UI
  creates them; transferee crediting is out of scope for this version.
- Missing year standing → request shows *Action needed* to the student and blocks
  the decision until the dean sets it.

## Data model (Firestore)

```
users/{uid}            role: 'student' | 'dean', studentId (= uid)
students/{uid}         profile (incl. yearStanding), ownerUid, records[] (embedded)
requests/{studentId}   requestedAt, reviewStartedAt, added, removed,
                       remarks, decision {subjectIds, at}
config/offerings       subjectIds (active term)
config/prerequisites   dean's prerequisite overrides
audit/{autoId}         at, actor, actorUid, studentId?, action
```

Curricula stay in code (as today); only the dean's prerequisite overrides and
offerings live in Firestore. Records are embedded in the student document: one
read per student, simpler rules, far below the 1 MiB document limit.

Security rules:
- Student: read own `users`, `students/{own}`, its `records`, own `requests`;
  create own profile once and own request; cannot write records, year standing,
  or decisions. Read `curricula` and `offerings`.
- Dean: read/write everything except `users` role field.
- Dean accounts are created in the Firebase console (role set manually); student
  sign-up always creates role `student`.

The app keeps the pure domain layer (`rules.ts`, `advising.ts`) unchanged in shape;
a data layer replaces the localStorage reducer persistence with Firestore
reads/writes. A **demo mode** with the current synthetic seed stays available
offline for the defense in case of no internet.

## Out of scope
Registrar scheduling, enrollment, payments, notifications, Cloud Functions,
Gemini/AI, storing images, transferee crediting, integration with the school system.

## Testing
- Unit: `parseGradeReport` against OCR-like noisy text fixtures (misread codes,
  missing grades, term headings, duplicates); UW/DRP rules; security rules via the
  Firestore emulator.
- Existing 42 domain tests kept passing (updated for AW→UW).
- Manual: print the sample Report of Grades, photograph it with a phone, run the
  full dean flow.

## Paper updates to report at the end
A change list for Chapters I–III will be delivered when implementation is done
(roles, scan feature, UW, Spark plan, no AI explanations, pre-form output).
