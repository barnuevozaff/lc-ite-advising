# ITE Academic Advising

Prototype of the **Rule-Based Academic Advising and Subject-Load Evaluation System for BSCS and BSIT Students** (Laguna College, ITE Department).

React + TypeScript + Vite on Firebase (Authentication, Cloud Firestore, AI Logic with Gemini; free Spark plan). Without a Firebase config the app falls back to an offline demo with synthetic data.

## Presentation (offline demo)

Runs on localhost with demo accounts and synthetic test data. No database and no internet needed (grade scanning runs in the browser from `public/ocr`).

```bash
npm install          # once, needs internet
npm run dev:demo     # open http://localhost:5173, then "Demo accounts" on the sign-in page
```

Data stays in that browser. Use the reset button beside "Sign out" to restore the original test data before presenting.

## Development

```bash
npm install
npm run dev          # offline demo (same as dev:demo)
npm run dev:live     # live mode with Firebase (needs .env.local)
npm test             # domain, parser and sync tests
npm run test:rules   # Firestore security rules on the emulator (needs Java)
```

Live site: **https://lagunacollege-advising.web.app** (Firebase Hosting; the old lc-ite-advising.web.app redirects there). Redeploy after changes: `npm run build && npx firebase-tools deploy --only hosting`.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the Firebase web config (Project settings → Your apps).
2. Deploy rules: `npx firebase-tools deploy --only firestore,auth`.
3. Dean account: create the user in Firebase Console → Authentication, then add the Firestore document `users/{uid}` with `role: "dean"`.
4. Student accounts are created by the dean in **Add student** (email + temporary password). Students cannot sign themselves up.
5. AI chatbot: accept the Gemini API terms for the project (console.cloud.google.com/terms/generative-language-api), then enable Firebase AI Logic. Until then the rule-based assistant answers.

Everyone can change their password (key icon next to Sign out) or reset it from the sign-in page.

## Structure

| Path | Purpose |
| --- | --- |
| `src/domain/rules.ts` | Rule-based evaluation: curriculum version, statuses, prerequisite checks, chain tracing, availability, regular/irregular classification, prescribed and recommended loads. Pure functions. |
| `src/domain/gradeReport.ts` | Reads OCR text of a Report of Grades into reviewable rows (codes matched against the student's curriculum), merges scanned grades, and builds the sample report. |
| `src/scan/ocr.ts` | In-browser OCR (tesseract.js). The photo never leaves the device. |
| `src/domain/aiContext.ts`, `src/firebase/ai.ts` | AI chatbot: the student's evaluation (no name or student number) is sent to Gemini 3.5 Flash-Lite with instructions to explain, never decide. |
| `src/domain/assistant.ts` | Rule-based assistant, used offline and as the chatbot's fallback. |
| `src/domain/grades.ts` | Grades per term, averages and curriculum progress for the student. |
| `src/data/curricula.ts` | Curriculum versions. Entries cited in the proposal are tagged `proposal`; all others are `sample` placeholders until the official prospectus is encoded. |
| `src/data/seed.ts` | Synthetic demo students covering the Table 5 scenario categories. Not real student data. |
| `src/store/AppStore.tsx` | App state and reducer (requests, scans, decisions, audit log). |
| `src/firebase/` | Firebase init, auth (sign-in, dean-created student logins, passwords), and sync (writes changed documents, streams snapshots back). |
| `firestore.rules` | Security rules: a student only reads their own record and request; the dean creates and edits everything; nobody can make themselves dean. |

## Roles

- **Dean**: Add student (optionally with a login) → scan the printed Report of Grades (OCR, then review) → the system applies the curriculum and prerequisites, classifies regular/irregular and suggests the load → approve (or reopen) → print the pre-enrollment form for the Registrar. Also manages curricula, prerequisites, offerings and the active term.
- **Student**: signs in with the account from the dean; sees the evaluation status and approved load, prints the pre-enrollment form, monitors grades and curriculum progress, and asks the AI chatbot about their own record.
