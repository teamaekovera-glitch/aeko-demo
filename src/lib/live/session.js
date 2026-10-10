// One Gemini Live voice session in the browser.
// Auth: an ephemeral token minted by our API (/api/live/token) — the Gemini
// key never reaches the browser. Audio goes browser ↔ Gemini directly.
import { GoogleGenAI, Modality } from '@google/genai'
import { api } from './api.js'
import { startMic, createPlayer } from './audio.js'

const FALLBACK_MODEL = 'gemini-3.8-live'
const FALLBACK_VOICE = 'Umbriel'

/**
 * startLiveSession({
 *   purpose, callId, systemInstruction, tools: [{ name, description, parametersJsonSchema }],
 *   kickoff,                 // text sent once connected so Aeko speaks first
 *   onToolCall(name, args)   // may return a result object (or a Promise of one)
 *   onTranscript({ speaker: 'aeko'|'user', text, final })
 *   onAekoLevel(0..1), onUserLevel(0..1)
 *   onState('connecting'|'live'|'speaking'|'listening'|'ended'|'error', detail)
 * }) → { stop(), setMicMuted(bool), sendText(str), drain() }
 */
export async function startLiveSession(opts) {
  const {
    purpose,
    callId,
    systemInstruction,
    tools = [],
    kickoff,
    onToolCall,
    onTranscript,
    onAekoLevel,
    onUserLevel,
    onState,
  } = opts

  onState?.('connecting')
  const player = createPlayer({ onLevel: onAekoLevel })
  await player.resume()

  const { token, model, voice } = await api.liveToken(purpose, callId)
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })

  let closed = false
  let mic = null
  let aekoText = ''
  let userText = ''
  let speakingTimer = 0

  const flush = (who) => {
    if (who === 'aeko' && aekoText.trim()) {
      onTranscript?.({ speaker: 'aeko', text: aekoText.trim(), final: true })
      aekoText = ''
    }
    if (who === 'user' && userText.trim()) {
      onTranscript?.({ speaker: 'user', text: userText.trim(), final: true })
      userText = ''
    }
  }

  const config = {
    responseModalities: [Modality.AUDIO],
    systemInstruction,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || FALLBACK_VOICE } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: 700 } },
  }
  if (tools.length) config.tools = [{ functionDeclarations: tools }]

  let session
  // eslint-disable-next-line prefer-const
  session = await ai.live.connect({
    model: model || FALLBACK_MODEL,
    config,
    callbacks: {
      onopen: () => onState?.('live'),
      onerror: (e) => onState?.('error', e?.message || 'connection error'),
      onclose: (e) => {
        if (!closed) onState?.('ended', e?.reason || '')
      },
      onmessage: async (msg) => {
        const sc = msg.serverContent
        if (sc) {
          if (sc.interrupted) {
            player.clear()
            flush('aeko')
          }
          for (const part of sc.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              player.enqueue(part.inlineData.data)
              onState?.('speaking')
              clearTimeout(speakingTimer)
            }
          }
          if (sc.inputTranscription?.text) {
            // user started talking → Aeko's previous line is complete
            if (aekoText) flush('aeko')
            userText += sc.inputTranscription.text
            onTranscript?.({ speaker: 'user', text: userText.trim(), final: false })
          }
          if (sc.outputTranscription?.text) {
            if (userText) flush('user')
            aekoText += sc.outputTranscription.text
            onTranscript?.({ speaker: 'aeko', text: aekoText.trim(), final: false })
          }
          if (sc.turnComplete || sc.generationComplete) {
            flush('aeko')
            clearTimeout(speakingTimer)
            speakingTimer = setTimeout(() => {
              if (!closed) onState?.('listening')
            }, 400)
          }
        }
        const calls = msg.toolCall?.functionCalls ?? []
        if (calls.length) {
          flush('user')
          const functionResponses = []
          for (const fc of calls) {
            let result = { ok: true }
            try {
              const r = await onToolCall?.(fc.name, fc.args || {})
              if (r) result = r
            } catch (err) {
              result = { ok: false, error: String(err?.message || err) }
            }
            functionResponses.push({ id: fc.id, name: fc.name, response: { result } })
          }
          try {
            session?.sendToolResponse({ functionResponses })
          } catch {
            /* session closing */
          }
        }
        if (msg.goAway) onState?.('error', 'session ending soon')
      },
    },
  })

  mic = await startMic({
    onLevel: onUserLevel,
    onChunk: (b64) => {
      if (closed) return
      try {
        session.sendRealtimeInput({ audio: { data: b64, mimeType: 'audio/pcm;rate=16000' } })
      } catch {
        /* socket closing */
      }
    },
  })

  if (kickoff) {
    try {
      session.sendRealtimeInput({ text: kickoff })
    } catch {
      /* noop */
    }
  }

  return {
    setMicMuted: (m) => mic?.setMuted(m),
    sendText: (text) => session.sendRealtimeInput({ text }),
    drain: (ms) => player.drain(ms),
    async stop() {
      if (closed) return
      closed = true
      flush('user')
      flush('aeko')
      clearTimeout(speakingTimer)
      try {
        session.close()
      } catch {
        /* noop */
      }
      await mic?.stop()
      await player.close()
      onState?.('ended')
    },
  }
}

