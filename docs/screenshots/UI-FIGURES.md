# Prototype Screenshots: Figure Guide

Captions for the screenshots in this folder, in workflow order. Same content as the shared figures page. All names, student numbers and grades are synthetic test data.

## Access

Both roles sign in to the same page. There is no self-registration.

**Figure 1. Sign-in page** (`01-sign-in.png`)  
Role: Dean and student · Process: Access  
The dean and the students will sign in with an email and password. Students will not register themselves; their accounts will be created by the dean.

## Dean: adding a student and reading the Report of Grades

The dean starts every evaluation. The student does not submit a request.

**Figure 2. Evaluation queue** (`02-dean-requests.png`)  
Role: Dean · Process: Start of the workflow  
The dean’s home page will list the students being evaluated in the active term, grouped into For confirmation (regular), For review (irregular), Needs year standing, Decided and All. Each row will show the program and curriculum, year standing, status and issues such as failed or INC subjects.

**Figure 3. Student records** (`03-dean-student-records.png`)  
Role: Dean · Process: Record management  
All active students will be listed by program and year standing, with search and filters. Each row will have an archive action, and archived students will be kept in a separate Archive view.

**Figure 4. Adding a student** (`04-dean-add-student.png`)  
Role: Dean · Process: Student creation  
The dean will enter the student number, name, program, entry academic year and year standing. The curriculum version will be assigned automatically from the entry academic year. An email may be entered to create the student’s login.

**Figure 5. Student login created** (`05-dean-student-login-created.png`)  
Role: Dean · Process: Account creation  
The system will show the student’s email and a temporary password once, for the dean to give to the student.

**Figure 6. Capturing the Report of Grades** (`06-dean-scan-grade-record.png`)  
Role: Dean · Process: Grade-record scanning  
The dean will photograph or upload the printed Report of Grades issued by the Registrar, one image per page. Grades may also be entered manually.

**Figure 7. Checking the grades read by the system** (`07-dean-scan-review.png`)  
Role: Dean · Process: Grade verification  
The image will be shown beside the rows read by the system: the subject matched to the student’s curriculum, the term and the grade. The dean will check and correct each row before saving. The image will not be stored.

**Figure 8. Row flagged for checking** (`08-dean-scan-row-to-check.png`)  
Role: Dean · Process: Grade verification  
Rows that need the dean’s attention will be highlighted with the reason, here a subject code used twice in the prospectus (ITE P119). Other reasons include a partly read code, a grade or term that was not read, and a subject listed twice.

## Dean: evaluation and subject load

The rules evaluate the record; the dean makes the final decision.

**Figure 9. Evaluation of an irregular student** (`09-dean-evaluation-irregular.png`)  
Role: Dean · Process: Rule-based evaluation  
After the grades are saved, the system will evaluate the record against the curriculum and its prerequisites. This student will be classified as irregular because of a failed subject (ITE C103b) and an INC (ITE P119). The proposed load will list eligible and offered subjects in priority order, with the failed subject first as a retake, within the normal load of the term.

**Figure 10. Blocked subjects** (`10-dean-curriculum-explorer-blocked.png`)  
Role: Dean · Process: Prerequisite checking  
Subjects whose prerequisite is not yet satisfied will be shown as blocked, with the reason. Eligible subjects can be added to the load, and blocked subjects will show an Allow option.

**Figure 11. Allowing a blocked subject** (`11-dean-allow-blocked-subject.png`)  
Role: Dean · Process: Prerequisite allowance  
For an exceptional case, the dean will allow a blocked subject for the student. A reason will be required and kept in the activity log.

**Figure 12. Load after the allowance** (`12-dean-load-with-allowance.png`)  
Role: Dean · Process: Load adjustment  
The allowed subject will be added to the load and marked as allowed by the dean, together with the reason.

**Figure 13. Prerequisite chain** (`13-dean-subject-detail-prerequisite-chain.png`)  
Role: Dean · Process: Explanation of a block  
Opening a subject will show its status, its prerequisite as printed in the prospectus, which prerequisite is not satisfied, and the chain back to the root cause.

**Figure 14. Approved load** (`14-dean-load-approved.png`)  
Role: Dean · Process: Approval  
After adding remarks, the dean will approve the load. The decision will be locked and stamped, and the pre-enrollment form will become available.

**Figure 15. Pre-enrollment form** (`15-pre-enrollment-form.png`)  
Role: Dean and student · Process: Output  
The printable form will list the student’s details, curriculum version, year standing, classification, the approved subjects and units, and the dean’s remarks, with signature lines for the dean and for the Registrar. The student will bring this form to the Registrar.

**Figure 16. Reopening a decision** (`16-dean-reopen-decision.png`)  
Role: Dean · Process: Correction  
A decided load can be reopened with a reason. The previously printed form will no longer be valid, and the reason will be kept in the activity log.

**Figure 17. Regular students for confirmation** (`17-dean-requests-for-confirmation.png`)  
Role: Dean · Process: Queue  
Regular students will appear under For confirmation, since their prescribed load only needs the dean’s confirmation.

