# Prototype Screenshots: Figure Guide

**For:** the Claude app (or any writer) placing the prototype screenshots into Chapters I–III.

**How to use:** attach this file and the PNG files in this folder. Each entry gives the file name, a suggested figure title, the user role, the step in the process, and what the screen shows. Write the figure descriptions in the paper's style (formal, academic, future tense: "the dean will…", "the system will…"). Renumber the figures to fit the paper.

**Data shown:** all names, student numbers, and grades are synthetic test data, not real student records. The screenshots come from the offline presentation version (`npm run dev`), so "Demo" appears beside the user's role in the sidebar.

---

## Overall flow shown by the figures

Dean signs in → adds the student (and the student's login) → scans the Report of Grades → checks and corrects the rows read → saves → the system evaluates the record (statuses, prerequisites, regular or irregular) → the dean reviews the prescribed or recommended load, adjusts it, allows a blocked subject with a reason if needed, writes remarks → confirms (regular) or approves (irregular) → prints the pre-enrollment form for the Registrar. The student signs in to see the evaluation status, the final load and remarks, grades, curriculum progress, and explanations from the assistant.

The student never sees a proposed or recommended load. Only the load the dean has confirmed or approved appears on the student's side.

---

## A. Sign-in

| File | Suggested title | Role | Process step | What the screen shows |
|---|---|---|---|---|
| `01-sign-in.png` | Sign-in page | Dean and student | Access | The institutional sign-in card (email and password). There is no sign-up; accounts are created by the dean. In the presentation version, "Demo accounts" lists sample dean and student accounts for one-click sign-in. |

## B. Dean: adding a student and scanning the Report of Grades

| File | Suggested title | Role | Process step | What the screen shows |
|---|---|---|---|---|
| `02-dean-requests.png` | Dean's evaluation queue | Dean | Start of the advising workflow | The dean's home page ("Requests"). Students being evaluated this term are grouped into tabs: For confirmation (regular), For review (irregular), Needs year standing, Decided, and All. Each row shows the program and curriculum, year standing, regular or irregular status, and issues such as failed or INC subjects. The **Add student** button starts a new evaluation. |
| `03-dean-add-student.png` | Adding a student | Dean | Student creation | The dean enters the student number, name, program, and entry academic year. The curriculum version is assigned automatically from the entry year (shown below the field). Year standing may be set now or later. An optional email creates the student's login. |
| `04-dean-student-login-created.png` | Student account created by the dean | Dean | Account creation | The email and a temporary password are shown once for the dean to give to the student. Students do not register themselves. (In the presentation version these are sample credentials only.) |
| `05-dean-scan-grade-record.png` | Capturing the Report of Grades | Dean | Grade-record scanning | The dean takes a photo or chooses an image of the printed Report of Grades issued by the Registrar (one photo per page). Grades may also be entered manually. |
| `05a-sample-report-of-grades.png` | Sample Report of Grades (synthetic) | Dean | Test document | The synthetic Report of Grades used to demonstrate scanning. Marked "Sample · synthetic data · not an official document". |
| `06-dean-scan-review.png` | Checking the grades read by the system | Dean | Grade verification | The photo is shown beside the rows the system read: subject (matched to the student's curriculum), term, and grade. The dean checks and corrects each row before saving. The footer counts the rows and how many need checking. |
| `06b-dean-scan-row-to-check.png` | A row flagged for checking | Dean | Grade verification | A highlighted row the dean must confirm, here "Code used twice in the prospectus" (ITE P119 appears twice in the BSIT 2025–2026 prospectus). Other flags are "Code partly read", "Grade not read", "Term not read", and "Listed twice". Lines that could not be matched are listed under "Not recognised". The photo is not stored. |

## C. Dean: evaluation and subject load

| File | Suggested title | Role | Process step | What the screen shows |
|---|---|---|---|---|
| `07-dean-evaluation-irregular.png` | Evaluation result of an irregular student | Dean | Rule-based evaluation → recommended load | After saving, the system evaluates the record. Mika Santos (BSIT 2025–2026, Second Year) is **Irregular** because ITE C103b was failed (73) and ITE P119 is INC ("Needs attention"). The **proposed load** lists eligible and offered subjects in priority order, with the failed subject first as a retake, kept within the normal load of the term (23 units). The curriculum explorer on the right shows every subject's status. |
| `08-dean-curriculum-explorer-blocked.png` | Blocked subjects in the curriculum explorer | Dean | Prerequisite checking | Second-year subjects that need ITE C103b are blocked, with the reason ("Prerequisite unresolved: ITE C103b failed"). Eligible subjects can be added; blocked subjects show **Allow**. |
| `09-dean-allow-blocked-subject.png` | Allowing a blocked subject as an exception | Dean | Prerequisite allowance | The dean allows ITE P104 for this student as a special case. A reason is required and is kept in the activity log. |
| `10-dean-load-with-allowance.png` | Load after the allowance | Dean | Load adjustment | ITE P104 is added to the load and marked "Allowed by the dean" with the reason. |
| `11-dean-subject-detail-prerequisite-chain.png` | Subject details and prerequisite chain | Dean | Explanation of a block | The subject panel for ITE P106: status (Blocked by Prerequisite), the prerequisite as printed in the prospectus, which prerequisite is not satisfied, and the chain back to the root cause (ITE C103b failed). |
| `12-dean-load-approved.png` | Approved subject load | Dean | Approval | After the dean writes remarks and clicks **Approve load**, the load is locked and stamped "Approved". The dean can now print the pre-enrollment form or reopen the decision. |
| `13-pre-enrollment-form.png` | Pre-enrollment form | Dean (also printable by the student) | Output | The printable form: student details, curriculum version, year standing, classification, approved subjects and units, the dean's remarks, and signature lines ("Evaluated and approved by: Dean, ITE Department" and "Received by: Registrar"). The student brings it to the Registrar. The layout is a placeholder until the official form is supplied. |
| `14-dean-reopen-decision.png` | Reopening a decision | Dean | Correction | A decided load can be reopened with a reason (for example, a wrong subject was approved). The printed form becomes invalid, and the reason is logged. |
| `15-dean-requests-for-confirmation.png` | Regular students waiting for confirmation | Dean | Queue | The "For confirmation" tab lists regular students whose prescribed loads only need the dean's confirmation. |
| `16-dean-evaluation-regular-prescribed.png` | Prescribed load of a regular student | Dean | Rule-based evaluation → prescribed load | Carlo Navarro (BSIT 2025–2026, Second Year) is **Regular** (a failed GE 102 was retaken and passed in Summer). The system lists the prescribed subjects for his year standing and term. The button reads **Confirm load**. |
| `17-dean-load-confirmed-regular.png` | Confirmed load of a regular student | Dean | Confirmation | Liza Macaraig (BSIT 2018–2019, Fourth Year) has a confirmed load: the five prescribed fourth-year, first-semester subjects (15 units). |
| `18-dean-record-update-year-standing.png` | Missing year standing | Dean | Record update | Rommel Tolentino has no recorded year standing, so the status is **Undetermined** and no load is proposed. Subjects that require a year standing show "Record update". The dean sets the year standing to continue. |
| `19-dean-review-transfer-credit.png` | A case that requires the dean's decision | Dean | Dean review | Paolo Esguerra (transferee) has a credited subject (ITE P101) that is not yet validated. It is listed under **Dean review**, where the dean records a decision. Until then, subjects that need ITE P101 stay blocked. |

## D. Dean: student records, curriculum, term, and activity

| File | Suggested title | Role | Process step | What the screen shows |
|---|---|---|---|---|
| `20-dean-student-records.png` | Student records | Dean | Record management | All active students grouped by program and year standing, with search and filters. Each row has an **Archive** action. The **Archive** button at the top opens the archived students. |
| `21-dean-student-profile-academic-record.png` | Student profile and academic record | Dean | Record management | The academic profile (program, entry academic year, curriculum version, year standing), the evaluation result, and the full academic record per term. The dean can add an entry, complete an INC, or remove an entry. **Archive** is available here. |
| `22-dean-archive-student.png` | Archiving a student | Dean | Archive | Archiving requires a reason (for example, graduated or transferred). Nothing is deleted. |
| `23-dean-archived-students.png` | Archived students | Dean | Archive and restore | Archived students are kept separately and can be restored at any time. |
| `24-dean-curricula-structure.png` | Curriculum structure | Dean | Curriculum reference | The official prospectus encoded in the system (BSCS and BSIT, 2018–2019 and 2025–2026): subjects per year and semester, units, and prerequisites. "None" means the prospectus says none; "-" means the cell is blank. |
| `25-dean-curricula-current-offerings.png` | Current subject offerings | Dean | Offerings for the term | The dean marks which subjects are offered in the active term. Only offered subjects can be placed in a load. |
| `26-dean-edit-prerequisites.png` | Editing a subject's prerequisites | Dean | Curriculum maintenance | The dean can update a prerequisite (for example, after a curriculum memo), with an optional approval reference. The change is logged. |
| `27-dean-start-new-term.png` | Starting a new term | Dean | Active term | The dean sets the active term (First Semester, Second Semester, or Summer, and the academic year). The current term's evaluations are archived and offerings are reset for the new term. |
| `28-dean-activity-log.png` | Activity log | Dean | Traceability | Every important action, with date, time, and actor: adding a student, encoding scanned grades, allowing a blocked subject with its reason, approving, reopening with its reason, archiving, and restoring. |

## E. Student

| File | Suggested title | Role | Process step | What the screen shows |
|---|---|---|---|---|
| `29-student-not-yet-evaluated.png` | Student view before evaluation | Student | Before evaluation | Bea Malabanan has not been evaluated this term. The page shows the term, year standing, and curriculum, with "Not yet evaluated" and a note to bring the Report of Grades to the dean. |
| `30-student-in-evaluation.png` | Student view during evaluation | Student | During evaluation | Jerome Dimaculangan is "In evaluation". **No subject list is shown yet**; the load appears only after the dean decides. The page also shows subjects that need attention (ITE C103b failed, blocks 14 subjects), a small curriculum map, and suggested questions. |
| `31-student-grades.png` | Grades monitoring | Student | Grade monitoring | The general average, counts of passed, failed, and INC subjects, curriculum progress in units and percent, and grades per term with remarks. |
| `32-student-curriculum.png` | Curriculum progress | Student | Curriculum progress | Every subject in the student's curriculum with its status (Completed, Failed, Eligible, Blocked, Not offered) and prerequisites. Filters narrow the list. |
| `33-student-subject-detail.png` | Why a subject is blocked | Student | Prerequisite explanation | The details of ITE P128: blocked because ITE ELEC 5 is not yet taken, which in turn needs ITE C103b (failed). The **Ask about ITE P128** button opens the assistant. |
| `34a-student-ask-suggestions.png` | AI assistant: suggested questions | Student | AI-assisted explanation | The assistant page with suggested questions about blocked subjects, missing prerequisites, remaining subjects, the load, and status terms. |
| `34-student-ask-assistant.png` | AI assistant explaining a result | Student | AI-assisted explanation | The assistant explains why ITE ELEC 5 is blocked, using the rule-based result. When asked to approve an overload, it declines and refers the student to the dean. The note below the input reads "Academic decisions are made by the dean." In the presentation version the answers are generated from the rule-based evaluation; in the deployed version they come from Gemini through Firebase AI Logic. |
| `35-student-approved-load.png` | Approved load seen by the student | Student | After approval | Dominic Lacsamana sees the dean-approved load, the approval stamp and date, the dean's remarks, and **Print pre-enrollment form**. |
| `36-student-pre-enrollment-form.png` | Pre-enrollment form printed by the student | Student | Output | The same pre-enrollment form, printed from the student's account. |

---

## Test data used in the screenshots (synthetic)

These are the demonstration students and what the rule-based evaluation produces for each. All were checked against the encoded prospectus and the active term (First Semester, AY 2026–2027).

| Student | Program and curriculum | Year standing | Scenario | Result shown by the system |
|---|---|---|---|---|
| Bea Malabanan | BSCS 2025–2026 | Second Year | All earlier subjects passed; not yet evaluated this term | Not yet evaluated. Once evaluated: Regular, prescribed 8 subjects (23 units). |
| Jerome Dimaculangan | BSCS 2025–2026 | Second Year | Failed ITE C103b (72) | Irregular. Recommended: ITE C103b retake first, then the current subjects not blocked by it, within 23 units. ITE ELEC 5, ITE P104, and later subjects in the chain are blocked. |
| Kristine Abrenica | BSIT 2025–2026 | Second Year | INC in ITE C103b | Irregular. INC does not satisfy a prerequisite, so only 4 subjects (11 units) are eligible. |
| Paolo Esguerra | BSCS 2025–2026 (transferee) | Second Year | Credited subject not yet validated (ITE P101) | Irregular, "Dean review" case. Subjects needing ITE P101 stay blocked until the credit is validated. |
| Carlo Navarro | BSIT 2025–2026 | Second Year | Failed GE 102, passed it in Summer | Regular; prescribed 8 subjects (23 units). |
| Hannah Bautista | BSCS 2018–2019 | Third Year | All earlier subjects passed | Regular; prescribed 6 subjects (18 units). |
| Ramon Gatdula | BSIT 2018–2019 | Fourth Year | All earlier subjects passed | Regular; prescribed 5 subjects (15 units). |
| Joshua Manalo | BSIT 2025–2026 | First Year | New student, no records | Regular; prescribed first-year, first-semester subjects (26 units). |
| Rommel Tolentino | BSIT 2018–2019 | Not recorded | Missing year standing | Undetermined; no load until the dean records the year standing. |
| Angelica Sumulong | BSIT 2018–2019 | Not recorded | Failed ITE C105 and missing year standing | Irregular (the failed subject already establishes it). Eligible and offered subjects are listed; subjects that require a year standing wait for it to be recorded. |
| Liza Macaraig | BSIT 2018–2019 | Fourth Year | Completed INC (84) | Regular; **confirmed** load of the 5 prescribed subjects (15 units). |
| Dominic Lacsamana | BSCS 2018–2019 | Fourth Year | ITE P303 failed then passed in Summer; UW in ITE P306; DRP in FL 111 | Irregular; **approved** load: FL 111 and ITE P306 as retakes, then ITE P402, ITE P403, GE 109 (15 units). ITE P405 moves to the next term to keep the normal load. FL 112 stays blocked until FL 111 is passed. |
| Mika Santos | BSIT 2025–2026 | Second Year | Added and scanned during the demonstration: failed ITE C103b (73), INC in ITE P119 | Irregular; approved load of 6 subjects (17 units) including ITE P104 allowed by the dean with a reason. |

**Rules applied:** passing grade 75; UW counts as failed and may be retaken; DRP is not completed and may be retaken when offered; INC does not satisfy a prerequisite until a final grade is recorded; all listed prerequisites are required; year standing is set by the dean; the curriculum version follows the entry academic year (AY 2025–2026 or later uses 2025–2026).
