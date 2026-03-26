let audioContext: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

// Low-level: play a note with envelope
function note(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 0.08,
  delay = 0,
  slideToFreq?: number,
) {
  try {
    const c = ctx();
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, t + duration * 0.8);
    }

    // ADSR-like envelope: quick attack, sustain, fade
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01); // attack
    gain.gain.setValueAtTime(vol, t + duration * 0.3); // sustain
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // release

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

// Play chord (multiple notes at once)
function chord(freqs: number[], duration: number, type: OscillatorType = 'sine', vol = 0.04, delay = 0) {
  freqs.forEach((f) => note(f, duration, type, vol, delay));
}

// Noise burst (for percussive sounds)
function noise(duration: number, vol = 0.03, delay = 0) {
  try {
    const c = ctx();
    const t = c.currentTime + delay;
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t);
  } catch {}
}

// ═══════════ Exported sound effects ═══════════

// Agent spawns a sub-agent: cheerful ascending arpeggio
export function playSubAgentSpawn() {
  note(523, 0.12, 'square', 0.05);       // C5
  note(659, 0.12, 'square', 0.05, 0.06); // E5
  note(784, 0.15, 'square', 0.06, 0.12); // G5
  noise(0.05, 0.02, 0.12);
}

// Sub-agent completes: satisfying two-note chime
export function playSubAgentComplete() {
  note(784, 0.1, 'sine', 0.05);           // G5
  note(1047, 0.25, 'sine', 0.06, 0.08);   // C6
  noise(0.03, 0.01, 0.08);
}

// Sub-agent error: descending minor buzz
export function playSubAgentError() {
  note(370, 0.15, 'sawtooth', 0.04);        // F#4
  note(311, 0.25, 'sawtooth', 0.04, 0.1);   // Eb4
  noise(0.08, 0.02);
}

// Agent starts: warm power-up chord
export function playAgentStart() {
  chord([262, 330, 392], 0.15, 'triangle', 0.03);     // C4 chord
  chord([330, 392, 523], 0.25, 'triangle', 0.04, 0.12); // E4 chord
  noise(0.04, 0.015, 0.12);
}

// Agent stops: gentle power-down
export function playAgentStop() {
  note(523, 0.12, 'triangle', 0.04);        // C5
  note(392, 0.15, 'triangle', 0.04, 0.08);  // G4
  note(262, 0.3, 'triangle', 0.03, 0.16);   // C4
}

// Tool-specific sounds (shorter, more subtle)

// Read: soft page flip
export function playToolRead() {
  noise(0.06, 0.02);
  note(880, 0.08, 'sine', 0.03, 0.02);
}

// Write: pen scratch
export function playToolWrite() {
  noise(0.04, 0.025);
  note(698, 0.06, 'square', 0.02, 0.01);
  note(784, 0.08, 'square', 0.025, 0.04);
}

// Bash: terminal keystroke
export function playToolBash() {
  noise(0.03, 0.03);
  note(440, 0.05, 'square', 0.02);
}

// Search: sonar ping
export function playToolSearch() {
  note(1047, 0.2, 'sine', 0.04, 0, 2093); // C6 sliding up
  noise(0.02, 0.01);
}

// Think: contemplative hum
export function playToolThink() {
  note(330, 0.3, 'sine', 0.03);
  note(415, 0.25, 'sine', 0.02, 0.1);
}

// Legacy exports for compatibility
export const playTone = note;
export function playChord(freqs: number[], duration: number, type: OscillatorType = 'sine', vol = 0.05) {
  chord(freqs, duration, type, vol);
}
