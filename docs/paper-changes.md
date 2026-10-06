# Paper changes: system as built vs. Chapters I–III

As of October 6, 2026. Each row is a difference between the current system and the proposal. Update the paper, or prepare to defend the change.

## Roles and scope

| Area | Proposal said | System now | Why |
|---|---|---|---|
| Users | Three roles: Student, Dean, Authorized academic personnel (incl. Registrar) | Two roles: **Student** and **Dean** | The Registrar keeps its existing system. The project solves the dean's evaluation step only. |
| Registrar | Encodes records, year standing, offerings, curricula, equivalencies; resolves correction requests | Not a system user. Issues the printed grade record and schedules the approved pre-enrollment form in its own system | No integration with the school system |
| Who encodes grades | Registrar / authorized personnel | **Dean**, by scanning the student's printed Report of Grades | Matches the real flow: the student brings the grade record to the dean |
| How a student enters the system | Records already encoded by the Registrar | **Created by the dean's first scan.** The system reads the name, student number, program and curriculum from the report header. A later scan with the same student number updates the same record | No integration; the system starts empty |
| Year standing | Recorded by the Registrar | **Set by the dean** during evaluation. Still never computed | Registrar is no longer a user |
| Curricula, prerequisites, offerings | Maintained by authorized personnel | Maintained by the **dean** | Same |
| Correction requests | Dean sends corrections to the Registrar | **Removed.** The dean fixes grades directly (re-scan or edit) | Only one role maintains data |
| Equivalencies, transferee crediting | Recorded equivalencies; credited subjects | **Out of scope** for this version | Needs Registrar validation |

## New features (add to Chapter III)

