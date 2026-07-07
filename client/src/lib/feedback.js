// Lightweight tap sounds + haptics for Recipro. Synthesized (no assets), theme-aware.
// Solemn theme gets softer, quieter cues (funerals).

const MUTE_KEY = 'recipro_muted';
let ctx = null;

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(v) {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// kind: 'tap' | 'success' | 'close' ; solemn = quieter/lower
export function feedback(kind = 'tap', solemn = false) {
  vibrate(kind);
  if (isMuted()) return;
  const c = audioCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const base = { tap: 660, success: 880, close: 392 }[kind] || 660;
    const freq = solemn ? base * 0.75 : base;
    const peak = solemn ? 0.06 : 0.14;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.start(now);
    o.stop(now + 0.24);

    // success gets a gentle second note (a chime)
    if (kind === 'success') {
      const o2 = c.createOscillator();
      const g2 = c.createGain();
      o2.type = 'sine';
      o2.frequency.value = freq * 1.5;
      o2.connect(g2);
      g2.connect(c.destination);
      g2.gain.setValueAtTime(0.0001, now + 0.08);
      g2.gain.exponentialRampToValueAtTime(peak * 0.8, now + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      o2.start(now + 0.08);
      o2.stop(now + 0.34);
    }
  } catch {
    /* ignore */
  }
}

function vibrate(kind) {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate(kind === 'success' ? [10, 30, 10] : 8);
  } catch {
    /* ignore */
  }
}
