/**
 * Менеджер звукового пространства живого мира «26063: Позывной «Синоптик»».
 *
 * Реализует:
 * - 4 независимых шины громкости: master, ambient, effects, ui;
 * - Бесшовные фоновые петли с плавным кроссфейдом между локациями и фазами суток;
 * - Мягкий сенсорный режим (reduced-sensory) и режим отключения звука (mute);
 * - Случайный планировщик фоновых голосов птиц и фауны кампуса;
 * - Безопасную работу в браузере (учёт политики автовоспроизведения Web Audio).
 */

export type AudioChannel = 'master' | 'ambient' | 'effects' | 'ui';

export interface SoundDefinition {
  id: string;
  url: string;
  channel: AudioChannel;
  defaultVolume: number;
  loop: boolean;
}

export const SOUND_DEFINITIONS: Record<string, SoundDefinition> = {
  'audio.ambient.wind-trees': {
    id: 'audio.ambient.wind-trees',
    url: '/audio/ambient/amb_wind_trees_bed.wav',
    channel: 'ambient',
    defaultVolume: 0.45,
    loop: true,
  },
  'audio.ambient.water-shore': {
    id: 'audio.ambient.water-shore',
    url: '/audio/ambient/amb_water_shore_bed.wav',
    channel: 'ambient',
    defaultVolume: 0.40,
    loop: true,
  },
  'audio.ambient.archive-room': {
    id: 'audio.ambient.archive-room',
    url: '/audio/ambient/amb_archive_room_bed.wav',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },
  'audio.ambient.night-air': {
    id: 'audio.ambient.night-air',
    url: '/audio/ambient/amb_night_air_bed.wav',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },
  'audio.fauna.tit-chirp': {
    id: 'audio.fauna.tit-chirp',
    url: '/audio/fauna/fauna_tit_chirp.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.fauna.gull-distant': {
    id: 'audio.fauna.gull-distant',
    url: '/audio/fauna/fauna_gull_distant.wav',
    channel: 'effects',
    defaultVolume: 0.55,
    loop: false,
  },
  'audio.fauna.finch-trill': {
    id: 'audio.fauna.finch-trill',
    url: '/audio/fauna/fauna_finch_trill.wav',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.fauna.squirrel-scurry': {
    id: 'audio.fauna.squirrel-scurry',
    url: '/audio/fauna/fauna_squirrel_scurry.wav',
    channel: 'effects',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.equip.barograph-tick': {
    id: 'audio.equip.barograph-tick',
    url: '/audio/equipment/equip_barograph_tick.wav',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
  'audio.equip.clockwork-hum': {
    id: 'audio.equip.clockwork-hum',
    url: '/audio/equipment/equip_clockwork_hum.wav',
    channel: 'effects',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.equip.lamp-switch': {
    id: 'audio.equip.lamp-switch',
    url: '/audio/equipment/equip_lamp_switch.wav',
    channel: 'effects',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.equip.paper-turn': {
    id: 'audio.equip.paper-turn',
    url: '/audio/equipment/equip_paper_turn.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.equip.teletype-chatter': {
    id: 'audio.equip.teletype-chatter',
    url: '/audio/equipment/equip_teletype_chatter.wav',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.interact.radar-pulse': {
    id: 'audio.interact.radar-pulse',
    url: '/audio/interact/interact_radar_pulse.wav',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
  'audio.interact.balloon-release': {
    id: 'audio.interact.balloon-release',
    url: '/audio/interact/interact_balloon_release.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.interact.anemometer-spin': {
    id: 'audio.interact.anemometer-spin',
    url: '/audio/interact/interact_anemometer_spin.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.interact.door-latch': {
    id: 'audio.interact.door-latch',
    url: '/audio/interact/interact_door_latch.wav',
    channel: 'effects',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.ui.click-soft': {
    id: 'audio.ui.click-soft',
    url: '/audio/feedback/ui_click_soft.wav',
    channel: 'ui',
    defaultVolume: 0.80,
    loop: false,
  },
  'audio.ui.hover-subtle': {
    id: 'audio.ui.hover-subtle',
    url: '/audio/feedback/ui_hover_subtle.wav',
    channel: 'ui',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.feedback.synoptic-chime': {
    id: 'audio.feedback.synoptic-chime',
    url: '/audio/feedback/feedback_synoptic_chime.wav',
    channel: 'ui',
    defaultVolume: 0.85,
    loop: false,
  },
  'audio.feedback.mistake-thud': {
    id: 'audio.feedback.mistake-thud',
    url: '/audio/feedback/feedback_mistake_thud.wav',
    channel: 'ui',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.arena.round-start': {
    id: 'audio.arena.round-start',
    url: '/audio/feedback/arena_round_start.wav',
    channel: 'ui',
    defaultVolume: 0.85,
    loop: false,
  },
  'audio.arena.countdown-tick': {
    id: 'audio.arena.countdown-tick',
    url: '/audio/feedback/arena_countdown_tick.wav',
    channel: 'ui',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.lore.callsign-26063': {
    id: 'audio.lore.callsign-26063',
    url: '/audio/lore/lore_callsign_26063.wav',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
};

export class WorldAudioManager {
  private static instance: WorldAudioManager | null = null;

  private volumes: Record<AudioChannel, number> = {
    master: 1.0,
    ambient: 0.65,
    effects: 0.75,
    ui: 0.80,
  };

  private muted = false;
  private reducedSensory = false;
  private currentAmbientElement: HTMLAudioElement | null = null;
  private currentAmbientId: string | null = null;
  private faunaTimer: number | null = null;

  public static getInstance(): WorldAudioManager {
    if (!WorldAudioManager.instance) {
      WorldAudioManager.instance = new WorldAudioManager();
    }
    return WorldAudioManager.instance;
  }

  public setVolume(channel: AudioChannel, volume: number): void {
    this.volumes[channel] = Math.max(0.0, Math.min(1.0, volume));
    if (channel === 'ambient' || channel === 'master') {
      this.updateAmbientVolume();
    }
  }

  public getVolume(channel: AudioChannel): number {
    return this.volumes[channel];
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateAmbientVolume();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setReducedSensory(enabled: boolean): void {
    this.reducedSensory = enabled;
    this.updateAmbientVolume();
  }

  public isReducedSensory(): boolean {
    return this.reducedSensory;
  }

  /**
   * Воспроизводит звуковой эффект или сигнал интерфейса.
   */
  public play(soundId: string, options?: { volume?: number; loop?: boolean }): HTMLAudioElement | null {
    if (this.muted) {
      return null;
    }

    const def = SOUND_DEFINITIONS[soundId];
    if (!def) {
      console.warn(`[WorldAudioManager] Неизвестный звук: ${soundId}`);
      return null;
    }

    try {
      const audio = new Audio(def.url);
      const channelVol = this.volumes[def.channel] ?? 1.0;
      const masterVol = this.volumes.master;
      const customVol = options?.volume ?? 1.0;
      const sensoryFactor = this.reducedSensory ? 0.7 : 1.0;

      audio.volume = Math.max(
        0.0,
        Math.min(1.0, def.defaultVolume * channelVol * masterVol * customVol * sensoryFactor)
      );
      audio.loop = options?.loop ?? def.loop;

      audio.play().catch(() => {
        // Браузерная политика автовоспроизведения блокирует звук до первого клика пользователя
      });

      return audio;
    } catch {
      return null;
    }
  }

  /**
   * Запускает фоновую эмбиент-петлю с плавным переходом.
   */
  public playAmbientBed(soundId: string, fadeDurationMs = 1200): void {
    if (this.currentAmbientId === soundId && this.currentAmbientElement) {
      return;
    }

    const def = SOUND_DEFINITIONS[soundId];
    if (!def || !def.loop) {
      console.warn(`[WorldAudioManager] Недопустимая эмбиент-петля: ${soundId}`);
      return;
    }

    const prevAudio = this.currentAmbientElement;
    if (prevAudio) {
      // Плавное затухание старой петли
      const startVol = prevAudio.volume;
      const startTime = performance.now();
      const fadeStep = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / fadeDurationMs);
        prevAudio.volume = Math.max(0.0, startVol * (1.0 - progress));
        if (progress < 1.0) {
          requestAnimationFrame(fadeStep);
        } else {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      };
      requestAnimationFrame(fadeStep);
    }

    try {
      const newAudio = new Audio(def.url);
      newAudio.loop = true;
      this.currentAmbientElement = newAudio;
      this.currentAmbientId = soundId;

      const targetVol = this.calculateEffectiveVolume(def.channel, def.defaultVolume);
      newAudio.volume = 0.0;

      newAudio
        .play()
        .then(() => {
          const startTime = performance.now();
          const fadeInStep = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1.0, elapsed / fadeDurationMs);
            if (this.currentAmbientElement === newAudio) {
              newAudio.volume = Math.min(1.0, targetVol * progress);
              if (progress < 1.0) {
                requestAnimationFrame(fadeInStep);
              }
            }
          };
          requestAnimationFrame(fadeInStep);
        })
        .catch(() => {
          // Ожидание взаимодействия с пользователем
        });
    } catch {
      this.currentAmbientElement = null;
      this.currentAmbientId = null;
    }
  }

  public stopAmbient(fadeDurationMs = 800): void {
    const audio = this.currentAmbientElement;
    if (!audio) return;

    const startVol = audio.volume;
    const startTime = performance.now();
    const fadeStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / fadeDurationMs);
      audio.volume = Math.max(0.0, startVol * (1.0 - progress));
      if (progress < 1.0) {
        requestAnimationFrame(fadeStep);
      } else {
        audio.pause();
        audio.currentTime = 0;
        if (this.currentAmbientElement === audio) {
          this.currentAmbientElement = null;
          this.currentAmbientId = null;
        }
      }
    };
    requestAnimationFrame(fadeStep);
  }

  /**
   * Запускает периодические нечастые звуки фауны (синицы, зяблики, белки, чайки).
   */
  public startFaunaSchedule(): void {
    if (this.faunaTimer !== null) return;

    const faunaSounds = [
      'audio.fauna.tit-chirp',
      'audio.fauna.finch-trill',
      'audio.fauna.gull-distant',
      'audio.fauna.squirrel-scurry',
    ];

    const scheduleNext = () => {
      // Интервал между фоновыми звуками: 14 - 32 секунды
      const delay = (14 + Math.random() * 18) * 1000;
      this.faunaTimer = window.setTimeout(() => {
        if (!this.muted && !this.reducedSensory) {
          const randomSound = faunaSounds[Math.floor(Math.random() * faunaSounds.length)];
          this.play(randomSound);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  public stopFaunaSchedule(): void {
    if (this.faunaTimer !== null) {
      clearTimeout(this.faunaTimer);
      this.faunaTimer = null;
    }
  }

  private calculateEffectiveVolume(channel: AudioChannel, baseVolume: number): number {
    if (this.muted) return 0.0;
    const master = this.volumes.master;
    const ch = this.volumes[channel] ?? 1.0;
    const sensory = this.reducedSensory ? 0.7 : 1.0;
    return Math.max(0.0, Math.min(1.0, baseVolume * master * ch * sensory));
  }

  private updateAmbientVolume(): void {
    if (!this.currentAmbientElement || !this.currentAmbientId) return;
    const def = SOUND_DEFINITIONS[this.currentAmbientId];
    if (def) {
      this.currentAmbientElement.volume = this.calculateEffectiveVolume(def.channel, def.defaultVolume);
    }
  }
}

export const worldAudio = WorldAudioManager.getInstance();
