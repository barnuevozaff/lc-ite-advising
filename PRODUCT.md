# Product

<!-- impeccable:product-schema 1 -->

> Source of truth: "Rule-Based Academic Advising and Subject-Load Evaluation System with AI-Assisted Explanations for BSCS and BSIT Students", Chapters I–III (Final v30). Facts below are taken from that paper; nothing here was gathered by interview (the brief delegated design decisions and the paper answers the product questions).

## Platform

web (responsive; mobile and desktop browsers)

## Stack

Built: React + TypeScript + Vite front end; Firebase Authentication and Cloud Firestore on the free Spark plan; in-browser OCR (tesseract.js) for scanning grade records. Gemini 3.5 Flash-Lite through Firebase AI Logic (no Cloud Functions, which need the paid Blaze plan); rule-based assistant as fallback. Offline demo mode with synthetic data.

## Users

Two roles:
- **Students** (BSCS, BSIT; regular or irregular) — sign in with the account the dean created, follow the evaluation status, monitor grades, view curriculum progress, subject statuses and reasons, the approved load and dean remarks; print the pre-enrollment form; ask the AI chatbot about their own record. Cannot edit records or approve anything.
- **Dean** — adds students and creates their logins; sets the student's year standing; scans the student's printed Report of Grades (from the Registrar) and reviews what was read before saving; reviews rule-based results and the suggested load; adds or removes subjects within prerequisite and offering rules; approves with remarks; maintains curricula, prerequisites and this term's offerings.

The Registrar is not a system user. It issues the printed grade record and schedules the approved pre-enrollment form in its own system.

Faculty do not have accounts.

## Product Purpose

Decision support for the pre-enrollment subject-load evaluation step of the ITE Department at Laguna College (San Pablo City). Rule-based evaluation determines results; the dean decides.

## Capabilities and Constraints

- Two curriculum versions per program (2018–2019, 2025–2026), assigned by entry academic year (AY 2025–2026 or later → 2025–2026). Never by current school year; no automatic migration.
- Subject statuses: Completed/Passed, Failed/For Retake, Not Yet Taken, Eligible This Semester, Blocked by Prerequisite, Not Offered This Semester, Currently Enrolled, Pending/Not Completed, Needs Action/Needs Attention, Credited/Substituted, Record Update Needed, Requires Dean Review.
- Passing grade 75 (numerical percentage). INC → Pending/Needs Action; UW (Unauthorized Withdrawal) → Failed, retake when offered; DRP (Dropped) → Not Completed; none satisfy prerequisites.
- All listed prerequisites must be satisfied. Year standing is recorded, never computed; checked only when explicitly listed.
- No fixed unit limit. Recommended load = eligible AND offered subjects. Additional subjects/overloads → dean.
- Out of scope: enrollment, payments, schedules, registration card, integration with the school portal, storing grade-record images, transferee crediting.
- Output: printable pre-enrollment form signed by the dean, received by the Registrar.

## Brand Commitments

Official Laguna College seal (provided). Institution name: Laguna College; department: ITE Department.

## Evidence on Hand

Only synthetic student records may be used. No real student data.

## Product Principles

1. Rules check and suggest, the dean decides — never blur the two.
2. Every blocked subject shows its reason.
3. Missing data is never assumed; it is flagged as Record Update Needed.
4. Follow official documents exactly; do not invent rules.

## Accessibility & Inclusion

Status meaning must never rely on color alone; keyboard operable; usable on phones.
