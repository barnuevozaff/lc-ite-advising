import type { Curriculum, CurriculumSubject, CurriculumVersion, Placement, Prerequisite, Program, YearLevel } from '../domain/types'

/**
 * OFFICIAL CURRICULUM DATA (Laguna College, ITE Department)
 *
 * Transcribed from the four prospectuses and nine prerequisite sheets
 * (docs/curriculum-source.md). Each row keeps the prerequisite exactly as
 * printed. How it is evaluated:
 * - Every subject listed is required, whether separated by "/", "," or ";"
 *   (the paper's rule: all listed prerequisites must be satisfied).
 * - "N year standing" becomes a year-standing requirement.
 * - "none" means no prerequisite. A blank cell, a dash or a missing sheet is
 *   NOT treated as "none": the subject is evaluated without a prerequisite but
 *   carries a "verify" note for the dean.
 * Source conflicts are kept as `verify` notes, never silently corrected.
 */

/** [code, title, units, prerequisite as printed, verify note?] */
type Row = [code: string, title: string, units: number, prereq: string, verify?: string]

const UNVERIFIED = new Set(['[blank]', '-', '[not supplied]'])

function parseStanding(text: string): YearLevel | null {
  const t = text.toLowerCase()
  if (!t.includes('standing')) return null
  if (/\b(1st|first)\b/.test(t)) return 1
  if (/\b(2nd|second)\b/.test(t)) return 2
  if (/\b(3rd|third)\b/.test(t)) return 3
  if (/\b(4th|fourth)\b/.test(t)) return 4
  throw new Error(`Unreadable year standing: ${text}`)
}

function build(program: Program, version: CurriculumVersion, prefix: string, terms: Record<string, Row[]>): Curriculum {
  const subjects: CurriculumSubject[] = []
  const slug = (code: string) => `${prefix}-${code.toLowerCase().replace(/[^a-z0-9]+/g, '')}`
  const pending: { subject: CurriculumSubject; codes: string[] }[] = []
  for (const [key, rows] of Object.entries(terms)) {
    const [y, s] = key.split('.').map(Number) as [YearLevel, Placement]
    for (const [code, title, units, prereq, verify] of rows) {
      // A code printed twice in one prospectus keeps both placements, with distinct ids.
      const id = subjects.some((x) => x.code === code) ? `${slug(code)}-y${y}s${s}` : slug(code)
      const standing = parseStanding(prereq)
      const onFile = !UNVERIFIED.has(prereq)
      const codes = prereq === 'none' || !onFile || standing ? [] : prereq.split(/[/,;]/).map((c) => c.trim()).filter((c) => c && c !== code)
      const subject: CurriculumSubject = {
        id,
        code,
        title,
        units,
        year: y,
        semester: s,
        prerequisites: standing ? [{ kind: 'standing', year: standing }] : [],
        prereqText: prereq,
        prereqOnFile: onFile,
        verify,
        source: 'official',
      }
      subjects.push(subject)
      pending.push({ subject, codes })
    }
  }
  // Resolve subject prerequisites within the same curriculum; an unknown code is a transcription error.
  for (const { subject, codes } of pending) {
    const resolved: Prerequisite[] = codes.map((c) => {
      const target = subjects.find((x) => x.code === c)
      if (!target) throw new Error(`Unresolved prerequisite ${c} for ${subject.code} in ${program} ${version}`)
      return { kind: 'subject', subjectId: target.id }
    })
    subject.prerequisites = [...resolved, ...subject.prerequisites]
  }
  return { id: `${program}-${version}`, program, version, subjects }
}

const FIL_NOTE = 'The prerequisite sheet lists GE Elec 1 / GE Elec 2 in place of the FIL subjects. Prerequisite not on file.'

