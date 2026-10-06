import { ArrowLeftIcon, PrinterIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../components/provenance'
import { decidedSubjects } from '../../domain/advising'
import { unitsOf } from '../../domain/rules'
import { CURRENT_TERM, YEAR_LABEL, termLabel } from '../../domain/term'
import { useStore, useStudentView } from '../../store/AppStore'

/** Pre-enrollment form the student brings to the Registrar for scheduling. Printed by the dean (route with :id) or the student. */
export function StudentPrint() {
  const { state } = useStore()
  const { id } = useParams()
  const view = useStudentView(id ?? state.session?.studentId)
  const back = id ? `/dean/students/${id}` : '/student'
  if (!view) return null
  const { student, ev, record } = view
  const d = record?.decision

  if (!d)
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Available after the dean’s decision</h1>
        <Link to={back} className="btn btn-secondary mt-6">
          Back
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 md:px-8 md:py-10 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={back} className="btn btn-ghost -ml-2">
          <ArrowLeftIcon size={16} /> Evaluation
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <PrinterIcon size={18} /> Print
        </button>
      </div>

      <article className="bg-white px-6 py-8 text-[#111] shadow-[0_0_0_1px_var(--line)] md:px-10 print:shadow-none">
        <header className="flex items-center gap-4 border-b-2 border-[#111] pb-4">
          <img src="/laguna-college-seal.png" alt="Laguna College seal" width={64} height={64} className="h-16 w-16" />
          <div>
            <div className="text-lg font-semibold">Laguna College</div>
            <div className="text-sm">ITE Department, San Pablo City</div>
          </div>
          <div className="ml-auto text-right text-sm">
            <div className="font-semibold tracking-[0.08em]">PRE-ENROLLMENT FORM</div>
            <div>{termLabel(CURRENT_TERM)}</div>
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <Item k="Student" v={`${student.lastName}, ${student.firstName}`} />
          <Item k="Student number" v={student.studentNo} mono />
          <Item k="Program" v={student.program} />
          <Item k="Curriculum version" v={student.curriculumVersion} />
          <Item k="Year standing" v={student.yearStanding ? YEAR_LABEL[student.yearStanding] : 'Not recorded'} />
          <Item k="Classification" v={ev.classification === 'regular' ? 'Regular' : 'Irregular'} />
        </dl>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-[#111]">
              <th className="py-1.5 pr-3 text-left font-semibold">Code</th>
              <th className="py-1.5 pr-3 text-left font-semibold">Descriptive title</th>
              <th className="py-1.5 text-right font-semibold">Units</th>
            </tr>
          </thead>
          <tbody>
            {decidedSubjects(ev, d.subjectIds).map((s) => (
              <tr key={s.id} className="border-b border-[#ccc]">
                <td className="code py-1.5 pr-3">{s.code}</td>
                <td className={`py-1.5 pr-3 ${s.missing ? 'italic' : ''}`}>{s.title}</td>
                <td className="num py-1.5 text-right">{s.missing ? '' : s.units}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#111]">
              <td className="py-1.5 font-semibold" colSpan={2}>
                Total units
              </td>
              <td className="num py-1.5 text-right font-semibold">{unitsOf(d.subjectIds)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 text-sm">
          <div className="font-semibold">Dean’s remarks</div>
          <p className="mt-1 min-h-[2.5em]">{d.remarks || 'None.'}</p>
        </div>

        <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-sm">
          <div>
            <div className="border-t border-[#111] pt-1">{d.kind === 'approved' ? 'Evaluated and approved by' : 'Evaluated and confirmed by'}</div>
            <div className="font-semibold">Dean, ITE Department</div>
            <div className="text-xs">{formatDateTime(d.at)}</div>
          </div>
          <div>
            <div className="border-t border-[#111] pt-1">Received by</div>
            <div className="font-semibold">Registrar</div>
          </div>
        </footer>
      </article>
    </div>
  )
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[#555]">{k}</dt>
      <dd className={mono ? 'num' : 'font-medium'}>{v}</dd>
    </div>
  )
}
