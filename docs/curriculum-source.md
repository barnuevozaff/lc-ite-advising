# Official curriculum and prerequisites: source record

Supplied by the group on October 6, 2026: a transcription of 13 photographs (four prospectuses and nine prerequisite sheets) of the Laguna College ITE Department curricula. The system's curriculum data (`src/data/curricula.ts`) is encoded from this record. `src/data/curricula.test.ts` checks the subject counts and unit totals below.

## How the system reads it

| Source entry | System behavior |
|---|---|
| `none` | No prerequisite |
| A code, or codes separated by `/`, `,` or `;` | Every listed subject is required (the paper's rule). The printed text is shown to the dean ("All required · printed …"). **To confirm with the institution** |
| "Third Year Standing", "at least 3rd year standing", "4TH YEAR STANDING" | Year-standing requirement, not a course |
| `[blank]`, `-`, `[not supplied]` | Not treated as `none`. The subject is evaluated without a prerequisite and shows **"Prerequisite not on file · verify"** |
| Source conflict | Kept as data; shown to the dean as **Verify: …**, never silently corrected |

## Prospectus totals

| Program | Curriculum | Subject rows | Sum of listed units |
|---|---|---:|---:|
| BSCS | 2018–2019 | 53 | 155 |
| BSIT | 2018–2019 | 52 | 152 |
| BSCS | 2025–2026 | 54 | 158 |
| BSIT | 2025–2026 | 54 | 161 |

## Source conflicts (shown in the system as "Verify")

1. BSIT 2025–2026 uses **ITE P119** twice: Discrete Mathematics (3 units, 1st year 2nd sem) and Practicum (6 units, 4th year 2nd sem). Both kept; the scanner picks by title and flags the row.
2. BSIT 2025–2026 Systems Integration and Architecture 2 is **ITE ELEC 8** (3rd year 2nd sem).
3. ITE C102a appears in both BSCS 2025–2026 sources.
4. BSCS 2025–2026 **PE 117 lists PE 117 as its own prerequisite**. No prerequisite is applied until confirmed.
5. In both 2018–2019 programs the prospectus lists **FIL 111 / FIL 112**, while the prerequisite sheets list **GE Elec 1 (Great Books) / GE Elec 2 (Entrepreneurial Mind)**. The FIL subjects are kept; their prerequisite is not on file. The GE Elec rows are not added and are not treated as equivalencies.
6. BSIT 2018–2019 fourth-year prerequisite pages were not supplied (8 subjects).
7. BSCS 2025–2026 NSTP 112: prerequisite sheet shows (3) units and a 23-unit semester total; prospectus shows 3 units and 26.
8. BSIT 2025–2026 NSTP 112 is titled "NSTP 1 - Civic Welfare Training Service" in the sources.
9. BSCS 2018–2019 ITE P405 requires ITE C105; ITE C105/ITE P303 belongs to CS ELEC 2.
10. BSIT 2018–2019 ITE C103 requires ITE C102; ITE P102 requires ITE C101 (different from BSCS).
11. Accounting is **ACCTG 111**.
12. Blank prerequisite cells: BSCS 2018–2019 CS ELEC 1; BSCS 2025–2026 RES 311. Dash cells: BSIT 2018–2019 RES 311 and FL 111.
13. BSIT 2025–2026 **ITE P114** is placed in 3rd year 2nd sem but requires 4th year standing.
14. The 2025 sources include a summer-class note, not a summer subject list; no 2025 summer subjects are created.

## Source manifest

| Source ID | Uploaded filename |
|---|---|
| P-CS18 | 6a9fe6a8-d93f-4bde-812f-86b5e3eafe7c.jpg |
| P-IT18 | e1b88d1f-4fe2-45cc-acd7-586fb8cc8e0b.jpg |
| P-CS25 | 6130f5ef-e508-402e-9f8a-e2dafbd0ad66.jpg |
| P-IT25 | 39cb0c25-49dc-4d28-85f9-4467aba6b6fd.jpg |
| R-CS18-A | e2c5c537-7e5a-4a17-a526-c16c8e7c8970.jpg |
| R-CS18-B | 40e7c634-0e7f-4a0d-be4b-94a8f886f7df.jpg |
| R-CS18-C | 96b63413-df79-4c0e-8ffa-806fa025211f.jpg |
| R-IT18-A | cf3dbfeb-d93b-42aa-b299-a7e9128f6ab1.jpg |
| R-IT18-B | f58238cf-1daa-476e-a4c8-f9fad5ac8916.jpg |
| R-CS25-A | eacaa293-dfa6-493f-b61a-f79db90f4485.jpg |
| R-CS25-B | e88a97ed-a477-406f-aeda-9459757df7ef.jpg |
| R-IT25-A | 6b0bb730-f11a-47a4-a4db-00e515a77d5f.jpg |
| R-IT25-B | 51ce678c-723c-4c0a-ab42-c21372011f81.jpg |

The full subject tables (code, title, units, placement, prerequisite as printed) are encoded in `src/data/curricula.ts`, one row per prospectus row, in the same order.