export const BSCS_2018 = build('BSCS', '2018–2019', 'cs18', {
  '1.1': [
    ['GE 101', 'Purposive Communication', 3, 'none'],
    ['GE 102', 'Readings in Philippine History', 3, 'none'],
    ['GE 103', 'Mathematics in the Modern World', 3, 'none'],
    ['ITE C101', 'Introduction to Computing (lec/lab)', 3, 'none'],
    ['ITE C102', 'Computer Programming 1 (lec/lab)', 3, 'none'],
    ['FIL 111', 'Komunikasyon sa Akademikong Filipino', 3, '[not supplied]', FIL_NOTE],
    ['NSTP 111', 'NSTP - Civic Welfare Training Service 1', 3, 'none'],
    ['PE 111', 'Individual/Dual Sports 1', 2, 'none'],
  ],
  '1.2': [
    ['GE 104', 'Art Appreciation', 3, 'none'],
    ['FIL 112', 'Pagbasa at Pagsulat Tungo sa Pananaliksik', 3, '[not supplied]', FIL_NOTE],
    ['ITE C103', 'Computer Programming 2 (lec/lab)', 3, 'ITE C101'],
    ['ITE C104', 'Data Structures and Algorithms (lec/lab)', 3, 'ITE C101/ITE C102'],
    ['ITE P101', 'Discrete Structures 1', 3, 'none'],
    ['ITE P102', 'Web Development', 3, 'ITE C102'],
    ['NSTP 112', 'NSTP - Civic Welfare Training Service 2', 3, 'none'],
    ['PE 112', 'Individual/Dual Sports 2', 2, 'none'],
  ],
  '2.1': [
    ['GE 105', 'Understanding the Self', 3, 'none'],
    ['GE 106', 'Ethics', 3, 'none'],
    ['ITE C105', 'Information Management (lec/lab)', 3, 'ITE P102'],
    ['ITE C106', 'Application Dev’t and Emerging Technology (lec/lab)', 3, 'ITE C103'],
    ['ITE P201', 'Digital Logic Design', 3, 'ITE P101'],
    ['ITE P202', 'Discrete Structures 2', 3, 'ITE P101'],
    ['ACCTG 111', 'Fundamentals of Accounting', 3, 'none'],
    ['PE 113', 'Group Sports 1', 2, 'none'],
  ],
  '2.2': [
    ['ITE P203', 'Analysis and Design of Algorithms (lec/lab)', 3, 'ITE C103'],
    ['ITE P204', 'Object Oriented Programming (lec/lab)', 3, 'ITE C103'],
    ['ITE P205', 'Computer Organization and Architecture', 3, 'ITE C103'],
    ['GE 108', 'Science, Technology, and Society', 3, 'none'],
    ['ITE P206', 'Social Issues and Professional Practice', 3, 'none'],
    ['MATH 221', 'Statistics and Probabilities', 3, 'none'],
    ['PE 114', 'Group Sports 2', 2, 'none'],
  ],
  '3.1': [
    ['ITE P301', 'Automata Theory and Formal Languages', 3, 'ITE C102'],
    ['ITE P302', 'Data Communication and Networking 1 (lec/lab)', 3, 'ITE C105'],
    ['ITE P303', 'Software Engineering (lec/lab)', 3, 'ITE C105'],
    ['ITE P304', 'Human Computer Interaction', 3, 'ITE C103'],
    ['FL 111', 'Basic Nihongo', 3, 'none'],
    ['ITE P305', 'Operating Systems', 3, 'ITE C104'],
  ],
  '3.2': [
    ['ITE P306', 'Programming Languages (lec/lab)', 3, 'ITE C104'],
    ['ITE P307', 'Graphics and Visual Computing (lec/lab)', 3, 'ITE C103/ITE P102'],
    ['RES 311', 'Methods of Research in Computing', 3, 'none'],
    ['GE 107', 'Contemporary World', 3, 'none'],
    ['SOCSC 111', 'Personal Development', 3, 'none'],
    ['FL 112', 'Advanced Nihongo', 3, 'FL 111'],
  ],
  '3.3': [
    ['ITE P401', 'Practicum 1', 3, 'at least 3rd year standing'],
    ['CS ELEC 1', 'Elective 1', 3, '[blank]', 'The prerequisite cell is blank on the sheet.'],
  ],
  '4.1': [
    ['ITE P402', 'Natural Language (lec/lab)', 3, 'ITE C103'],
    ['ITE P403', 'Thesis Writing 1', 3, '4th year standing'],
    ['GE 109', 'Life and Works of Rizal', 3, 'none'],
    ['ITE P405', 'Information Assurance and Security', 3, 'ITE C105'],
    ['CS ELEC 2', 'CS Elective 2', 3, 'ITE C105/ITE P303'],
  ],
  '4.2': [
    ['ITE P404', 'Thesis Writing 2', 3, 'ITE P403'],
    ['ENG 300', 'World Literature', 3, 'none'],
    ['CS ELEC 3', 'Elective 3', 3, 'ITE P303'],
  ],
})

