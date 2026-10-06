import { XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

/** Two or more mutually exclusive views. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  panelId,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  panelId?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = options.length - 1
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="flex w-full rounded-lg border border-line bg-sunken p-0.5 md:inline-flex md:w-auto">
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`tab-${o.value}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={`h-8 flex-1 rounded-md px-3.5 text-sm font-medium md:flex-none transition-[background-color,color,box-shadow] duration-150 ${
              active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(18_23_41/0.08),0_0_0_1px_var(--line)]' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] ${
        checked ? 'bg-ink' : 'bg-sunken ring-1 ring-ink-3 ring-inset'
      }`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[var(--ease-out)] ${checked ? 'translate-x-4 bg-surface' : 'bg-ink-3'}`} />
    </button>
  )
}

/** Labelled compact select used in toolbars. The label is visible above on wide screens. */
export function FieldSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-3">{label}</span>
      <select className="input h-9 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Centered modal dialog for focused edits. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  xl,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Full working area, for side-by-side review. */
  xl?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // On fine pointers, start in the marked field; on touch, focus the dialog
      // itself so the soft keyboard does not cover the content on open.
      if (matchMedia('(pointer: fine)').matches) d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
      else d.querySelector<HTMLElement>('section[tabindex]')?.focus()
      requestAnimationFrame(() => setShown(true))
    } else if (!open && d.open) {
      setShown(false)
      const t = setTimeout(() => d.close(), 150)
      return () => clearTimeout(t)
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => (e.preventDefault(), onClose())}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
      aria-labelledby="modal-title"
    >
      <div className="sheet-backdrop fixed inset-0" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <section
          tabIndex={-1}
          className={`modal pointer-events-auto flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface outline-none sm:rounded-xl ${xl ? 'h-[94dvh] sm:h-[min(880px,92dvh)] sm:max-w-[1120px]' : wide ? 'h-[92dvh] sm:h-[min(760px,88dvh)] sm:max-w-[640px]' : 'sm:max-w-[520px]'}`}
          data-shown={shown || undefined}
        >
          <header className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div id="modal-title" className="min-w-0 flex-1">
              {title}
            </div>
            <button className="btn btn-ghost -mt-1 -mr-2 h-8 w-8 p-0" onClick={onClose} aria-label="Close">
              <XIcon size={16} />
            </button>
          </header>
          <div className={`min-h-0 flex-1 ${wide || xl ? 'flex flex-col' : 'overflow-y-auto px-5 pb-4'}`}>{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </section>
      </div>
    </dialog>
  )
}
