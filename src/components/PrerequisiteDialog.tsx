import { CaretRightIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useState } from 'react'
import { prerequisiteCandidates, samePrerequisites, type PrerequisiteCandidate } from '../domain/curriculumAdmin'
import { SEM_LABEL, YEAR_LABEL } from '../domain/term'
import type { Curriculum, CurriculumSubject, Prerequisite, YearLevel } from '../domain/types'
import { Modal } from './controls'

/**
 * Choose a subject's prerequisites from its own curriculum. Candidates follow
 * the curriculum sequence; all selected prerequisites must be passed (the rule
 * the evaluation applies). Year standing and a reference are secondary.
 */
export function PrerequisiteDialog({
  curriculum,
  subject,
  open,
  onClose,
  onSave,
}: {
  curriculum: Curriculum
  subject: CurriculumSubject | null
  open: boolean
  onClose: () => void
  onSave: (prerequisites: Prerequisite[], reference: string) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        subject && (
          <>
            <h2 className="text-lg font-semibold">{subject.prerequisites.length ? 'Edit prerequisites' : 'Set prerequisite'}</h2>
            <p className="mt-1 text-[0.9375rem]">
              <span className="code text-ink-2">{subject.code}</span> <span className="font-medium">{subject.title}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              {curriculum.program} · Curriculum {curriculum.version}
            </p>
          </>
        )
      }
    >
      {subject && <Picker key={`${subject.id}-${open}`} curriculum={curriculum} subject={subject} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function Picker({
  curriculum,
  subject,
  onClose,
  onSave,
}: {
  curriculum: Curriculum
  subject: CurriculumSubject
  onClose: () => void
  onSave: (prerequisites: Prerequisite[], reference: string) => void
}) {
  const initialStanding = subject.prerequisites.find((p) => p.kind === 'standing')
  const [selected, setSelected] = useState<string[]>(subject.prerequisites.flatMap((p) => (p.kind === 'subject' ? [p.subjectId] : [])))
  const [standing, setStanding] = useState(initialStanding?.kind === 'standing' ? String(initialStanding.year) : '')
  const [reference, setReference] = useState('')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const listId = useId()

  const byId = useMemo(() => new Map(curriculum.subjects.map((s) => [s.id, s])), [curriculum])
  const groups = prerequisiteCandidates(curriculum, subject.id, query)
  const flat = groups.flatMap((y) => y.semesters.flatMap((g) => g.candidates))
  const selectable = flat.filter((c) => !c.isSelf && !c.circular)
  const anyEligible = useMemo(
    () => prerequisiteCandidates(curriculum, subject.id).some((y) => y.semesters.some((g) => g.candidates.some((c) => !c.isSelf && !c.circular))),
    [curriculum, subject.id],
  )
  const firstLater = flat.find((c) => c.later && !c.isSelf)?.subject.id

  const next: Prerequisite[] = [
    ...selected.map((id): Prerequisite => ({ kind: 'subject', subjectId: id })),
    ...(standing ? [{ kind: 'standing', year: Number(standing) as YearLevel } as Prerequisite] : []),
  ]
  const changed = !samePrerequisites(next, subject.prerequisites)

  const toggle = (id: string) => setSelected((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  // Bring an existing prerequisite into view when the dialog opens.
  useEffect(() => {
    const first = subject.prerequisites.find((p) => p.kind === 'subject')
    if (first?.kind === 'subject') document.getElementById(`${listId}-${first.subjectId}`)?.scrollIntoView({ block: 'center' })
  }, [listId, subject.prerequisites])

  // Keep the active option visible while navigating with the keyboard.
  useEffect(() => {
    if (active) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  const move = (dir: 1 | -1) => {
    if (!selectable.length) return
    const i = selectable.findIndex((c) => c.subject.id === active)
    const n = i < 0 ? (dir === 1 ? 0 : selectable.length - 1) : Math.min(Math.max(i + dir, 0), selectable.length - 1)
    setActive(selectable[n].subject.id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-1 pb-3">
        <label className="relative block">
          <span className="sr-only">
            Search subjects in {curriculum.program} {curriculum.version}
          </span>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            data-autofocus
            className="input h-10 pl-9 text-sm"
            placeholder="Search by code or title"
            value={query}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={active ? `${listId}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                move(1)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                move(-1)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const target = active ?? (selectable.length === 1 ? selectable[0].subject.id : null)
                if (target) toggle(target)
              } else if (e.key === 'Escape' && query) {
                e.preventDefault()
                e.stopPropagation()
                setQuery('')
              }
            }}
          />
        </label>
      </div>

      <div id={listId} role="listbox" aria-multiselectable="true" aria-label="Subjects" className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-5 pb-4">
        {!anyEligible ? (
          <p className="py-10 text-center text-sm text-ink-2">No eligible subjects in this curriculum.</p>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-2">No subjects match “{query.trim()}”.</p>
        ) : (
          groups.map((y) => (
            <div key={y.year}>
              {y.semesters.map((g) => (
                <div
                  key={g.semester}
                  role="group"
                  aria-label={`${YEAR_LABEL[y.year]}, ${SEM_LABEL[g.semester]}${g.candidates.some((c) => c.later && !c.isSelf) ? ', same term or later' : ''}`}
                >
                  {g.candidates.some((c) => c.subject.id === firstLater) && (
                    <div className="mt-5 flex items-center gap-3 text-xs text-ink-3" aria-hidden>
                      <span className="h-px flex-1 bg-line" />
                      Same term or later
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <div className="sticky top-0 z-10 -mx-5 flex items-baseline gap-2 bg-surface px-5 pt-3 pb-1.5 text-xs" aria-hidden>
                    <span className="font-semibold text-ink-2">{YEAR_LABEL[y.year]}</span>
                    <span className="text-ink-3">{SEM_LABEL[g.semester]}</span>
                  </div>
                  {g.candidates.map((c) => (
                    <Option
                      key={c.subject.id}
                      id={`${listId}-${c.subject.id}`}
                      c={c}
                      checked={selected.includes(c.subject.id)}
                      active={active === c.subject.id}
                      onToggle={() => toggle(c.subject.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <details className="group border-t border-line px-5" open={!!initialStanding || undefined}>
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <CaretRightIcon size={12} className="transition-transform duration-150 group-open:rotate-90" aria-hidden />
          More options
          {standing && <span className="text-xs text-ink-3">· {YEAR_LABEL[Number(standing) as YearLevel]} standing</span>}
        </summary>
        <div className="grid gap-3 pb-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Year standing requirement</span>
            <select className="input h-9 text-sm" value={standing} onChange={(e) => setStanding(e.target.value)}>
              <option value="">None</option>
              {([2, 3, 4] as const).map((y) => (
                <option key={y} value={y}>
                  {YEAR_LABEL[y]} standing
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">
              Approval reference <span className="font-normal text-ink-3">(optional)</span>
            </span>
            <input className="input h-9 text-sm" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Memo or document no." />
          </label>
        </div>
      </details>

      <footer className="flex flex-row items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-xl">
        <div className="min-w-0 text-sm" aria-live="polite">
          {selected.length === 0 ? (
            <span className="text-ink-3">None selected</span>
          ) : (
            <>
            <span className="text-ink-2 sm:hidden">{selected.length > 1 ? `${selected.length} selected · all required` : byId.get(selected[0])?.code}</span>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <span className="mr-1 text-xs text-ink-3">{selected.length > 1 ? `${selected.length} selected · all required` : 'Selected'}</span>
              {selected.map((id) => {
                const s = byId.get(id)
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface py-0.5 pr-0.5 pl-2 text-[0.8125rem]">
                    <span className="code">{s?.code}</span>
                    {selected.length === 1 && <span className="max-w-[14rem] truncate text-ink-2">{s?.title}</span>}
                    <button type="button" className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-sunken hover:text-ink" onClick={() => toggle(id)} aria-label={`Remove ${s?.code}`}>
                      <XIcon size={12} />
                    </button>
                  </span>
                )
              })}
            </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!changed} onClick={() => onSave(next, reference.trim())}>
            Save
          </button>
        </div>
      </footer>
    </div>
  )
}

function Option({
  id,
  c,
  checked,
  active,
  onToggle,
}: {
  id: string
  c: PrerequisiteCandidate
  checked: boolean
  active: boolean
  onToggle: () => void
}) {
  const disabled = c.isSelf || c.circular
  return (
    <div
      id={id}
      role="option"
      aria-selected={checked}
      aria-disabled={disabled || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => !disabled && onToggle()}
      className={`-mx-2 flex scroll-mt-9 scroll-mb-2 items-start gap-3 rounded-md px-2 py-2 transition-colors duration-100 sm:items-center ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-sunken' : disabled ? '' : '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2'} ${active && !disabled ? 'ring-2 ring-[var(--focus)] ring-inset' : ''}`}
    >
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center sm:mt-0 justify-center rounded border-[1.5px] transition-colors duration-100 ${
          checked ? 'border-ink bg-ink text-paper' : disabled ? 'border-line bg-sunken' : 'border-ink-3 bg-surface'
        }`}
        aria-hidden
      >
        {checked && <CheckIcon size={11} weight="bold" />}
      </span>
      <span className={`code mt-0.5 w-20 shrink-0 sm:mt-0 sm:w-24 ${disabled ? 'text-ink-3' : 'text-ink-2'}`}>{c.subject.code}</span>
      <span className={`min-w-0 flex-1 line-clamp-2 text-sm sm:truncate ${disabled ? 'text-ink-3' : 'font-medium'}`}>{c.subject.title}</span>
      {c.isSelf && <span className="shrink-0 text-xs text-ink-3">This subject</span>}
      {c.circular && <span className="shrink-0 text-xs text-ink-3">Would create a cycle</span>}
    </div>
  )
}