// Tool schemas shared by the screens.
export const SUPPLIER_CALL_TOOLS = [
  {
    name: 'record_outcome',
    description:
      'Record whether this supplier can take the project. Call as soon as the answer is clear.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        outcome: { type: 'string', enum: ['YES', 'NO', 'MAYBE'] },
        reason: { type: 'string', description: 'One short line, e.g. "Rack ovens only" or "40 m tunnel oven + allergen room"' },
        language: { type: 'string', description: 'Language code the supplier spoke: en, hi, mr or no' },
      },
      required: ['outcome', 'reason'],
    },
  },
  {
    name: 'end_call',
    description: 'Hang up after the closing line has been spoken.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
]

export const BRAND_INTAKE_TOOLS = [
  {
    name: 'submit_project_request',
    description: 'Save the brand’s sourcing request once product, volume and key requirements are known.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One-line English summary of the request' },
        category: { type: 'string', description: 'cookies, beverages, sauces, snacks, dairy, confectionery, packaging, other' },
        product: { type: 'string' },
        volume: { type: 'integer', description: 'Units for the first run' },
        moq: { type: 'integer', description: 'Maximum acceptable supplier MOQ, if stated' },
        equipment: { type: 'array', items: { type: 'string' }, description: 'e.g. tunnel oven, hot-fill line' },
        requirements: { type: 'array', items: { type: 'string' }, description: 'e.g. allergen-controlled line, organic, SQF' },
        packaging: { type: 'string' },
        deadline: { type: 'string' },
        language: { type: 'string', description: 'Language the brand spoke: en, hi, mr or no' },
      },
      required: ['summary', 'category', 'product'],
    },
  },
  {
    name: 'end_session',
    description: 'Close the intake after the closing line has been spoken.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
]

export const BRAND_INTAKE_INSTRUCTION = `You are Aeko, the sourcing agent at Aekovera. A CPG brand founder is talking to you to start a sourcing request. Speak casually, like a real person on the phone — warm, quick and confident, a sharp friendly assistant (think Friday from Iron Man). Say the names plainly: \"Aeko\" and \"Aekovera\". Keep every turn to one or two short sentences.
Language: reply in the language the founder speaks — English, Hindi or Marathi — and switch if they switch. Never use any other language.
Goal: capture product, category, first-run volume in units, key equipment or process requirements (e.g. tunnel oven, hot-fill), certifications or line requirements (e.g. allergen-controlled), packaging, and deadline. Ask at most two short follow-up questions, only for what is missing and important (volume and the key requirement matter most).
When you have enough, call submit_project_request (all field values in English), then say exactly the spirit of: "Got it. Give me a little time — go grab a coffee or knock out a chore, and I'll call you right back with the makers who can actually run it." Then call end_session.`

export const BRAND_CALLBACK_TOOLS = [
  {
    name: 'choose_option',
    description: 'Record which supplier the brand wants to meet first.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        supplierId: { type: 'string', description: 'The supplierId of the chosen option' },
      },
      required: ['supplierId'],
    },
  },
  {
    name: 'end_call',
    description: 'Hang up after the goodbye has been spoken.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
]
