import { ArrowUpIcon, InfoIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { studentContext } from '../../domain/aiContext'
import { answer, SUGGESTED_QUESTIONS, type AssistantReply } from '../../domain/assistant'
import { askAI } from '../../firebase/ai'
import { useStore, useStudentView } from '../../store/AppStore'

interface Turn {
  id: number
  question: string
  reply?: AssistantReply
  /** Live mode: Gemini's answer. */
  ai?: string
}

export function StudentAssistant() {
  const { state } = useStore()
  const view = useStudentView(state.session?.studentId)
  const [params, setParams] = useSearchParams()
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [focus, setFocus] = useState<string | undefined>(params.get('s') ?? undefined)
  const endRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const consumed = useRef(false)

  const ask = (question: string, subjectId?: string) => {
    if (!view || !question.trim()) return
    const id = ++seq.current
    const f = subjectId ?? focus
    const history = turns.filter((t) => t.ai).map((t) => ({ question: t.question, answer: t.ai! }))
    setTurns((t) => [...t, { id, question }])
    setDraft('')
    const rule = () => setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply: answer(question, view.ev, view.record, f) } : x)))
    // Live: Gemini explains the record. Demo, offline or on error: the rule-based assistant answers.
    if (state.mode === 'live')
      askAI(studentContext(view.ev, view.record), history, question).then(
        (text) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, ai: text } : x))),
        rule,
      )
    else setTimeout(rule, 450)
  }

  useEffect(() => {
    const q = params.get('q')
    if (q && view && !consumed.current) {
      consumed.current = true
      const s = params.get('s') ?? undefined
      setFocus(s)
      ask(q, s)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  if (!view) return null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-[760px] flex-col px-4 py-6 md:px-8 md:py-8 lg:min-h-dvh lg:py-10">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2rem]">Ask</h1>

      <div className="mt-6 flex-1 space-y-7" aria-live="polite">
        {turns.length === 0 && (
          <ul className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <li key={q}>
                <button className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-left text-sm transition-colors hover:border-ink-3" onClick={() => ask(q)}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}
        {turns.map((t) => (
          <div key={t.id} className="space-y-4">
            <div className="enter flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[0.9375rem] text-paper">{t.question}</p>
            </div>
            {t.ai ? <AiReply text={t.ai} /> : t.reply ? <Reply reply={t.reply} /> : <Thinking />}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-20 z-10 mt-6 bg-paper pt-2 lg:bottom-0 lg:pb-6">
        <label htmlFor="ask" className="sr-only">
          Question
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-2 focus-within:border-[var(--focus)]">
          <textarea
            id="ask"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(draft)
              }
            }}
            placeholder="Ask about a subject or your load"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[0.9375rem] outline-none placeholder:text-ink-3"
          />
          <button type="submit" className="btn btn-primary h-10 w-10 shrink-0 p-0" disabled={!draft.trim()} aria-label="Send">
            <ArrowUpIcon size={18} weight="bold" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-ink-3">
          {state.mode === 'live'
            ? 'AI answers from your record only. Your name and student number are not sent. Academic decisions are made by the dean.'
            : 'Answers are based on your evaluation. Academic decisions are made by the dean.'}
        </p>
      </form>
    </div>
  )
}

function Thinking() {
  return (
    <div className="margin-note space-y-2 py-1" aria-label="Preparing an explanation">
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-9/12" />
      <div className="skeleton h-3 w-10/12" />
    </div>
  )
}

function Reply({ reply }: { reply: AssistantReply }) {
  return (
    <article className="enter margin-note max-w-[68ch]">
      <div className="space-y-3 text-[0.9375rem] leading-relaxed">
        {reply.paragraphs.map((p, i) => (
          <div key={i} className="space-y-3">
            <p>{p}</p>
            {reply.list && reply.list.length > 0 && i === (reply.listAfter ?? reply.paragraphs.length - 1) && (
              <ul className="space-y-1">
                {reply.list.map((l, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-2" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {reply.referral && (
          <p className="flex items-start gap-2 rounded-md bg-seal-tint px-3 py-2 text-sm text-ink">
            <InfoIcon size={16} className="mt-0.5 shrink-0 text-seal-text" aria-hidden />
            {reply.referral}
          </p>
        )}
      </div>
      {reply.grounds.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-3 hover:text-ink-2">Sources</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {reply.grounds.map((g, i) => (
              <div key={i} className="contents">
                <dt className="code text-ink-2">{g.label}</dt>
                <dd>{g.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  )
}

/** Renders the model's plain-text answer: paragraphs and simple "-" or "*" lists, no HTML. */
function AiReply({ text }: { text: string }) {
  const blocks = text.replace(/\*\*(.+?)\*\*/g, '$1').split(/\n{2,}/)
  return (
    <article className="enter margin-note max-w-[68ch] space-y-3 text-[0.9375rem] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter((l) => l.trim())
        const list = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))
        return list ? (
          <ul key={i} className="space-y-1">
            {lines.map((l, j) => (
              <li key={j} className="flex gap-2.5">
                <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-2" aria-hidden />
                <span>{l.replace(/^\s*([-*•]|\d+\.)\s+/, '')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{lines.join(' ')}</p>
        )
      })}
    </article>
  )
}