| Feature | Description |
|---|---|
| Scan grade record | Dean photographs or uploads the student's printed Report of Grades. **OCR** (tesseract.js, runs in the browser) reads it. Subject codes are matched only against the student's own curriculum, and common OCR misreads (1/I, 0/O, 5/S, 8/B) are corrected. Rows that are unsure, ambiguous or listed twice are flagged for checking. |
| Review before saving | The photo is shown next to the rows that were read. The dean confirms, edits, adds or removes rows. Nothing is saved without the dean. Re-scanning replaces the same subject in the same term instead of duplicating it. |
| Photo not stored | The image never leaves the device; only the reviewed grades are saved (Data Privacy Act; also free-plan friendly) |
| Dean-first evaluation | **Requests → Add student → scan the grade record → review → evaluation with the suggested load → Approve → Print**. The student's status reads *Not yet evaluated → In evaluation → Approved/Confirmed* |
| Dean prints the pre-form | After approving, the dean prints the pre-enrollment form and hands it to the student for the Registrar |
| Student accounts | Created only by the dean (Add student with the student's email). Students cannot sign themselves up or create requests |
| Passwords | Change password (key icon) for everyone; Forgot password sends Firebase's reset email |
| Pre-enrollment form | Printable form with the approved subjects, total units, dean's remarks, "Evaluated and approved by: Dean" and "Received by: Registrar" signature lines. Student brings it to the Registrar for scheduling. |
| Sample Report of Grades | Formal synthetic report used for testing and the demo (clearly marked "not an official document") |
| Offline demo mode | Synthetic data in the browser, for the defense if there is no internet |
| Add student | Dean enters student number, name, program, entry year, year standing and (optionally) the student's email, then goes straight to scanning. An existing student number opens the existing record |
| Student login made by the dean | With an email, the system creates the student's account and a temporary password shown once to the dean. A student can only ever see their own record |
| Reopen decision | Dean reopens a wrong approval with a reason (logged); the printed form is no longer valid |
| Active term | Dean starts the next term: current requests and decisions are archived, offerings reset to that semester's subjects, the rule engine evaluates for the new term |
| Grades monitoring (student) | Grades per term, average per term, general average, passed/failed/INC counts, curriculum progress in units and percent |
| AI chatbot (student) | Gemini 3.5 Flash-Lite through Firebase AI Logic (free tier). Answers only from the student's own evaluation; the name and student number are not sent. Explains, never decides; refers decisions to the dean and enrollment/payment questions to the Registrar. Falls back to the rule-based assistant when offline or unavailable |

## Curriculum data (Chapter III, data sources)

| Item | Now |
|---|---|
| Source | Official prospectuses and prerequisite sheets of BSCS and BSIT, 2018–2019 and 2025–2026 (13 photographs), recorded in `docs/curriculum-source.md` |
| Size | BSCS 2018: 53 subjects / 155 units · BSIT 2018: 52 / 152 · BSCS 2025: 54 / 158 · BSIT 2025: 54 / 161. Checked by automated tests |
| Summer | 2018 curricula have a third-year Summer term (Practicum 1 and one more subject); the system supports it |
| Multiple prerequisites | "A/B", "A, B" and "A; B" are all treated as **all required** (paper's rule). **Confirm with the institution** whether "/" means "or" |
| Blank, dash or missing prerequisite | Not treated as "none"; the subject shows "Prerequisite not on file · verify" |
| Source conflicts | 14 conflicts (e.g. ITE P119 used twice in BSIT 2025, PE 117 listed as its own prerequisite, BSIT 2018 fourth-year sheet missing) are shown to the dean as "Verify" and listed in `docs/curriculum-source.md` for the Registrar to confirm |

## Rule changes (Chapter III, rules / Table of statuses)

| Rule | Proposal | System now |
|---|---|---|
| AW | Authorized Withdrawal → Not Completed / Needs Review | **UW (Unauthorized Withdrawal)** → counted as **failed**: does not satisfy prerequisites, offered for retake when the subject is offered |
| Dropped | "Dropped" | Labeled **DRP**; behavior unchanged (not completed, blocks dependents) |
| Missing year standing | Record Update Needed, refer to Registrar | Status stays *In evaluation*; the dean sets the year standing before deciding. No "Action needed" for the student |
| Unchanged | Passing grade 75; INC blocks dependents until completed; all prerequisites required; recommended load = eligible AND offered; curriculum version from entry AY | Same |

## Technology (Chapter III, tools / architecture)

| Item | Proposal | System now | Why |
|---|---|---|---|
| Backend | Firebase Cloud Functions + Firestore + Auth | **Firebase Authentication + Cloud Firestore only** (Spark / free plan), project `lc-ite-advising`, region `asia-southeast1` | Cloud Functions need the paid Blaze plan |
| AI explanations | Gemini 3.5 Flash-Lite via Cloud Functions | **Gemini 3.5 Flash-Lite via Firebase AI Logic**, called from the app (no Cloud Functions) | AI Logic with the Gemini Developer API works on the free Spark plan. Note for Chapter III (privacy): on the free tier Google may use prompts to improve its services, so the name and student number are never sent |
| Image reading | Not in proposal | tesseract.js OCR (open-source, in-browser, English) | Free, offline after first load, no data sent out |
| Security | Firebase Auth | Auth + **Firestore security rules**: a student only reads their own record and request; only the dean creates and edits records, logins, decisions, curricula, offerings and terms; nobody can make themselves dean; the activity log is append-only. 32 automated rule tests | Data privacy |

## Title

"with AI-Assisted Explanations" still fits: the student chatbot uses Gemini. Optionally mention the OCR scanning of grade records.

## Evaluation (Chapter III methodology / Chapter IV)

- Add **OCR accuracy**: for N printed sample reports, count subjects read correctly ÷ total subjects, and how many rows the dean had to fix.
- Add **time per evaluation**: manual record lookup vs. scan + review.
- Add **chatbot answer accuracy**: a set of student questions with expected answers from the record, rated correct / partly / wrong.
- Rule tests: 100 automated tests (rules, scanning parser, grades, chatbot context, active term, sync, passwords); 32 security-rule tests.
