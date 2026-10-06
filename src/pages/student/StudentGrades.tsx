import { Page, PageHeader } from '../../layouts/AppShell'
import { gradeSummary, type GradeRow } from '../../domain/grades'
import { useStore, useStudentView } from '../../store/AppStore'

const REMARK_TONE: Record<GradeRow['remark'], string> = {
  Passed: 'text-ink-2',
  Failed: 'font-semibold text-bad',
  INC: 'font-semibold text-act',
  UW: 'font-semibold text-bad',
  DRP: 'font-semibold text-ink-2',
  Credited: 'text-ink-2',
}

const fmt = (n?: number) => (n === undefined ? '—' : n.toFixed(2))

/** Grades monitoring: grades per term, averages, and progress toward the curriculum. */
export function StudentGrades() {
  const { state } = useStore()
  const view = useStudentView(state.session?.studentId)
  if (!view) return null
  const g = gradeSummary(view.ev)
  const pct = Math.round(g.progress * 100)

  return (
    <Page wide>
      <PageHeader title="Grades" />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <Stat label="General average" value={fmt(g.gwa)} />
        <Stat label="Passed" value={String(g.counts.passed)} />
        <Stat label="Failed" value={String(g.counts.failed)} tone={g.counts.failed ? 'text-bad' : ''} />
        <Stat label="INC" value={String(g.counts.inc)} tone={g.counts.inc ? 'text-act' : ''} />
      </dl>

      <section className="mt-6" aria-labelledby="prog-h">
        <div className="flex items-baseline justify-between text-sm">
          <h2 id="prog-h" className="font-semibold">
            Curriculum progress
          </h2>
          <span className="text-ink-2">
            <span className="num">{g.unitsEarned}</span> of <span className="num">{g.unitsTotal}</span> units · <span className="num">{pct}%</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Curriculum progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {g.terms.length === 0 ? (
        <p className="mt-10 border-y border-line py-12 text-center text-sm text-ink-2">No grades on record yet</p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...g.terms].reverse().map((t) => (
            <section key={t.label} aria-label={t.label}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-semibold">{t.label}</h2>
                <span className="text-sm text-ink-2">
                  Average <span className="num font-semibold text-ink">{fmt(t.average)}</span>
                </span>
              </div>
              <table className="ledger mt-2">
                <thead>
                  <tr>
                    <th className="w-28">Code</th>
                    <th>Subject</th>
                    <th className="w-16 text-right">Units</th>
                    <th className="w-20 text-right">Grade</th>
                    <th className="hidden w-24 sm:table-cell">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="code">{r.code}</td>
                      <td>
                        {r.title}
                        <span className={`block text-xs sm:hidden ${REMARK_TONE[r.remark]}`}>{r.remark}</span>
                      </td>
                      <td className="num text-right">{r.units}</td>
                      <td className={`num text-right ${r.grade === undefined ? REMARK_TONE[r.remark] : ''}`}>{r.grade ?? r.remark}</td>
                      <td className={`hidden sm:table-cell ${REMARK_TONE[r.remark]}`}>{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${tone}`}>{value}</dd>
    </div>
  )
}