export const BSIT_2018 = build('BSIT', '2018–2019', 'it18', {
  '1.1': [
    ['GE 101', 'Purposive Communication', 3, 'none'],
    ['GE 102', 'Readings in Philippine History', 3, 'none'],
    ['GE 103', 'Mathematics in the Modern World', 3, 'none'],
    ['ITE C101', 'Introduction to Computing (lec/lab)', 3, 'none'],
    ['ITE C102', 'Computer Programming 1 (lec/lab)', 3, 'none'],
    ['FIL 111', 'Komunikasyon sa Akademikong Filipino', 3, '[not supplied]', FIL_NOTE],
    ['NSTP 111', 'NSTP - Civic Welfare Training Service 1', 3, 'none'],
    ['PE 111', 'Individual/Dual Sports 1', 2, 'none'],
  ],
  '1.2': [
    ['GE 104', 'Art Appreciation', 3, 'none'],
    ['FIL 112', 'Pagbasa at Pagsulat Tungo sa Pananaliksik', 3, '[not supplied]', FIL_NOTE],
    ['ITE C103', 'Computer Programming 2 (lec/lab)', 3, 'ITE C102'],
    ['ITE C104', 'Data Structures and Algorithms (lec/lab)', 3, 'ITE C101/ITE C102'],
    ['ITE P101', 'Discrete Structures 1', 3, 'none'],
    ['ITE P102', 'Web Development (lec/lab)', 3, 'ITE C101'],
    ['NSTP 112', 'NSTP - Civic Welfare Training Service 2', 3, 'none'],
    ['PE 112', 'Individual/Dual Sports 2', 2, 'none'],
  ],
  '2.1': [
    ['GE 105', 'Understanding the Self', 3, 'none'],
    ['GE 106', 'Ethics', 3, 'none'],
    ['ITE C105', 'Information Management (lec/lab)', 3, 'ITE C103'],
    ['ITE C106', 'Application Dev’t and Emerging Technology (lec/lab)', 3, 'ITE C103'],
    ['ITE P103', 'Platform Technologies', 3, 'ITE P101'],
    ['ACCTG 111', 'Fundamentals of Accounting', 3, 'none'],
    ['PE 113', 'Group Sports 1', 2, 'none'],
  ],
  '2.2': [
    ['ITE ELEC 1', 'Elective 1', 3, 'ITE C103'],
    ['ITE P104', 'Human Computer Interaction', 3, 'ITE C103'],
    ['GE 108', 'Science, Technology, and Society', 3, 'none'],
    ['ITE P105', 'Social Issues and Professional Practice', 3, 'none'],
    ['MATH 221', 'Statistics and Probabilities', 3, 'none'],
    ['PE 114', 'Group Sports 2', 2, 'none'],
  ],
  '3.1': [
    ['ITE P106', 'Integrative Programming and Technologies (lec/lab)', 3, 'ITE C103'],
    ['ITE P107', 'Data Communication and Networking 1 (lec/lab)', 3, 'ITE P103/ITE C105'],
    ['RES 311', 'Methods of Research in Computing', 3, '-', 'The prerequisite cell shows a dash.'],
    ['FL 111', 'Basic Nihongo', 3, '-', 'The prerequisite cell shows a dash.'],
    ['ITE P108', 'Systems Analysis and Design', 3, 'ITE C103'],
    ['ITE P109', 'Operating Systems', 3, 'ITE C104'],
  ],
  '3.2': [
    ['ITE P110', 'Systems Integration and Architecture (lec/lab)', 3, 'ITE C105'],
    ['ITE ELEC 2', 'Elective 2', 3, 'ITE P102'],
    ['GE 109', 'Life and Works of Rizal', 3, 'none'],
    ['ITE P111', 'Fund. of Data Warehousing & Data Mining (lec/lab)', 3, 'ITE C105'],
    ['GE 107', 'Contemporary World', 3, 'none'],
    ['SOCSC 111', 'Personal Development', 3, 'none'],
    ['FL 112', 'Advanced Nihongo', 3, 'FL 111'],
  ],
  '3.3': [
    ['ITE P117', 'Practicum 1', 3, 'at least 3rd year standing'],
    ['ITE P112', 'Networking 2 (lec/lab)', 3, 'ITE P107'],
  ],
  '4.1': [
    ['ITE P113', 'Information Assurance and Security 1', 3, 'ITE P110'],
    ['ITE P114', 'Capstone Project and Research 1', 3, '4th year standing'],
    ['ITE ELEC 3', 'Elective 3 (lec/lab)', 3, 'ITE C105'],
    ['ITE ELEC 4', 'Elective 4 (lec/lab)', 3, 'ITE P104'],
    ['ITE P118', 'Practicum 2', 3, 'at least 3rd year standing'],
  ],
  '4.2': [
    ['ITE P115', 'Capstone Project and Research 2', 3, 'ITE P114'],
    ['ITE P116', 'Systems Administration and Maintenance', 3, 'ITE P113'],
    ['ENG 300', 'World Literature', 3, 'none'],
  ],
})