**Figure 18. Prescribed load of a regular student** (`18-dean-evaluation-regular-prescribed.png`)  
Role: Dean · Process: Rule-based evaluation  
For a regular student, the system will list the prescribed subjects for the recorded year standing and the active term. The dean will confirm the load.

**Figure 19. Confirmed load** (`19-dean-load-confirmed-regular.png`)  
Role: Dean · Process: Confirmation  
A confirmed load of a regular student under the 2018–2019 curriculum: the five prescribed fourth-year, first-semester subjects.

**Figure 20. Missing year standing** (`20-dean-record-update-year-standing.png`)  
Role: Dean · Process: Record update  
When the year standing is not recorded, the status will remain undetermined and no load will be proposed until the dean records it. Subjects that require a year standing will be marked for record update.

**Figure 21. Case for the dean’s decision** (`21-dean-review-transfer-credit.png`)  
Role: Dean · Process: Dean review  
A credited subject of a transferee that has not been validated will be listed for the dean’s review. Until it is validated, subjects that depend on it will stay blocked.

## Dean: records, curriculum, term and activity

Nothing is deleted; every important action is logged.

**Figure 22. Student profile and academic record** (`22-dean-student-profile-academic-record.png`)  
Role: Dean · Process: Record management  
The profile will show the program, entry academic year, curriculum version, year standing and evaluation result, and the full academic record per term. The dean may add an entry, complete an INC or archive the student here.

**Figure 23. Archiving a student** (`23-dean-archive-student.png`)  
Role: Dean · Process: Archive  
Archiving will require a reason, such as transferring to another school. The record will be kept.

**Figure 24. Archived students** (`24-dean-archived-students.png`)  
Role: Dean · Process: Archive and restore  
Archived students will be listed separately and can be restored.

**Figure 25. Curriculum structure** (`25-dean-curricula-structure.png`)  
Role: Dean · Process: Curriculum reference  
The official BSCS and BSIT prospectuses (2018–2019 and 2025–2026) will be encoded with units and prerequisites. “None” will mean the prospectus states none; “-” will mean the cell is blank.

**Figure 26. Current subject offerings** (`26-dean-curricula-current-offerings.png`)  
Role: Dean · Process: Offerings  
The dean will mark which subjects are offered in the active term. Only offered subjects can be placed in a load.

**Figure 27. Editing prerequisites** (`27-dean-edit-prerequisites.png`)  
Role: Dean · Process: Curriculum maintenance  
When the department revises a prerequisite, the dean will update it with an optional approval reference. The change will be logged.

**Figure 28. Starting a new term** (`28-dean-start-new-term.png`)  
Role: Dean · Process: Active term  
The dean will set the active term: First Semester, Second Semester or Summer, and the academic year. The current term’s evaluations will be archived and the offerings reset.

**Figure 29. Activity log** (`29-dean-activity-log.png`)  
Role: Dean · Process: Traceability  
Important actions will be recorded with date, time and actor, such as adding a student, encoding scanned grades, allowing a subject with its reason, approving a load and archiving a student.

## Student

The student sees only the load the dean has confirmed or approved.

**Figure 30. Before evaluation** (`30-student-not-yet-evaluated.png`)  
Role: Student · Process: Before evaluation  
Before the dean evaluates the student, the page will show the active term, year standing and curriculum, with a note to bring the Report of Grades to the dean.

**Figure 31. During evaluation** (`31-student-in-evaluation.png`)  
Role: Student · Process: During evaluation  
While the dean is evaluating, the student will see “In evaluation” and no subject list. The page will also show subjects that need attention and a curriculum progress map.

**Figure 32. Grades monitoring** (`32-student-grades.png`)  
Role: Student · Process: Grade monitoring  
The student will see the general average, counts of passed, failed and INC subjects, curriculum progress in units, and grades per term.

**Figure 33. Curriculum progress** (`33-student-curriculum.png`)  
Role: Student · Process: Curriculum progress  
Every subject in the student’s curriculum will be listed with its status and prerequisites, with filters for completed, needs attention, eligible, blocked and not offered.

**Figure 34. Why a subject is blocked** (`34-student-subject-detail.png`)  
Role: Student · Process: Prerequisite explanation  
Opening a subject will show why it is blocked and the chain of prerequisites behind it, with an option to ask the assistant about it.

**Figure 35. AI assistant** (`35-student-ask-suggestions.png`)  
Role: Student · Process: AI-assisted explanation  
The assistant page will offer suggested questions about blocked subjects, missing prerequisites, remaining subjects, the subject load and status terms.

**Figure 36. Assistant explaining a result** (`36-student-ask-assistant.png`)  
Role: Student · Process: AI-assisted explanation  
The assistant will explain results already determined by the rule-based evaluation. When asked for a decision, such as an overload, it will decline and refer the student to the dean.

**Figure 37. Approved load seen by the student** (`37-student-approved-load.png`)  
Role: Student · Process: After approval  
After the dean’s decision, the student will see the approved subjects, the date, the dean’s remarks and the option to print the pre-enrollment form.

**Figure 38. Pre-enrollment form printed by the student** (`38-student-pre-enrollment-form.png`)  
Role: Student · Process: Output  
The student will be able to print the same pre-enrollment form from the student account.
