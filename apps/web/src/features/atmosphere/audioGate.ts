export const AUDIO_UNLOCK_EVENT = 'station:audio-unlocked';
let unlocked = false;

export function isAudioUnlocked(): boolean { return unlocked; }

/** Only the global provider calls this from a trusted input handler. */
export function unlockAudioFromGesture(event: Event): void {
  if (unlocked || !event.isTrusted) return;
  unlocked = true;
  window.dispatchEvent(new CustomEvent(AUDIO_UNLOCK_EVENT));
}