export const BSCS_2025 = build('BSCS', '2025–2026', 'cs25', {
  '1.1': [
    ['ENG 101', 'English Enrichment Course', 3, 'none'],
    ['GE 101', 'Purposive Communication', 3, 'none'],
    ['GE 102', 'Readings in Philippine History', 3, 'none'],
    ['GE 103', 'Mathematics in the Modern World', 3, 'none'],
    ['GE 104', 'Art Appreciation', 3, 'none'],
    ['ITE C101', 'Introduction to Computing (lec/lab)', 3, 'none'],
    ['ITE C102a', 'Fundamentals of Programming (lec/lab)', 3, 'none'],
    ['NSTP 111', 'NSTP 1 - Civic Welfare Training Service', 3, 'none'],
    ['PE 115', 'PathFit 1 - Movement Competency Training', 2, 'none'],
  ],
  '1.2': [
    ['GE 105', 'Understanding the Self', 3, 'none'],
    ['GE 106', 'Ethics', 3, 'none'],
    ['GE ELEC 2', 'Entrepreneurial Mind', 3, 'none'],
    ['ITE C103b', 'Intermediate Programming (lec/lab)', 3, 'ITE C102a'],
    ['ITE P101', 'Discrete Structures 1', 3, 'none'],
    ['ITE C104', 'Data Structures and Algorithms (lec/lab)', 3, 'ITE C102a'],
    ['GE ELEC 1', 'Living in the IT Era', 3, 'none'],
    ['NSTP 112', 'NSTP 2 - Civic Welfare Training Service', 3, 'NSTP 111', 'The prerequisite sheet shows (3) units and a 23-unit semester total; the prospectus shows 3 units and 26.'],
    ['PE 116', 'PathFit 2 - Sports, Martial Arts, Outdoor and Adventure Activities', 2, 'PE 115'],
  ],
  '2.1': [
    ['GE 107', 'The Contemporary World', 3, 'none'],
    ['GE 108', 'Science, Technology and Society', 3, 'none'],
    ['GE ELEC 3', 'Great Books', 3, 'none'],
    ['ITE P104', 'Human Computer Interaction', 3, 'ITE C103b'],
    ['ITE ELEC 5', 'Object Oriented Programming', 3, 'ITE C103b'],
    ['ITE P123', 'Discrete Structures 2', 3, 'ITE C104'],
    ['ITE P124', 'Algorithms and Complexity', 3, 'ITE C104'],
    ['PE 117', 'PathFit 3 - Dance', 2, 'PE 117', 'The prerequisite sheet lists PE 117 as its own prerequisite. No prerequisite is applied until confirmed.'],
  ],
  '2.2': [
    ['ITE P305', 'Operating Systems', 3, 'ITE C103b'],
    ['SOCSC 111', 'Professional Development', 3, 'none'],
    ['ITE C105', 'Information Management (lec/lab)', 3, 'ITE C103b'],
    ['ITE P127', 'Programming Languages (lec/lab)', 3, 'ITE P101'],
    ['ITE P125', 'Automata Theory and Formal Languages', 3, 'ITE P124'],
    ['ITE P128', 'Software Engineering 1', 3, 'ITE ELEC 5'],
    ['MATH 221', 'Statistics and Probabilities', 3, 'none'],
    ['PE 118', 'PathFit 4 - Sports', 2, 'PE 117'],
  ],
  '3.1': [
    ['ITE C106', 'Application Development and Emerging Technologies (lec/lab)', 3, 'ITE C103b/ITE C105'],
    ['ITE P113', 'Information Assurance and Security 1', 3, 'ITE P128'],
    ['ITE P130', 'Software Engineering 2', 3, 'ITE C103b/ITE C105'],
    ['ITE P126', 'Architecture and Organization', 3, 'ITE P104'],
    ['ITE P129', 'Networks and Communications', 3, 'ITE C105'],
    ['CS ELEC 2', 'Computational Science', 3, 'none'],
    ['RES 311', 'Methods of Research in Computing', 3, '[blank]', 'The prerequisite cell is blank on the sheet.'],
  ],
  '3.2': [
    ['ITE P105', 'Social Issues and Professional Practice', 3, 'none'],
    ['ITE P113b', 'Information Assurance and Security 2', 3, 'ITE P113'],
    ['ITE ELEC 7', 'Web Systems and Technologies', 3, 'ITE P126'],
    ['CS ELEC 1', 'Graphics and Visual Computing', 3, 'ITE P104'],
    ['ITE P131', 'Natural Language Processing', 3, 'ITE P125'],
    ['ITE P134', 'Application Development and Emerging Technologies 2 (lec/lab)', 3, 'ITE C106'],
    ['ITE P132', 'CS Thesis Writing 1', 3, 'Third Year Standing'],
    ['FL 111', 'Foreign Language 1', 3, 'none'],
  ],
  '4.1': [
    ['ITE P133', 'CS Thesis Writing 2', 3, 'ITE P132'],
    ['FL 112', 'Foreign Language 2', 3, 'FL 111'],
    ['GE 109', 'Life and Works of Rizal', 3, 'none'],
    ['CS ELEC 3', 'Intelligent Systems', 3, 'ITE P131'],
  ],
  '4.2': [['ITE P117', 'Practicum', 3, 'Fourth Year Standing']],
})

