# Scan test cases: Report of Grades PDFs

Four synthetic students for testing **Add student → Scan grade record → evaluation**, using the **official** prospectus codes (encoded October 6, 2026). Expected results were produced by the system's own rule engine.

## Prompt for ChatGPT

Copy everything inside the box.

```text
Create 4 separate downloadable PDF files, one per student below. Each is a one-page, formal, printed-style academic document titled "REPORT OF GRADES". This is synthetic test data for testing an OCR scanner, so the layout must be clean and machine-readable.

STRICT RULES
- Use the data below EXACTLY. Do not add, remove, rename, reorder, or "correct" any subject code, title, unit, or grade. Do not invent extra subjects.
- Text-based PDF (real selectable text, not an image). Plain sans-serif font (Arial or Helvetica), black on white, body text at least 11 pt.
- No watermarks, no background images, no colored rows, no handwriting fonts, no rotated text, no logos. A thin horizontal line under the headers is fine.
- Do NOT add a grading legend, GPA, totals, page numbers, dates, or any other numbers anywhere on the page. The only numbers allowed are the student number, the academic years, the units and the grades.
- Write academic years with a plain hyphen: 2025-2026.
- If a student's table does not fit on one page, continue on a second page; never shrink the text below 10 pt.

LAYOUT (top to bottom)
1. Centered header, three lines:
   LAGUNA COLLEGE
   OFFICE OF THE REGISTRAR
   REPORT OF GRADES
2. One line under it, centered, small: SAMPLE FOR TESTING - NOT AN OFFICIAL DOCUMENT
3. Student block, exactly two lines, left-aligned:
   Name: <LAST, FIRST>          Student No.: <number>
   Program: <program>           Curriculum: <curriculum>
4. For each semester, a bold heading line exactly like:  FIRST SEMESTER, A.Y. 2025-2026
   followed by a table with these 5 columns in this order:
   SUBJECT CODE | DESCRIPTIVE TITLE | UNITS | FINAL GRADE | REMARKS
   One subject per row, all on a single line (do not wrap the subject code; a long title may wrap inside its own cell).
   REMARKS: grade 75 or higher = PASSED; below 75 = FAILED; INC = INCOMPLETE; UW = UNAUTHORIZED WITHDRAWAL; DRP = DROPPED.
   In the FINAL GRADE column write the number exactly as given (e.g. 79.5), or INC, UW, DRP.
5. Bottom: two signature lines side by side, labeled "Prepared by" and "University Registrar". No names.

File names: report-1-reyes.pdf, report-2-villanueva.pdf, report-3-mendoza.pdf, report-4-garcia.pdf

STUDENT 1
Name: REYES, ANDREA    Student No.: 2025-50001
Program: BSCS    Curriculum: 2025-2026
FIRST SEMESTER, A.Y. 2025-2026
ENG 101 | English Enrichment Course | 3 | 80
GE 101 | Purposive Communication | 3 | 87
GE 102 | Readings in Philippine History | 3 | 94
GE 103 | Mathematics in the Modern World | 3 | 86
GE 104 | Art Appreciation | 3 | 93
ITE C101 | Introduction to Computing (lec/lab) | 3 | 85
ITE C102a | Fundamentals of Programming (lec/lab) | 3 | 92
NSTP 111 | NSTP 1 - Civic Welfare Training Service | 3 | 84
PE 115 | PathFit 1 - Movement Competency Training | 2 | 91
SECOND SEMESTER, A.Y. 2025-2026
GE 105 | Understanding the Self | 3 | 82
GE 106 | Ethics | 3 | 89
GE ELEC 2 | Entrepreneurial Mind | 3 | 96
ITE C103b | Intermediate Programming (lec/lab) | 3 | 88
ITE P101 | Discrete Structures 1 | 3 | 95
ITE C104 | Data Structures and Algorithms (lec/lab) | 3 | 87
GE ELEC 1 | Living in the IT Era | 3 | 94
NSTP 112 | NSTP 2 - Civic Welfare Training Service | 3 | 86
PE 116 | PathFit 2 - Sports, Martial Arts, Outdoor and Adventure Activities | 2 | 93

STUDENT 2
Name: VILLANUEVA, CARLO    Student No.: 2025-50002
Program: BSIT    Curriculum: 2025-2026
FIRST SEMESTER, A.Y. 2025-2026
ENG 101 | English Enrichment Course | 3 | 78
GE 101 | Purposive Communication | 3 | 85
GE 102 | Readings in Philippine History | 3 | 92
GE 103 | Mathematics in the Modern World | 3 | 84
GE 104 | Art Appreciation | 3 | 91
ITE C101 | Introduction to Computing (lec/lab) | 3 | 83
ITE C102a | Fundamentals of Programming (lec/lab) | 3 | 90
NSTP 111 | NSTP 1 - Civic Welfare Training Service | 3 | 82
PE 115 | PathFit 1 - Movement Competency Training | 2 | 89
SECOND SEMESTER, A.Y. 2025-2026
GE 105 | Understanding the Self | 3 | 83
GE 106 | Ethics | 3 | 86
GE ELEC 2 | Entrepreneurial Mind | 3 | 84
ITE C103b | Intermediate Programming (lec/lab) | 3 | 70
ITE C104 | Data Structures and Algorithms (lec/lab) | 3 | UW
ITE P119 | Discrete Mathematics | 3 | INC
GE ELEC 1 | Living in the IT Era | 3 | 88
NSTP 112 | NSTP 1 - Civic Welfare Training Service | 3 | 87
PE 116 | PathFit 2 - Sports, Martial Arts, Outdoor and Adventure Activities | 2 | 89

STUDENT 3
Name: MENDOZA, PATRICIA    Student No.: 2023-50003
Program: BSCS    Curriculum: 2018-2019
FIRST SEMESTER, A.Y. 2023-2024
GE 101 | Purposive Communication | 3 | 80
GE 102 | Readings in Philippine History | 3 | 87
GE 103 | Mathematics in the Modern World | 3 | 94
ITE C101 | Introduction to Computing (lec/lab) | 3 | 86
ITE C102 | Computer Programming 1 (lec/lab) | 3 | 93
FIL 111 | Komunikasyon sa Akademikong Filipino | 3 | 85
NSTP 111 | NSTP - Civic Welfare Training Service 1 | 3 | 92
PE 111 | Individual/Dual Sports 1 | 2 | 84
SECOND SEMESTER, A.Y. 2023-2024
GE 104 | Art Appreciation | 3 | 85
FIL 112 | Pagbasa at Pagsulat Tungo sa Pananaliksik | 3 | 87
ITE C103 | Computer Programming 2 (lec/lab) | 3 | DRP
ITE C104 | Data Structures and Algorithms (lec/lab) | 3 | 81
ITE P101 | Discrete Structures 1 | 3 | 79
ITE P102 | Web Development | 3 | 84
NSTP 112 | NSTP - Civic Welfare Training Service 2 | 3 | 90
PE 112 | Individual/Dual Sports 2 | 2 | 91
FIRST SEMESTER, A.Y. 2024-2025
GE 105 | Understanding the Self | 3 | 81
GE 106 | Ethics | 3 | 88
ITE C105 | Information Management (lec/lab) | 3 | 95
ITE P201 | Digital Logic Design | 3 | 87
ITE P202 | Discrete Structures 2 | 3 | 94
ACCTG 111 | Fundamentals of Accounting | 3 | 86
PE 113 | Group Sports 1 | 2 | 93
SECOND SEMESTER, A.Y. 2024-2025
GE 108 | Science, Technology, and Society | 3 | 83
ITE P206 | Social Issues and Professional Practice | 3 | 90
MATH 221 | Statistics and Probabilities | 3 | 97
PE 114 | Group Sports 2 | 2 | 89

STUDENT 4
Name: GARCIA, LOUIE    Student No.: 2025-50004
Program: BSIT    Curriculum: 2025-2026
FIRST SEMESTER, A.Y. 2025-2026
ENG 101 | English Enrichment Course | 3 | 75
GE 101 | Purposive Communication | 3 | 82
GE 102 | Readings in Philippine History | 3 | 79.5
GE 103 | Mathematics in the Modern World | 3 | 80
GE 104 | Art Appreciation | 3 | 85
ITE C101 | Introduction to Computing (lec/lab) | 3 | 80
ITE C102a | Fundamentals of Programming (lec/lab) | 3 | 74
NSTP 111 | NSTP 1 - Civic Welfare Training Service | 3 | 85
PE 115 | PathFit 1 - Movement Competency Training | 2 | 88
SECOND SEMESTER, A.Y. 2025-2026
GE 105 | Understanding the Self | 3 | 81
GE 106 | Ethics | 3 | 84
GE ELEC 2 | Entrepreneurial Mind | 3 | 86
ITE P119 | Discrete Mathematics | 3 | 77
GE ELEC 1 | Living in the IT Era | 3 | 83
NSTP 112 | NSTP 1 - Civic Welfare Training Service | 3 | 84
PE 116 | PathFit 2 - Sports, Martial Arts, Outdoor and Adventure Activities | 2 | 86
```

