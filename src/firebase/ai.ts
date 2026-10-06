import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import { getApp } from 'firebase/app'
import { SYSTEM_INSTRUCTION } from '../domain/aiContext'
import { firebase } from './app'

/** Model named in the paper; runs on the free Spark plan through the Gemini Developer API. */
export const AI_MODEL = 'gemini-3.5-flash-lite'

export interface ChatTurn {
  question: string
  answer: string
}

/** Asks Gemini about the student's own record. The record goes in the system instruction, never the name or number. */
export async function askAI(context: string, history: ChatTurn[], question: string): Promise<string> {
  firebase()
  const ai = getAI(getApp(), { backend: new GoogleAIBackend() })
  const model = getGenerativeModel(ai, {
    model: AI_MODEL,
    systemInstruction: `${SYSTEM_INSTRUCTION}\n\nSTUDENT RECORD\n${context}`,
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  })
  const chat = model.startChat({
    history: history.flatMap((t) => [
      { role: 'user' as const, parts: [{ text: t.question }] },
      { role: 'model' as const, parts: [{ text: t.answer }] },
    ]),
  })
  const res = await chat.sendMessage(question)
  const text = res.response.text().trim()
  if (!text) throw new Error('empty')
  return text
}
