import {
  ArrowCircleRightIcon,
  BookOpenIcon,
  CalendarXIcon,
  CertificateIcon,
  CheckCircleIcon,
  CircleIcon,
  HourglassMediumIcon,
  LockIcon,
  MinusCircleIcon,
  NotePencilIcon,
  QuestionIcon,
  StampIcon,
  WarningCircleIcon,
  WarningIcon,
  XCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { statusPhrase, statusShort, ADVISING_STATE_LABEL } from '../domain/rules'
import type { AdvisingState, Classification, Flag, SubjectStatus } from '../domain/types'

type Tone = 'ok' | 'bad' | 'warn' | 'act' | 'data' | 'teal' | 'mute' | 'seal'

const TONE: Record<Tone, { fg: string; bg: string }> = {
  ok: { fg: 'var(--ok)', bg: 'var(--ok-tint)' },
  bad: { fg: 'var(--bad)', bg: 'var(--bad-tint)' },
  warn: { fg: 'var(--warn)', bg: 'var(--warn-tint)' },
  act: { fg: 'var(--act)', bg: 'var(--act-tint)' },
  data: { fg: 'var(--data)', bg: 'var(--data-tint)' },
  teal: { fg: 'var(--teal)', bg: 'var(--teal-tint)' },
  mute: { fg: 'var(--mute)', bg: 'var(--mute-tint)' },
  seal: { fg: 'var(--seal-text)', bg: 'var(--seal-tint)' },
}

export const STATUS_META: Record<SubjectStatus, { tone: Tone; icon: Icon }> = {
  passed: { tone: 'ok', icon: CheckCircleIcon },
  credited: { tone: 'ok', icon: CertificateIcon },
  failed: { tone: 'bad', icon: XCircleIcon },
  notTaken: { tone: 'mute', icon: CircleIcon },
  eligible: { tone: 'teal', icon: ArrowCircleRightIcon },
  blocked: { tone: 'warn', icon: LockIcon },
  notOffered: { tone: 'mute', icon: CalendarXIcon },
  enrolled: { tone: 'seal', icon: BookOpenIcon },
  pending: { tone: 'act', icon: HourglassMediumIcon },
  notCompletedReview: { tone: 'act', icon: MinusCircleIcon },
  notCompleted: { tone: 'mute', icon: MinusCircleIcon },
  recordUpdate: { tone: 'data', icon: NotePencilIcon },
  deanReview: { tone: 'seal', icon: StampIcon },
}

function Tag({ tone, icon: I, label, quiet, title }: { tone: Tone; icon: Icon; label: string; quiet?: boolean; title?: string }) {
  const t = TONE[tone]
  return (
    <span className={`tag ${quiet ? 'tag-quiet' : ''}`} style={{ color: t.fg, background: t.bg }} title={title}>
      <I size={14} weight="bold" aria-hidden />
      {label}
    </span>
  )
}

export function StatusTag({ status, quiet, full, flag }: { status: SubjectStatus; quiet?: boolean; full?: boolean; flag?: Flag }) {
  const m = STATUS_META[status]
  const base = full ? statusPhrase(status) : statusShort(status)
  const label = flag ? `${base} · ${flag === 'needsAction' ? 'Needs action' : 'Needs attention'}` : base
  return <Tag tone={m.tone} icon={m.icon} label={label} quiet={quiet} title={full ? undefined : statusPhrase(status)} />
}

export function FlagTag({ flag }: { flag: Flag }) {
  return flag === 'needsAction' ? (
    <Tag tone="act" icon={WarningCircleIcon} label="Needs action" />
  ) : (
    <Tag tone="act" icon={WarningIcon} label="Needs attention" />
  )
}

export function ClassificationTag({ value }: { value: Classification }) {
  if (value === 'regular') return <Tag tone="ok" icon={CheckCircleIcon} label="Regular" />
  if (value === 'irregular') return <Tag tone="warn" icon={WarningIcon} label="Irregular" />
  return <Tag tone="data" icon={QuestionIcon} label="Undetermined" />
}

export function AdvisingStateTag({ state }: { state: AdvisingState }) {
  const map: Record<AdvisingState, { tone: Tone; icon: Icon }> = {
    awaitingConfirmation: { tone: 'mute', icon: HourglassMediumIcon },
    awaitingReview: { tone: 'mute', icon: HourglassMediumIcon },
    recordUpdate: { tone: 'data', icon: NotePencilIcon },
    confirmed: { tone: 'seal', icon: StampIcon },
    approved: { tone: 'seal', icon: StampIcon },
  }
  const m = map[state]
  return <Tag tone={m.tone} icon={m.icon} label={ADVISING_STATE_LABEL[state]} quiet={state === 'awaitingConfirmation' || state === 'awaitingReview'} />
}

export function toneColor(status: SubjectStatus) {
  return TONE[STATUS_META[status].tone].fg
}
