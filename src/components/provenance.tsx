import { ListChecksIcon, StampIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { YEAR_LABEL } from '../domain/term'
import type { YearLevel } from '../domain/types'

/**
 * Every result carries its source so users can always tell rule-based results,
 * and the dean's decisions apart.
 */
const SOURCES = {
  rule: { icon: ListChecksIcon, label: 'Rule-based evaluation' },
  dean: { icon: StampIcon, label: 'Dean decision' },
} as const

export function Source({ kind, children }: { kind: keyof typeof SOURCES; children?: React.ReactNode }) {
  const s = SOURCES[kind]
  const I = s.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
      <I size={13} aria-hidden />
      <span>{children ?? s.label}</span>
    </span>
  )
}

const fmt = new Intl.DateTimeFormat('en-PH', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' })
const fmtTime = new Intl.DateTimeFormat('en-PH', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})
export const formatDate = (iso: string) => fmt.format(new Date(iso))
export const formatDateTime = (iso: string) => fmtTime.format(new Date(iso))

/** The dean's stamp. The only element in the system rendered as "ink". */
export function Stamp({ kind, at, fresh }: { kind: 'confirmed' | 'approved'; at: string; fresh?: boolean }) {
  const [animate, setAnimate] = useState(fresh)
  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(() => setAnimate(false), 600)
    return () => clearTimeout(t)
  }, [fresh])
  return (
    <div className="stamp" data-fresh={animate || undefined} role="img" aria-label={`${kind === 'confirmed' ? 'Confirmed' : 'Approved'} by the Dean on ${formatDate(at)}`}>
      <span className="stamp-word">{kind === 'confirmed' ? 'Confirmed' : 'Approved'}</span>
      <span className="stamp-meta">Dean, ITE Department</span>
      <span className="stamp-meta">{formatDate(at)}</span>
    </div>
  )
}

export function standingText(y: YearLevel | null) {
  return y ? YEAR_LABEL[y] : 'Not recorded'
}
