import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CurriculumLedger } from '../../components/CurriculumLedger'
import { Sheet } from '../../components/Sheet'
import { SubjectDetail } from '../../components/SubjectDetail'
import { useLatched } from '../../components/student-bits'
import { Page, PageHeader } from '../../layouts/AppShell'
import { useStore, useStudentView } from '../../store/AppStore'

export function StudentProgress() {
  const { state } = useStore()
  const view = useStudentView(state.session?.studentId)
  const [selected, setSelected] = useState<string | null>(null)
  const shown = useLatched(selected)
  const navigate = useNavigate()
  if (!view) return null
  const { ev, student } = view
  const all = Object.values(ev.subjects)
  const done = all.filter((s) => s.status === 'passed' || s.status === 'credited')
  const units = (xs: typeof all) => xs.reduce((n, s) => n + s.subject.units, 0)

  return (
    <Page wide>
      <PageHeader
        title="Curriculum"
        description={
          <span className="text-ink-3">
            {student.program} {student.curriculumVersion} · <span className="num">{done.length}</span>/<span className="num">{all.length}</span> subjects ·{' '}
            <span className="num">{units(done)}</span>/<span className="num">{units(all)}</span> units completed
          </span>
        }
      />
      <CurriculumLedger ev={ev} onSelect={setSelected} selectedId={selected ?? undefined} />
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={shown ? <span className="code text-lg">{ev.subjects[shown]?.subject.code}</span> : ''}
        subtitle={shown ? ev.subjects[shown]?.subject.title : ''}
      >
        {shown && (
          <SubjectDetail
            ev={ev}
            subjectId={shown}
            onSelect={setSelected}
            onAsk={(q) => navigate(`/student/assistant?q=${encodeURIComponent(q)}&s=${shown}`)}
          />
        )}
      </Sheet>
    </Page>
  )
}
