import { ArrowRightIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CurriculumMap } from '../../components/CurriculumLedger'
import { Sheet } from '../../components/Sheet'
import { SubjectDetail } from '../../components/SubjectDetail'
import { StatusTag } from '../../components/status'
import { StudentHeading, useLatched } from '../../components/student-bits'
import { Page } from '../../layouts/AppShell'
import { downstreamOf } from '../../domain/rules'
import { useStore, useStudentView } from '../../store/AppStore'
import { SubjectLoadPanel } from './SubjectLoadPanel'

const NOTE_FALLBACK: Partial<Record<string, string>> = { pending: 'INC', notCompleted: 'DRP' }

export function StudentOverview() {
  const { state } = useStore()
  const view = useStudentView(state.session?.studentId)
  const [selected, setSelected] = useState<string | null>(null)
  const navigate = useNavigate()
  const shown = useLatched(selected)
  if (!view) return null
  const { student, ev, record } = view

  const attention = Object.values(ev.subjects).filter((s) =>
    ['failed', 'pending', 'notCompletedReview', 'notCompleted', 'deanReview', 'recordUpdate'].includes(s.status),
  )

  const blockedByRecord = Object.values(ev.subjects).find((x) => x.status === 'blocked' && x.blockCause !== 'sequence' && x.subject.year <= (student.yearStanding ?? 1))
  const pendingInc = Object.values(ev.subjects).find((x) => x.status === 'pending')
  const questions = [
    blockedByRecord ? `Why can’t I take ${blockedByRecord.subject.code} yet?` : record?.decision ? 'What is in my subject load?' : 'When will my subject load be ready?',
    pendingInc ? `What happens with my INC in ${pendingInc.subject.code}?` : null,
    'What subjects do I still need to complete?',
  ].filter((q): q is string => !!q)
  const ask = (q: string, sid?: string) => navigate(`/student/assistant?q=${encodeURIComponent(q)}${sid ? `&s=${sid}` : ''}`)

  return (
    <Page>
      <StudentHeading ev={ev} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-12">
        <SubjectLoadPanel ev={ev} rec={record} />

        <div className="space-y-9">
          {attention.length > 0 && (
            <section aria-labelledby="att-h">
              <h2 id="att-h" className="text-sm font-semibold">
                Needs attention
              </h2>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {attention.map((s) => {
                  const affects = downstreamOf(ev, s.subject.id).length
                  return (
                    <li key={s.subject.id}>
                      <button className="flex w-full flex-col gap-1.5 py-2.5 text-left hover:bg-surface-2/60" onClick={() => setSelected(s.subject.id)}>
                        <span className="flex items-baseline gap-2">
                          <span className="code">{s.subject.code}</span>
                          <span className="truncate text-sm font-medium">{s.subject.title}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusTag status={s.status} flag={s.flag} />
                          <span className="text-xs text-ink-2">
                            {[s.note ?? NOTE_FALLBACK[s.status], affects > 0 && s.status !== 'recordUpdate' ? `Blocks ${affects}` : ''].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="map-h">
            <div className="flex items-baseline justify-between">
              <h2 id="map-h" className="text-sm font-semibold">
                Curriculum
              </h2>
              <Link to="/student/progress" className="inline-flex items-center gap-1 text-sm text-seal-text hover:underline">
                View all <ArrowRightIcon size={13} />
              </Link>
            </div>
            <div className="mt-3">
              <CurriculumMap ev={ev} />
            </div>
          </section>

          <section aria-labelledby="ask-h">
            <h2 id="ask-h" className="text-sm font-semibold">
              Ask
            </h2>
            <ul className="mt-2 space-y-1.5">
              {questions.map((q) => (
                <li key={q}>
                  <button className="text-left text-sm text-seal-text hover:underline" onClick={() => ask(q)}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={shown ? <span className="code text-lg">{ev.subjects[shown]?.subject.code}</span> : ''}
        subtitle={shown ? ev.subjects[shown]?.subject.title : ''}
      >
        {shown && <SubjectDetail ev={ev} subjectId={shown} onSelect={setSelected} onAsk={(q) => ask(q, shown)} />}
      </Sheet>
    </Page>
  )
}