const P119_NOTE = 'Code ITE P119 is used twice in this prospectus (Discrete Mathematics and Practicum). Confirm with the Registrar.'

export const BSIT_2025 = build('BSIT', '2025–2026', 'it25', {
  '1.1': [
    ['ENG 101', 'English Enrichment Course', 3, 'none'],
    ['GE 101', 'Purposive Communication', 3, 'none'],
    ['GE 102', 'Readings in Philippine History', 3, 'none'],
    ['GE 103', 'Mathematics in the Modern World', 3, 'none'],
    ['GE 104', 'Art Appreciation', 3, 'none'],
    ['ITE C101', 'Introduction to Computing (lec/lab)', 3, 'none'],
    ['ITE C102a', 'Fundamentals of Programming (lec/lab)', 3, 'none'],
    ['NSTP 111', 'NSTP 1 - Civic Welfare Training Service', 3, 'none'],
    ['PE 115', 'PathFit 1 - Movement Competency Training', 2, 'none'],
  ],
  '1.2': [
    ['GE 105', 'Understanding the Self', 3, 'none'],
    ['GE 106', 'Ethics', 3, 'none'],
    ['GE ELEC 2', 'Entrepreneurial Mind', 3, 'none'],
    ['ITE C103b', 'Intermediate Programming (lec/lab)', 3, 'ITE C102a'],
    ['ITE C104', 'Data Structures and Algorithms (lec/lab)', 3, 'ITE C102a'],
    ['ITE P119', 'Discrete Mathematics', 3, 'none', P119_NOTE],
    ['GE ELEC 1', 'Living in the IT Era', 3, 'none'],
    ['NSTP 112', 'NSTP 1 - Civic Welfare Training Service', 3, 'NSTP 111', 'Titled "NSTP 1" on the sources although it is the second NSTP subject. Confirm the title.'],
    ['PE 116', 'PathFit 2 - Sports, Martial Arts, Outdoor and Adventure Activities', 2, 'PE 115'],
  ],
  '2.1': [
    ['GE 107', 'The Contemporary World', 3, 'none'],
    ['GE 108', 'Science, Technology and Society', 3, 'none'],
    ['GE ELEC 3', 'Great Books', 3, 'none'],
    ['ITE ELEC 5', 'Object Oriented Programming', 3, 'ITE C103b'],
    ['ITE P103', 'Platform Technologies', 3, 'ITE C103b'],
    ['ITE P104', 'Human Computer Interaction', 3, 'ITE C103b'],
    ['ITE P106', 'Integrative Programming and Technologies 1 (lec/lab)', 3, 'ITE C103b'],
    ['PE 117', 'PathFit 3 - Dance', 2, 'PE 116'],
  ],
  '2.2': [
    ['SOCSC 111', 'Professional Development', 3, 'none'],
    ['ITE P109', 'Operating Systems', 3, 'ITE C103b'],
    ['ITE C105', 'Information Management (lec/lab)', 3, 'ITE C103b'],
    ['ITE P120', 'Quantitative Methods', 3, 'ITE P104'],
    ['ITE P121', 'Networking 1', 3, 'ITE C101/ITE P103'],
    ['ITE ELEC 6', 'Integrative Programming and Technologies (lec/lab) 2', 3, 'ITE ELEC 5; ITE P103'],
    ['MATH 221', 'Statistics and Probabilities', 3, 'none'],
    ['PE 118', 'Path Fit 4 - Sports', 2, 'PE 117'],
  ],
  '3.1': [
    ['ITE C106', 'Application Development and Emerging Technologies (lec/lab)', 3, 'ITE P121, ITE C105'],
    ['ITE P113', 'Information Assurance and Security 1', 3, 'ITE P121'],
    ['ITE P112', 'Networking 2 (lec/lab)', 3, 'ITE P121'],
    ['ITE P110', 'Systems Integration and Architecture (lec/lab)', 3, 'ITE P121'],
    ['ITE P108', 'Systems Analysis and Design', 3, 'ITE C103b/ITE P106'],
    ['ITE P111', 'Fundamentals of Database', 3, 'ITE C105'],
    ['RES 311', 'Methods of Research in Computing', 3, 'Third Year Standing'],
    ['ITE P116', 'System Administration and Maintenance', 3, 'THIRD YEAR STANDING'],
  ],
  '3.2': [
    ['ITE P113b', 'Information Assurance and Security 2', 3, 'ITE P113'],
    ['ITE P134', 'Application Development and Emerging Technologies 2 (lec/lab)', 3, 'ITE C105 / ITE C106'],
    ['ITE ELEC 8', 'Systems Integration and Architecture 2', 3, 'ITE P113'],
    ['ITE P105', 'Social Issues and Professional Practice', 3, 'ITE P113'],
    ['ITE ELEC 7', 'Web Systems & Technologies', 3, 'ITE P110'],
    ['ITE P122', 'Advanced Database Systems', 3, 'ITE P111'],
    ['ITE P114', 'Capstone Project and Research 1', 3, '4TH YEAR STANDING', 'Placed in third year, second semester, but requires fourth year standing. Confirm with the Registrar.'],
    ['FL 111', 'Foreign Language 1', 3, 'none'],
  ],
  '4.1': [
    ['ITE P115', 'Capstone Project and Research 2', 3, 'ITE P114'],
    ['GE 109', 'Life and Works of Rizal', 3, 'none'],
    ['FL 112', 'Foreign Language 2', 3, 'FL 111'],
  ],
  '4.2': [['ITE P119', 'Practicum', 6, '4TH YEAR STANDING', P119_NOTE]],
})

export const CURRICULA: Curriculum[] = [BSCS_2025, BSIT_2025, BSCS_2018, BSIT_2018]

export function curriculumFor(program: Program, version: CurriculumVersion): Curriculum {
  const c = CURRICULA.find((c) => c.program === program && c.version === version)
  if (!c) throw new Error(`No curriculum ${program} ${version}`)
  return c
}

const ALL_SUBJECTS = new Map(CURRICULA.flatMap((c) => c.subjects.map((s) => [s.id, s] as const)))
export function subjectById(id: string): CurriculumSubject | undefined {
  return ALL_SUBJECTS.get(id)
}
export function curriculumOfSubject(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.subjects.some((s) => s.id === id))
}
