// Sound and vibration for the door, so staff can tell green from red without looking at the screen.
export type Tone = "ok" | "warn" | "bad";

let ctx: AudioContext | null = null;

function beep(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

export function signal(tone: Tone, sound: boolean) {
  try {
    if (sound) {
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") void ctx.resume();
      if (tone === "ok") {
        beep(880, 0, 0.12);
        beep(1175, 0.13, 0.16);
      } else if (tone === "warn") {
        beep(660, 0, 0.2);
        beep(660, 0.28, 0.2);
      } else {
        beep(220, 0, 0.45);
      }
    }
    navigator.vibrate?.(tone === "ok" ? 60 : tone === "warn" ? [80, 60, 80] : [350]);
  } catch {
    /* sound or vibration not available on this device */
  }
}
