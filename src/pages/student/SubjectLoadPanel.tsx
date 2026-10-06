import { CheckIcon, HourglassMediumIcon, NotePencilIcon, PaperPlaneRightIcon, PrinterIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Stamp, formatDate } from '../../components/provenance'
import { REQUEST_STATUS_LABEL, decidedSubjects, requestContext, requestStatus, studentVisibleLoad, type RequestStatus } from '../../domain/advising'
import { unitsOf } from '../../domain/rules'
import { SEM_LABEL, YEAR_LABEL } from '../../domain/term'
import type { AdvisingRecord, Evaluation } from '../../domain/types'

/**
 * The student's subject load for the current term.
 * Before the dean's decision only the request status is shown; the subject list
 * appears only from the dean-confirmed load.
 */
export function SubjectLoadPanel({ ev, rec }: { ev: Evaluation; rec: AdvisingRecord | undefined }) {
  const status = requestStatus(rec)
  const ctx = requestContext(ev)

  const context = (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-xs text-ink-3">Term</dt>
        <dd className="mt-0.5 font-medium">
          {SEM_LABEL[ctx.term.sem]}
          <span className="block font-normal text-ink-2">AY {ctx.term.ay}</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-ink-3">Year standing</dt>
        <dd className={`mt-0.5 flex items-center gap-1 font-medium ${ctx.yearStanding ? '' : 'text-data'}`}>
          {!ctx.yearStanding && <NotePencilIcon size={14} aria-hidden />}
          {ctx.yearStanding ? YEAR_LABEL[ctx.yearStanding] : 'Not recorded'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-ink-3">Curriculum</dt>
        <dd className="mt-0.5 font-medium">
          {ctx.program} {ctx.curriculumVersion}
        </dd>
      </div>
    </dl>
  )

  const visible = studentVisibleLoad(rec)
  if (visible && rec?.decision) {
    const d = rec.decision
    const ids = visible
    return (
      <section className="panel self-start overflow-hidden" aria-labelledby="load-h">
        <header className="flex items-center justify-between gap-6 px-5 pt-5 pb-4">
          <div>
            <h2 id="load-h" className="text-lg font-semibold">
              Subject load
            </h2>
            <p className="text-sm text-ink-2">
              {SEM_LABEL[ctx.term.sem]}, AY {ctx.term.ay}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium">
              <CheckIcon size={14} weight="bold" className="text-ok" aria-hidden />
              {REQUEST_STATUS_LABEL[d.kind]} {formatDate(d.at)}
            </p>
          </div>
          <Stamp kind={d.kind} at={d.at} />
        </header>
        {d.remarks && (
          <p className="border-t border-line bg-surface-2 px-5 py-3 text-[0.9375rem] leading-relaxed">
            <span className="text-ink-3">Dean’s remarks: </span>
            {d.remarks}
          </p>
        )}
        <table className="ledger border-t border-line">
          <thead>
            <tr>
              <th className="w-28 pl-5">Code</th>
              <th>Subject</th>
              <th className="w-16 pr-5 text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const s = decidedSubjects(ev, [id])[0]
              return (
                <tr key={id}>
                  <td className="code pl-5">{s.code}</td>
                  <td className={s.missing ? 'text-ink-2 italic' : 'font-medium'}>{s.title}</td>
                  <td className="num pr-5 text-right">{s.missing ? '' : s.units}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="pl-5" colSpan={2}>
                <span className="num">{ids.length}</span> subjects
              </td>
              <td className="num pr-5 text-right">{unitsOf(ids)}</td>
            </tr>
          </tfoot>
        </table>
        <footer className="flex justify-end border-t border-line px-5 py-3">
          <Link to="/student/print" className="btn btn-primary">
            <PrinterIcon size={18} /> Print pre-enrollment form
          </Link>
        </footer>
      </section>
    )
  }

  return (
    <section className="panel self-start px-5 py-5" aria-labelledby="load-h" aria-live="polite">
      <h2 id="load-h" className="text-lg font-semibold">
        Subject load
      </h2>
      <div className="mt-4">{context}</div>

      <div className="mt-6 border-t border-line pt-5">
        {status === 'none' ? (
          <div>
            <StatusLine status="none" />
            <p className="mt-1.5 text-sm text-ink-2">Bring your Report of Grades and pre-enrollment form to the dean for evaluation.</p>
          </div>
        ) : (
          <div>
            <StatusLine status={status} />
            <p className="mt-1.5 text-sm text-ink-2">
              The dean is evaluating your grades. Your subject load appears here once the dean decides.
            </p>
            <p className="mt-3 text-xs text-ink-3">Started {formatDate(rec!.requestedAt!)}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function StatusLine({ status }: { status: RequestStatus }) {
  const I = status === 'underReview' ? HourglassMediumIcon : PaperPlaneRightIcon
  return (
    <p className="inline-flex items-center gap-2 rounded-md bg-mute-tint px-2 py-1 font-semibold text-ink">
      <I size={16} aria-hidden />
      {REQUEST_STATUS_LABEL[status]}
    </p>
  )
}
