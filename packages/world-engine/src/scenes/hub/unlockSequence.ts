import { worldBridge } from '../../bridge/worldBridge';
import { worldAudio } from '../../audio/WorldAudioManager';

export interface UnlockTarget {
  id: string;
  name: string;
  focusX: number;
  focusY: number;
  soundId?: string;
}

export interface UnlockSequenceOptions {
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export class HubUnlockSequenceController {
  private isRunning: boolean = false;
  private currentTimer: ReturnType<typeof setTimeout> | null = null;

  public startUnlock(target: UnlockTarget, options: UnlockSequenceOptions = {}): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Reduced motion or skip: instant completion
    if (options.reducedMotion) {
      try {
        worldAudio.play(target.soundId || 'audio.reward.fanfare-short');
      } catch {}
      worldBridge.emit('building:state_change', {
        buildingId: target.id,
        state: 'open',
      });
      this.isRunning = false;
      if (options.onComplete) options.onComplete();
      return;
    }

    // Step 1: Camera pan to target coordinates
    worldBridge.emit('camera:pan_to', {
      x: target.focusX,
      y: target.focusY,
      durationMs: 800,
    });

    // Step 2: Play fanfare and trigger particles
    this.currentTimer = setTimeout(() => {
      try {
        worldAudio.play(target.soundId || 'audio.reward.fanfare-short');
      } catch {}

      worldBridge.emit('particles:burst', {
        x: target.focusX,
        y: target.focusY,
        effect: 'unlock_sparkles',
      });

      worldBridge.emit('building:state_change', {
        buildingId: target.id,
        state: 'open',
      });

      // Step 3: Return camera to center and finish
      this.currentTimer = setTimeout(() => {
        worldBridge.emit('camera:reset', {});
        this.isRunning = false;
        if (options.onComplete) options.onComplete();
      }, 1200);
    }, 850);
  }

  public skip(options: UnlockSequenceOptions = {}): void {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
    }
    this.isRunning = false;
    worldBridge.emit('camera:reset', {});
    if (options.onComplete) options.onComplete();
  }
}

export const hubUnlockSequence = new HubUnlockSequenceController();
