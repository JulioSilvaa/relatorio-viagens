let audioContext: AudioContext | null = null;
let bound = false;

function bindUnlock() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  const unlock = () => {
    if (audioContext && audioContext.state === "suspended") {
      void audioContext.resume();
    }
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("visibilitychange", unlock);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  if (!audioContext) {
    audioContext = new window.AudioContext();
    bindUnlock();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

export function shouldNotifySound(
  previous: number | null,
  current: number,
): boolean {
  return previous !== null && current > previous;
}

export function playNotificationSound(): void {
  const context = ensureContext();
  if (!context) return;

  const now = context.currentTime;
  const notes = [880, 1174.66];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const start = now + index * 0.13;
    const duration = 0.38;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  });
}