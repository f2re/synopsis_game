export interface MusicOutput { context: AudioContext; output: AudioNode }
interface Voice { oscillator: OscillatorNode; gain: GainNode; context: AudioContext; stopping: boolean }

// Original 64-beat miniature, authored for the station; no samples or external music.
// MIDI notes, one sparse melody phrase per eight beats. Zero denotes a rest.
export const STATION_MELODY = [
  67, 0, 71, 74, 0, 71, 69, 0,
  64, 0, 67, 71, 0, 69, 0, 0,
  66, 0, 69, 74, 0, 76, 74, 0,
  71, 0, 69, 66, 0, 67, 0, 0,
  67, 0, 74, 71, 0, 69, 67, 0,
  64, 0, 71, 67, 0, 66, 0, 0,
  66, 0, 69, 71, 0, 74, 69, 0,
  67, 0, 66, 62, 0, 67, 0, 0,
] as const;
const BASS = [43, 40, 38, 43, 43, 40, 38, 43] as const;
export const MUSIC_BEAT_SECONDS = 60 / 68;
export const MUSIC_MAX_VOICES = 10;

/** Bounded audio-rate synthesis; one 250 ms scheduler, no animation-frame work. */
export class StationMusic {
  private graph: MusicOutput | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<Voice>();
  private beat = 0;
  private nextAt = 0;
  private lowPower = false;

  constructor(private readonly getOutput: () => MusicOutput | null) {}

  start(lowPower = false): void {
    this.lowPower = lowPower;
    if (this.timer !== null) return;
    this.graph = this.getOutput();
    if (!this.graph) return; // Web Audio unavailable: the game remains fully usable.
    this.nextAt = this.graph.context.currentTime + 0.08;
    this.tick();
    this.timer = setInterval(() => this.tick(), 250);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const voice of this.voices) {
      if (voice.stopping) continue;
      voice.stopping = true;
      const now = voice.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.025);
      try { voice.oscillator.stop(now + 0.12); } catch { /* Already ended. */ }
    }
    this.graph = null;
  }

  get activeVoiceCount(): number { return this.voices.size; }
  get running(): boolean { return this.timer !== null; }

  private tick(): void {
    const graph = this.graph;
    if (!graph || graph.context.state !== 'running') return;
    const now = graph.context.currentTime;
    // A delayed browser callback resumes calmly; it never catches up in a burst.
    if (this.nextAt < now - MUSIC_BEAT_SECONDS) this.nextAt = now + 0.08;
    while (this.nextAt < now + 0.4) {
      const note = STATION_MELODY[this.beat % STATION_MELODY.length];
      if (note) this.note(note, this.nextAt, 1.9, 0.10);
      if (this.beat % 8 === 0) {
        const root = BASS[Math.floor(this.beat / 8) % BASS.length];
        this.note(root, this.nextAt, 5.6, 0.085);
        if (!this.lowPower) this.note(root + 19, this.nextAt + 0.16, 4.3, 0.038);
      }
      this.nextAt += MUSIC_BEAT_SECONDS;
      this.beat = (this.beat + 1) % STATION_MELODY.length;
    }
  }

  private note(midi: number, at: number, duration: number, volume: number): void {
    if (!this.graph || this.voices.size >= MUSIC_MAX_VOICES) return;
    const { context, output } = this.graph;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(output);
    const voice = { oscillator, gain, context, stopping: false };
    this.voices.add(voice);
    oscillator.onended = () => {
      this.voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }
}
