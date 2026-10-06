import { XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Side sheet on wide screens, bottom sheet on phones. Built on <dialog> for
 * focus containment and Escape handling.
 */
export function Sheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      requestAnimationFrame(() => setShown(true))
    } else if (!open && d.open) {
      setShown(false)
      const t = setTimeout(() => d.close(), 220)
      return () => clearTimeout(t)
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
      aria-labelledby="sheet-title"
    >
      <div className="sheet-backdrop fixed inset-0" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} aria-hidden />
      <section
        className="sheet fixed inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-surface md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-xl"
        style={{ transform: shown ? 'none' : `var(--sheet-hidden)` }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-4 md:px-6 md:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="text-lg font-semibold">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
          </div>
          <button className="btn btn-ghost -mr-2 h-9 w-9 p-0" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">{children}</div>
      </section>
    </dialog>
  )
}