## How to test

1. Open each PDF, then take a **screenshot** or print it and take a **photo** with a phone. The scanner reads images (JPG/PNG), not PDF files.
2. Dean → **Add student** → enter the student number, name, program, entry year and year standing from the table below → **Add and scan grades** → upload the image (one image per page).
3. Check the review screen: every subject and grade read correctly. A row may be flagged "to check" (phone photos; ITE P119, which the BSIT 2025 prospectus uses twice); confirm it.
4. **Save grades**, then compare the evaluation page with the expected results.

These expectations assume the active term is **1st Sem, AY 2026–2027** and the offerings are every first-semester subject (the current setting). Second-semester subjects are not offered this term, so a failed second-semester subject is **not** suggested for retake.

| # | Student | Add student fields | Expected status | Expected suggested load | Blocked because of a failed / INC / UW / DRP subject |
|---|---|---|---|---|---|
| 1 | Reyes, Andrea · 2025-50001 | BSCS · entry AY 2025–2026 · Second Year | **Regular** (prescribed load). Issues: none | GE 107, GE 108, GE ELEC 3, ITE P104, ITE ELEC 5, ITE P123, ITE P124, PE 117 | none |
| 2 | Villanueva, Carlo · 2025-50002 | BSIT · entry AY 2025–2026 · Second Year | **Irregular**. Issues: ITE C103b Failed/For Retake; ITE C104 Failed/For Retake; ITE P119 Pending/Needs Action | GE 107, GE 108, GE ELEC 3, PE 117, GE 109 | ITE ELEC 5 (Prerequisite not completed: ITE C103b); ITE P103 (Prerequisite not completed: ITE C103b); ITE P104 (Prerequisite not completed: ITE C103b); ITE P106 (Prerequisite not completed: ITE C103b); ITE P109 (Prerequisite not completed: ITE C103b); ITE C105 (Prerequisite not completed: ITE C103b); ITE P120 (Prerequisite not completed: ITE P104); ITE P121 (Prerequisite not completed: ITE P103); ITE ELEC 6 (Prerequisites not completed: ITE ELEC 5, ITE P103); ITE C106 (Prerequisites not completed: ITE P121, ITE C105); ITE P113 (Prerequisite not completed: ITE P121); ITE P112 (Prerequisite not completed: ITE P121); ITE P110 (Prerequisite not completed: ITE P121); ITE P108 (Prerequisites not completed: ITE C103b, ITE P106); ITE P111 (Prerequisite not completed: ITE C105); ITE P113b (Prerequisite not completed: ITE P113); ITE P134 (Prerequisites not completed: ITE C105, ITE C106); ITE ELEC 8 (Prerequisite not completed: ITE P113); ITE P105 (Prerequisite not completed: ITE P113); ITE ELEC 7 (Prerequisite not completed: ITE P110); ITE P122 (Prerequisite not completed: ITE P111) |
| 3 | Mendoza, Patricia · 2023-50003 | BSCS · entry AY 2023–2024 · Third Year | **Irregular**. Issues: ITE C103 Not Completed | ITE P301, ITE P302, ITE P303, FL 111, ITE P305, GE 109, ITE P405 | ITE C106 (Prerequisite not completed: ITE C103); ITE P203 (Prerequisite not completed: ITE C103); ITE P204 (Prerequisite not completed: ITE C103); ITE P205 (Prerequisite not completed: ITE C103); ITE P304 (Prerequisite not completed: ITE C103); ITE P307 (Prerequisite not completed: ITE C103); ITE P402 (Prerequisite not completed: ITE C103) |
| 4 | Garcia, Louie · 2025-50004 | BSIT · entry AY 2025–2026 · Second Year | **Irregular**. Issues: ITE C102a Failed/For Retake | ITE C102a, GE 107, GE 108, GE ELEC 3, PE 117, GE 109 | ITE C103b (Prerequisite not completed: ITE C102a); ITE C104 (Prerequisite not completed: ITE C102a); ITE ELEC 5 (Prerequisite not completed: ITE C103b); ITE P103 (Prerequisite not completed: ITE C103b); ITE P104 (Prerequisite not completed: ITE C103b); ITE P106 (Prerequisite not completed: ITE C103b); ITE P109 (Prerequisite not completed: ITE C103b); ITE C105 (Prerequisite not completed: ITE C103b); ITE P120 (Prerequisite not completed: ITE P104); ITE P121 (Prerequisite not completed: ITE P103); ITE ELEC 6 (Prerequisites not completed: ITE ELEC 5, ITE P103); ITE C106 (Prerequisites not completed: ITE P121, ITE C105); ITE P113 (Prerequisite not completed: ITE P121); ITE P112 (Prerequisite not completed: ITE P121); ITE P110 (Prerequisite not completed: ITE P121); ITE P108 (Prerequisites not completed: ITE C103b, ITE P106); ITE P111 (Prerequisite not completed: ITE C105); ITE P113b (Prerequisite not completed: ITE P113); ITE P134 (Prerequisites not completed: ITE C105, ITE C106); ITE ELEC 8 (Prerequisite not completed: ITE P113); ITE P105 (Prerequisite not completed: ITE P113); ITE ELEC 7 (Prerequisite not completed: ITE P110); ITE P122 (Prerequisite not completed: ITE P111) |

Also check after saving:
- Student 3 is evaluated with **BSCS 2018–2019** (old curriculum) automatically, from the entry year.
- Subjects whose prerequisite is not on file (e.g. FIL 111, BSIT 2018 fourth year) show **"Prerequisite not on file · verify"**.
- Approve → **Print pre-enrollment form** lists exactly the approved subjects.
- If the student was added with an email, the student's **Grades** page shows the same grades per term.
