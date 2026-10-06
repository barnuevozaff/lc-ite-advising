import { useState } from 'react'
import { LOAD_BASIS_LABEL, unitsOf } from '../domain/rules'
import { YEAR_LABEL } from '../domain/term'
import type { Evaluation, LoadLine } from '../domain/types'
import { ClassificationTag, StatusTag } from './status'

const PROGRAM_NAME = {
  BSCS: 'BS Computer Science',
  BSIT: 'BS Information Technology',
} as const

/** Keeps the last non-null value so closing sheets don't blank their content mid-animation. */
export function useLatched<T>(value: T | null): T | null {
  const [latched, setLatched] = useState<T | null>(value)
  if (value !== null && value !== latched) setLatched(value)
  return value ?? latched
}

/** Name plus one metadata line: program, curriculum, recorded standing, classification. */
export function StudentHeading({ ev, actions }: { ev: Evaluation; actions?: React.ReactNode }) {
  const s = ev.student
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2rem]">
          {s.firstName} {s.lastName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-ink-2">
          <span className="num text-[0.875rem]">{s.studentNo}</span>
          <Dot />
          <span>{PROGRAM_NAME[s.program]}</span>
          <Dot />
          <span title={`Entry AY ${s.entryAY}`}>
            {s.program} {s.curriculumVersion}
          </span>
          <Dot />
          {s.yearStanding ? <span>{YEAR_LABEL[s.yearStanding]}</span> : <span className="text-data">Year standing not recorded</span>}
          {s.transferee && (
            <>
              <Dot />
              <span>Transferee</span>
            </>
          )}
          <span className="ml-1">
            <ClassificationTag value={ev.classification} />
          </span>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

function Dot() {
  return (
    <span className="text-line-strong" aria-hidden>
      ·
    </span>
  )
}

export function LoadTable({
  ids,
  ev,
  showBasis,
  onSelect,
}: {
  ids: string[]
  ev: Evaluation
  showBasis?: boolean
  onSelect?: (id: string) => void
}) {
  const lines: LoadLine[] = ev.load.kind !== 'none' ? ev.load.lines : []
  const basisOf = (id: string) => {
    const b = lines.find((l) => l.subjectId === id)?.basis
    return b === 'current' || b === 'prescribed' ? undefined : b
  }
  if (ids.length === 0)
    return <p className="px-5 py-8 text-center text-sm text-ink-2">No subjects in this load.</p>
  return (
    <div className="overflow-x-auto">
      <table className="ledger">
        <thead>
          <tr>
            <th className="w-28 pl-4 md:pl-5">Code</th>
            <th>Descriptive title</th>
            <th className="w-16 pr-4 text-right md:pr-5">Units</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const x = ev.subjects[id]
            const b = basisOf(id)
            return (
              <tr key={id} data-interactive={onSelect ? true : undefined} onClick={() => onSelect?.(id)}>
                <td className="code pl-4 align-top md:pl-5">{x.subject.code}</td>
                <td>
                  <div className="font-medium">{x.subject.title}</div>
                  {x.status !== 'eligible' && x.status !== 'failed' && (
                    <div className="mt-1">
                      <StatusTag status={x.status} />
                    </div>
                  )}
                  {showBasis && b && <div className="mt-0.5 text-xs text-ink-3">{LOAD_BASIS_LABEL[b]}</div>}
                </td>
                <td className="num pr-4 text-right md:pr-5">{x.subject.units}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="pl-4 md:pl-5" colSpan={2}>
              <span className="text-sm">
                {ids.length} subject{ids.length === 1 ? '' : 's'}
              </span>
            </td>
            <td className="num pr-4 text-right md:pr-5">{unitsOf(ids)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
