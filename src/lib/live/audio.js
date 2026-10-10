// Browser audio for Gemini Live.
//   Mic:   getUserMedia → AudioWorklet → 16 kHz mono PCM16 → base64 chunks (~40 ms)
//   Player: base64 PCM16 @ 24 kHz → gapless scheduled playback, clearable on barge-in
// Both expose a 0..1 level for waveform UIs.

const WORKLET_SRC = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / 16000;
    this.buf = [];
    this.acc = 0;
    this.pos = 0;
    this.frame = 640; // 40 ms @ 16 kHz
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let peak = 0;
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      if (Math.abs(v) > peak) peak = Math.abs(v);
      this.pos += 1;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;
        const s = Math.max(-1, Math.min(1, v));
        this.buf.push(s < 0 ? s * 0x8000 : s * 0x7fff);
      }
    }
    if (this.buf.length >= this.frame) {
      const out = new Int16Array(this.buf.splice(0, this.frame));
      this.port.postMessage({ pcm: out.buffer, peak }, [out.buffer]);
    } else {
      this.port.postMessage({ peak });
    }
    return true;
  }
}
registerProcessor('pcm-downsampler', PcmDownsampler);
`

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH))
  }
  return btoa(bin)
}

function fromBase64(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export async function startMic({ onChunk, onLevel }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') await ctx.resume()
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
  await ctx.audioWorklet.addModule(url)
  URL.revokeObjectURL(url)
  const src = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, 'pcm-downsampler')
  let muted = false
  let smooth = 0
  node.port.onmessage = (e) => {
    const { pcm, peak } = e.data
    smooth = smooth * 0.7 + (muted ? 0 : peak) * 0.3
    onLevel?.(Math.min(1, smooth * 2.2))
    if (pcm && !muted) onChunk(toBase64(pcm))
  }
  src.connect(node)
  // Keep the graph pulling without routing mic to the speakers.
  const sink = ctx.createGain()
  sink.gain.value = 0
  node.connect(sink).connect(ctx.destination)

  return {
    setMuted(m) {
      muted = m
    },
    async stop() {
      try {
        node.port.onmessage = null
        src.disconnect()
        node.disconnect()
        stream.getTracks().forEach((t) => t.stop())
        await ctx.close()
      } catch {
        /* already closed */
      }
    },
  }
}

export function createPlayer({ onLevel } = {}) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
  const gain = ctx.createGain()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  gain.connect(analyser).connect(ctx.destination)
  let nextTime = 0
  let sources = new Set()
  let raf = 0
  const data = new Uint8Array(analyser.frequencyBinCount)

  const meter = () => {
    analyser.getByteTimeDomainData(data)
    let peak = 0
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128)
    onLevel?.(Math.min(1, peak * 1.8))
    raf = requestAnimationFrame(meter)
  }
  if (onLevel) raf = requestAnimationFrame(meter)

  return {
    get playing() {
      return sources.size > 0
    },
    async resume() {
      if (ctx.state === 'suspended') await ctx.resume()
    },
    enqueue(b64) {
      const pcm = new Int16Array(fromBase64(b64))
      const f32 = new Float32Array(pcm.length)
      for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 0x8000
      const buf = ctx.createBuffer(1, f32.length, 24000)
      buf.copyToChannel(f32, 0)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(gain)
      const now = ctx.currentTime
      if (nextTime < now + 0.03) nextTime = now + 0.03
      src.start(nextTime)
      nextTime += buf.duration
      sources.add(src)
      src.onended = () => sources.delete(src)
    },
    // Barge-in: drop everything queued.
    clear() {
      sources.forEach((s) => {
        try {
          s.stop()
        } catch {
          /* noop */
        }
      })
      sources = new Set()
      nextTime = 0
    },
    // Resolves when queued audio finishes (or after maxMs).
    drain(maxMs = 8000) {
      return new Promise((resolve) => {
        const end = Date.now() + maxMs
        const check = () => {
          if (sources.size === 0 || Date.now() > end) resolve()
          else setTimeout(check, 120)
        }
        check()
      })
    },
    setVolume(v) {
      gain.gain.value = v
    },
    async close() {
      cancelAnimationFrame(raf)
      this.clear()
      try {
        await ctx.close()
      } catch {
        /* noop */
      }
    },
  }
}
