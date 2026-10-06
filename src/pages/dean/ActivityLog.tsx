import { Link } from 'react-router-dom'
import { Source, formatDateTime } from '../../components/provenance'
import { Page, PageHeader } from '../../layouts/AppShell'
import type { Role } from '../../domain/types'
import { useStore } from '../../store/AppStore'

const ROLE_SOURCE: Record<Role, 'dean' | 'rule'> = { dean: 'dean', student: 'rule' }

export function ActivityLog() {
  const { state } = useStore()
  const name = (id?: string) => {
    const s = state.students.find((x) => x.id === id)
    return s ? `${s.firstName} ${s.lastName}` : null
  }
  return (
    <Page>
      <PageHeader title="Activity" />
      <ol className="panel divide-y divide-line">
        {state.audit.map((a) => (
          <li key={a.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <time className="num text-xs text-ink-3 sm:pt-0.5" dateTime={a.at}>
              {formatDateTime(a.at)}
            </time>
            <div className="text-sm">
              <div>
                {a.action}
                {a.studentId && name(a.studentId) && (
                  <>
                    {' '}
                    for{' '}
                    <Link to={`/dean/students/${a.studentId}`} className="font-medium hover:underline">
                      {name(a.studentId)}
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-0.5">
                <Source kind={ROLE_SOURCE[a.role]}>{a.actor}</Source>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Page>
  )
}
