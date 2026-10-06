import { ArrowLeftIcon, PrinterIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router-dom'
import { reportSections } from '../../domain/gradeReport'
import { sampleNewStudent } from '../../data/seed'
import { useStore } from '../../store/AppStore'

/** Synthetic Report of Grades used to test and demonstrate scanning. Not an official document. */
export function SampleReport() {
  const { id = '' } = useParams()
  const { state, curricula } = useStore()
  // 'new' prints a synthetic student who is not in the system yet, to demonstrate creating a record from a scan.
  const s = id === 'new' ? sampleNewStudent() : state.students.find((x) => x.id === id)
  const cur = s && curricula.find((c) => c.program === s.program && c.version === s.curriculumVersion)
  if (!s || !cur)
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Student not found</h1>
      </div>
    )
  const sections = reportSections(s, cur)

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 md:px-8 md:py-10 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={id === 'new' ? '/dean' : `/dean/students/${s.id}`} className="btn btn-ghost -ml-2">
          <ArrowLeftIcon size={16} /> Back
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <PrinterIcon size={18} /> Print
        </button>
      </div>

      <article className="bg-white px-6 py-10 text-[13px] text-[#111] shadow-[0_0_0_1px_var(--line)] md:px-12 print:shadow-none">
        <header className="text-center">
          <img src="/laguna-college-seal.png" alt="Laguna College seal" width={60} height={60} className="mx-auto h-15 w-15" />
          <div className="mt-2 text-base font-semibold tracking-[0.08em]">LAGUNA COLLEGE</div>
          <div className="text-xs tracking-[0.06em]">San Pablo City, Laguna</div>
          <div className="mt-1 text-xs tracking-[0.06em]">OFFICE OF THE REGISTRAR</div>
          <h1 className="mt-5 text-lg font-bold tracking-[0.24em]">REPORT OF GRADES</h1>
          <p className="mt-1 text-[11px] tracking-[0.08em] text-[#555]">SAMPLE · SYNTHETIC DATA · NOT AN OFFICIAL DOCUMENT</p>
        </header>

        <dl className="mt-7 grid grid-cols-1 gap-x-10 gap-y-1.5 border-y border-[#111] py-3 sm:grid-cols-2">
          <Field k="Name" v={`${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}`} />
          <Field k="Student No." v={s.studentNo} />
          <Field k="Program" v={s.program} />
          <Field k="Curriculum" v={s.curriculumVersion} />
        </dl>

        {sections.length === 0 && <p className="mt-8 text-center">No grades on record.</p>}
        {sections.map((sec) => (
          <section key={sec.heading} className="mt-7 break-inside-avoid">
            <h2 className="font-bold">{sec.heading}</h2>
            <table className="mt-1.5 w-full border-collapse">
              <thead>
                <tr className="border-y border-[#111] text-left text-[11px] tracking-[0.04em]">
                  <th className="py-1 pr-4 font-semibold">SUBJECT CODE</th>
                  <th className="pr-4 font-semibold">DESCRIPTIVE TITLE</th>
                  <th className="pr-4 text-right font-semibold">UNITS</th>
                  <th className="pr-4 text-right font-semibold">FINAL GRADE</th>
                  <th className="font-semibold">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-1 pr-4 whitespace-nowrap">{r.code}</td>
                    <td className="pr-4">{r.title}</td>
                    <td className="pr-4 text-right">{r.units}</td>
                    <td className="pr-4 text-right">{r.grade}</td>
                    <td className="whitespace-nowrap">{r.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <p className="mt-8 text-[11px]">Passing grade: 75. INC: Incomplete. UW: Unauthorized Withdrawal. DRP: Dropped.</p>

        <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-xs">
          <div className="border-t border-[#111] pt-1">Prepared by</div>
          <div className="border-t border-[#111] pt-1">University Registrar</div>
        </footer>
      </article>
    </div>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0">{k}:</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}
