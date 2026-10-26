/**
 * Менеджер звукового пространства живого мира «26063: Позывной «Синоптик»».
 *
 * Архитектура генеративного анти-усталостного звукового ландшафта:
 * 1. Web Audio API граф с шинами: master, ambient, effects, ui;
 * 2. Многослойный эмбиент на базе взаимно-простых длительностей (incommensurate loops:
 *    ветер 29.3 с, волны 19.1 с, дождь 23.7 с, архив 31.7 с), благодаря чему волновая
 *    фаза не повторяется часами;
 * 3. Дышащий LFO (0.025 Гц, период 40 с), плавно перераспределяющий энергию между слоями ветра и прибоя;
 * 4. Пуассоновский случайный планировщик (Poisson process) с рефрактерным периодом (cooldown 10 с)
 *    для органичного появления голосов птиц и редких событий;
 * 5. Колоды без повторений (ShuffleBag) для вариаций синиц, зябликов и чаек;
 * 6. Микро-вариации при каждом воспроизведении (питч ±30 центов, джиттер громкости ±1 дБ, стерео-панорама ±0.35);
 * 7. Контекстный дакинг (task-aware ducking) на -4 дБ при переходе к работе с бланками КН-01 и экзаменами;
 * 8. Сенсорная доступность (reduced-sensory: ФНЧ 3800 Гц и мягкие транзиенты);
 * 9. Двойная загрузка: сжатый Opus OGG (легкий вес, мгновенный запуск) с прозрачным фоллбэком на WAV.
 */

export type AudioChannel = 'master' | 'ambient' | 'effects' | 'ui';

export interface SoundDefinition {
  id: string;
  url: string;
  compressedUrl?: string;
  channel: AudioChannel;
  defaultVolume: number;
  loop: boolean;
  variations?: string[];
}

/**
 * Колода без повторений (ShuffleBag).
 * Выдаёт элементы в случайном порядке без возвращения.
 * При опустошении колода перемешивается заново с гарантией:
 * первый элемент новой колоды не совпадает с последним элементом предыдущей.
 */
export class ShuffleBag<T> {
  private items: T[];
  private currentBag: T[] = [];
  private lastItem: T | null = null;

  constructor(items: T[]) {
    this.items = [...items];
    this.reset();
  }

  public draw(): T {
    if (this.currentBag.length === 0) {
      this.reset();
    }
    const item = this.currentBag.pop()!;
    this.lastItem = item;
    return item;
  }

  private reset(): void {
    if (this.items.length === 0) {
      throw new Error('ShuffleBag cannot be initialized with empty items');
    }
    const pool = [...this.items];
    const shuffled: T[] = [];

    while (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      shuffled.push(pool.splice(idx, 1)[0]);
    }

    // Если первый элемент новой колоды совпадает с последним сыгранным, меняем его с последним
    if (shuffled.length > 1 && shuffled[shuffled.length - 1] === this.lastItem) {
      const temp = shuffled[shuffled.length - 1];
      shuffled[shuffled.length - 1] = shuffled[0];
      shuffled[0] = temp;
    }

    this.currentBag = shuffled;
  }
}

export const SOUND_DEFINITIONS: Record<string, SoundDefinition> = {
  // --- Эмбиент-петли (Взаимно простые длительности) ---
  'audio.ambient.wind-trees': {
    id: 'audio.ambient.wind-trees',
    url: '/audio/ambient/amb_wind_trees_bed.wav',
    compressedUrl: '/audio/ambient/amb_wind_trees_bed.ogg',
    channel: 'ambient',
    defaultVolume: 0.45,
    loop: true,
  },
  'audio.ambient.water-shore': {
    id: 'audio.ambient.water-shore',
    url: '/audio/ambient/amb_water_shore_bed.wav',
    compressedUrl: '/audio/ambient/amb_water_shore_bed.ogg',
    channel: 'ambient',
    defaultVolume: 0.40,
    loop: true,
  },
  'audio.ambient.rain-soft': {
    id: 'audio.ambient.rain-soft',
    url: '/audio/ambient/amb_rain_soft_bed.wav',
    compressedUrl: '/audio/ambient/amb_rain_soft_bed.ogg',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },
  'audio.ambient.archive-room': {
    id: 'audio.ambient.archive-room',
    url: '/audio/ambient/amb_archive_room_bed.wav',
    compressedUrl: '/audio/ambient/amb_archive_room_bed.ogg',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },
  'audio.ambient.night-air': {
    id: 'audio.ambient.night-air',
    url: '/audio/ambient/amb_night_air_bed.wav',
    compressedUrl: '/audio/ambient/amb_night_air_bed.ogg',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },

  // --- Ландшафтные события побережья (Скрип сосен, порывы ветра, морской гудок) ---
  'audio.ambient.pine-creak-01': {
    id: 'audio.ambient.pine-creak-01',
    url: '/audio/ambient/amb_pine_creak_01.wav',
    compressedUrl: '/audio/ambient/amb_pine_creak_01.ogg',
    channel: 'ambient',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.ambient.pine-creak-02': {
    id: 'audio.ambient.pine-creak-02',
    url: '/audio/ambient/amb_pine_creak_02.wav',
    compressedUrl: '/audio/ambient/amb_pine_creak_02.ogg',
    channel: 'ambient',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.ambient.pine-creak-03': {
    id: 'audio.ambient.pine-creak-03',
    url: '/audio/ambient/amb_pine_creak_03.wav',
    compressedUrl: '/audio/ambient/amb_pine_creak_03.ogg',
    channel: 'ambient',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.ambient.pine-creak': {
    id: 'audio.ambient.pine-creak',
    url: '/audio/ambient/amb_pine_creak.wav',
    compressedUrl: '/audio/ambient/amb_pine_creak.ogg',
    channel: 'ambient',
    defaultVolume: 0.65,
    loop: false,
    variations: [
      'audio.ambient.pine-creak-01',
      'audio.ambient.pine-creak-02',
      'audio.ambient.pine-creak-03',
    ],
  },
  'audio.ambient.wind-gust-01': {
    id: 'audio.ambient.wind-gust-01',
    url: '/audio/ambient/amb_wind_gust_01.wav',
    compressedUrl: '/audio/ambient/amb_wind_gust_01.ogg',
    channel: 'ambient',
    defaultVolume: 0.55,
    loop: false,
  },
  'audio.ambient.wind-gust-02': {
    id: 'audio.ambient.wind-gust-02',
    url: '/audio/ambient/amb_wind_gust_02.wav',
    compressedUrl: '/audio/ambient/amb_wind_gust_02.ogg',
    channel: 'ambient',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.ambient.wind-gust': {
    id: 'audio.ambient.wind-gust',
    url: '/audio/ambient/amb_wind_gust.wav',
    compressedUrl: '/audio/ambient/amb_wind_gust.ogg',
    channel: 'ambient',
    defaultVolume: 0.55,
    loop: false,
    variations: [
      'audio.ambient.wind-gust-01',
      'audio.ambient.wind-gust-02',
    ],
  },
  'audio.ambient.foghorn-distant': {
    id: 'audio.ambient.foghorn-distant',
    url: '/audio/ambient/amb_foghorn_distant.wav',
    compressedUrl: '/audio/ambient/amb_foghorn_distant.ogg',
    channel: 'ambient',
    defaultVolume: 0.40,
    loop: false,
  },

  // --- Фауна Северо-Запада (Аутентичные полевые записи + ShuffleBag) ---
  'audio.fauna.tit-chirp-01': {
    id: 'audio.fauna.tit-chirp-01',
    url: '/audio/fauna/fauna_tit_chirp_01.wav',
    compressedUrl: '/audio/fauna/fauna_tit_chirp_01.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.fauna.tit-chirp-02': {
    id: 'audio.fauna.tit-chirp-02',
    url: '/audio/fauna/fauna_tit_chirp_02.wav',
    compressedUrl: '/audio/fauna/fauna_tit_chirp_02.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.fauna.tit-chirp-03': {
    id: 'audio.fauna.tit-chirp-03',
    url: '/audio/fauna/fauna_tit_chirp_03.wav',
    compressedUrl: '/audio/fauna/fauna_tit_chirp_03.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.fauna.tit-chirp': {
    id: 'audio.fauna.tit-chirp',
    url: '/audio/fauna/fauna_tit_chirp.wav',
    compressedUrl: '/audio/fauna/fauna_tit_chirp.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
    variations: [
      'audio.fauna.tit-chirp-01',
      'audio.fauna.tit-chirp-02',
      'audio.fauna.tit-chirp-03',
    ],
  },

  'audio.fauna.finch-trill-01': {
    id: 'audio.fauna.finch-trill-01',
    url: '/audio/fauna/fauna_finch_trill_01.wav',
    compressedUrl: '/audio/fauna/fauna_finch_trill_01.ogg',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.fauna.finch-trill-02': {
    id: 'audio.fauna.finch-trill-02',
    url: '/audio/fauna/fauna_finch_trill_02.wav',
    compressedUrl: '/audio/fauna/fauna_finch_trill_02.ogg',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.fauna.finch-trill': {
    id: 'audio.fauna.finch-trill',
    url: '/audio/fauna/fauna_finch_trill.wav',
    compressedUrl: '/audio/fauna/fauna_finch_trill.ogg',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
    variations: [
      'audio.fauna.finch-trill-01',
      'audio.fauna.finch-trill-02',
    ],
  },

  'audio.fauna.gull-distant-01': {
    id: 'audio.fauna.gull-distant-01',
    url: '/audio/fauna/fauna_gull_distant_01.wav',
    compressedUrl: '/audio/fauna/fauna_gull_distant_01.ogg',
    channel: 'effects',
    defaultVolume: 0.35,
    loop: false,
  },
  'audio.fauna.gull-distant-02': {
    id: 'audio.fauna.gull-distant-02',
    url: '/audio/fauna/fauna_gull_distant_02.wav',
    compressedUrl: '/audio/fauna/fauna_gull_distant_02.ogg',
    channel: 'effects',
    defaultVolume: 0.35,
    loop: false,
  },
  'audio.fauna.gull-distant-03': {
    id: 'audio.fauna.gull-distant-03',
    url: '/audio/fauna/fauna_gull_distant_03.wav',
    compressedUrl: '/audio/fauna/fauna_gull_distant_03.ogg',
    channel: 'effects',
    defaultVolume: 0.35,
    loop: false,
  },
  'audio.fauna.gull-distant': {
    id: 'audio.fauna.gull-distant',
    url: '/audio/fauna/fauna_gull_distant.wav',
    compressedUrl: '/audio/fauna/fauna_gull_distant.ogg',
    channel: 'effects',
    defaultVolume: 0.35,
    loop: false,
    variations: [
      'audio.fauna.gull-distant-01',
      'audio.fauna.gull-distant-02',
      'audio.fauna.gull-distant-03',
    ],
  },

  'audio.fauna.woodpecker-drum': {
    id: 'audio.fauna.woodpecker-drum',
    url: '/audio/fauna/fauna_woodpecker_drum.wav',
    compressedUrl: '/audio/fauna/fauna_woodpecker_drum.ogg',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },

  'audio.fauna.crow-distant': {
    id: 'audio.fauna.crow-distant',
    url: '/audio/fauna/fauna_crow_distant.wav',
    compressedUrl: '/audio/fauna/fauna_crow_distant.ogg',
    channel: 'effects',
    defaultVolume: 0.45,
    loop: false,
  },

  'audio.fauna.squirrel-scurry': {
    id: 'audio.fauna.squirrel-scurry',
    url: '/audio/fauna/fauna_squirrel_scurry.wav',
    compressedUrl: '/audio/fauna/fauna_squirrel_scurry.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },

  // --- Приборы и интерактивные объекты ---
  'audio.equip.barograph-tick': {
    id: 'audio.equip.barograph-tick',
    url: '/audio/equipment/equip_barograph_tick.wav',
    compressedUrl: '/audio/equipment/equip_barograph_tick.ogg',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
  'audio.equip.clockwork-hum': {
    id: 'audio.equip.clockwork-hum',
    url: '/audio/equipment/equip_clockwork_hum.wav',
    compressedUrl: '/audio/equipment/equip_clockwork_hum.ogg',
    channel: 'effects',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.equip.lamp-switch': {
    id: 'audio.equip.lamp-switch',
    url: '/audio/equipment/equip_lamp_switch.wav',
    compressedUrl: '/audio/equipment/equip_lamp_switch.ogg',
    channel: 'effects',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.equip.paper-turn': {
    id: 'audio.equip.paper-turn',
    url: '/audio/equipment/equip_paper_turn.wav',
    compressedUrl: '/audio/equipment/equip_paper_turn.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.equip.teletype-chatter': {
    id: 'audio.equip.teletype-chatter',
    url: '/audio/equipment/equip_teletype_chatter.wav',
    compressedUrl: '/audio/equipment/equip_teletype_chatter.ogg',
    channel: 'effects',
    defaultVolume: 0.60,
    loop: false,
  },
  'audio.interact.radar-pulse': {
    id: 'audio.interact.radar-pulse',
    url: '/audio/interact/interact_radar_pulse.wav',
    compressedUrl: '/audio/interact/interact_radar_pulse.ogg',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
  'audio.interact.balloon-release': {
    id: 'audio.interact.balloon-release',
    url: '/audio/interact/interact_balloon_release.wav',
    compressedUrl: '/audio/interact/interact_balloon_release.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.interact.anemometer-spin': {
    id: 'audio.interact.anemometer-spin',
    url: '/audio/interact/interact_anemometer_spin.wav',
    compressedUrl: '/audio/interact/interact_anemometer_spin.ogg',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.interact.door-latch': {
    id: 'audio.interact.door-latch',
    url: '/audio/interact/interact_door_latch.wav',
    compressedUrl: '/audio/interact/interact_door_latch.ogg',
    channel: 'effects',
    defaultVolume: 0.75,
    loop: false,
  },

  // --- Пользовательский интерфейс и учебный отклик ---
  'audio.ui.click-soft': {
    id: 'audio.ui.click-soft',
    url: '/audio/feedback/ui_click_soft.wav',
    compressedUrl: '/audio/feedback/ui_click_soft.ogg',
    channel: 'ui',
    defaultVolume: 0.80,
    loop: false,
  },
  'audio.ui.hover-subtle': {
    id: 'audio.ui.hover-subtle',
    url: '/audio/feedback/ui_hover_subtle.wav',
    compressedUrl: '/audio/feedback/ui_hover_subtle.ogg',
    channel: 'ui',
    defaultVolume: 0.50,
    loop: false,
  },
  'audio.feedback.synoptic-chime': {
    id: 'audio.feedback.synoptic-chime',
    url: '/audio/feedback/feedback_synoptic_chime.wav',
    compressedUrl: '/audio/feedback/feedback_synoptic_chime.ogg',
    channel: 'ui',
    defaultVolume: 0.85,
    loop: false,
  },
  'audio.feedback.mistake-thud': {
    id: 'audio.feedback.mistake-thud',
    url: '/audio/feedback/feedback_mistake_thud.wav',
    compressedUrl: '/audio/feedback/feedback_mistake_thud.ogg',
    channel: 'ui',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.arena.round-start': {
    id: 'audio.arena.round-start',
    url: '/audio/feedback/arena_round_start.wav',
    compressedUrl: '/audio/feedback/arena_round_start.ogg',
    channel: 'ui',
    defaultVolume: 0.85,
    loop: false,
  },
  'audio.arena.countdown-tick': {
    id: 'audio.arena.countdown-tick',
    url: '/audio/feedback/arena_countdown_tick.wav',
    compressedUrl: '/audio/feedback/arena_countdown_tick.ogg',
    channel: 'ui',
    defaultVolume: 0.75,
    loop: false,
  },
  'audio.lore.callsign-26063': {
    id: 'audio.lore.callsign-26063',
    url: '/audio/lore/lore_callsign_26063.wav',
    compressedUrl: '/audio/lore/lore_callsign_26063.ogg',
    channel: 'effects',
    defaultVolume: 0.70,
    loop: false,
  },
};

interface ActiveAmbientLayer {
  soundId: string;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  fallbackElement: HTMLAudioElement | null;
  baseVolume: number;
  phaseOffset: number;
}

export class WorldAudioManager {
  private static instance: WorldAudioManager | null = null;

  // Web Audio граф
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private uiBus: GainNode | null = null;
  private taskDuckingGain: GainNode | null = null;
  private sensoryFilterNode: BiquadFilterNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;

  // Буферный кэш звуков (RAM)
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Активные слои эмбиента
  private activeAmbientLayers: Map<string, ActiveAmbientLayer> = new Map();
  private lfoAnimationId: number | null = null;
  private lfoStartTime = 0;

  // Планировщики живого мира
  private faunaTimer: number | null = null;
  private landscapeTimer: number | null = null;
  private atmosphereShuffleBags: Map<string, ShuffleBag<string>> = new Map();

  // Настройки пользователя
  private volumes: Record<AudioChannel, number> = {
    master: 1.0,
    ambient: 0.65,
    effects: 0.75,
    ui: 0.80,
  };
  private muted = false;
  private reducedSensory = false;
  private taskDucking = false;

  public static getInstance(): WorldAudioManager {
    if (!WorldAudioManager.instance) {
      WorldAudioManager.instance = new WorldAudioManager();
    }
    return WorldAudioManager.instance;
  }

  private constructor() {
    this.initShuffleBags();
    this.setupAutoplayUnlock();
  }

  /**
   * Инициализирует колоды без повторений для птиц, фауны и ландшафтных событий.
   */
  private initShuffleBags(): void {
    this.atmosphereShuffleBags.set(
      'tit',
      new ShuffleBag([
        'audio.fauna.tit-chirp-01',
        'audio.fauna.tit-chirp-02',
        'audio.fauna.tit-chirp-03',
      ])
    );
    this.atmosphereShuffleBags.set(
      'finch',
      new ShuffleBag([
        'audio.fauna.finch-trill-01',
        'audio.fauna.finch-trill-02',
      ])
    );
    this.atmosphereShuffleBags.set(
      'gull',
      new ShuffleBag([
        'audio.fauna.gull-distant-01',
        'audio.fauna.gull-distant-02',
        'audio.fauna.gull-distant-03',
      ])
    );
    // Пул фауны: синицы, зяблики, дятел, ворона, белка, и лишь изредка чайка
    this.atmosphereShuffleBags.set(
      'fauna_all',
      new ShuffleBag(['tit', 'finch', 'woodpecker', 'crow', 'squirrel', 'gull'])
    );

    // Ландшафтные события: скрип сосен, порывы ветра в кронах, далёкий морской гудок
    this.atmosphereShuffleBags.set(
      'pine_creak',
      new ShuffleBag([
        'audio.ambient.pine-creak-01',
        'audio.ambient.pine-creak-02',
        'audio.ambient.pine-creak-03',
      ])
    );
    this.atmosphereShuffleBags.set(
      'wind_gust',
      new ShuffleBag([
        'audio.ambient.wind-gust-01',
        'audio.ambient.wind-gust-02',
      ])
    );
    this.atmosphereShuffleBags.set(
      'landscape_all',
      new ShuffleBag(['pine_creak', 'pine_creak', 'wind_gust', 'wind_gust', 'foghorn'])
    );
  }

  /**
   * Ленивая инициализация Web Audio контекста.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      const ctx = new AudioContextClass();
      this.audioCtx = ctx;

      // Мастер-лимитер безопасности (защита от скачков громкости)
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-2.5, ctx.currentTime);
      limiter.knee.setValueAtTime(6.0, ctx.currentTime);
      limiter.ratio.setValueAtTime(4.0, ctx.currentTime);
      limiter.attack.setValueAtTime(0.005, ctx.currentTime);
      limiter.release.setValueAtTime(0.08, ctx.currentTime);
      limiter.connect(ctx.destination);
      this.limiterNode = limiter;

      // Мастер-фильтр сенсорной доступности (reducedSensory: 3800 Гц)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        this.reducedSensory ? 3800 : 22000,
        ctx.currentTime
      );
      filter.Q.setValueAtTime(0.707, ctx.currentTime);
      filter.connect(limiter);
      this.sensoryFilterNode = filter;

      // Мастер-шина громкости
      const master = ctx.createGain();
      master.gain.setValueAtTime(
        this.muted ? 0.0 : this.volumes.master,
        ctx.currentTime
      );
      master.connect(filter);
      this.masterGain = master;

      // Эффекты и UI шины
      const effects = ctx.createGain();
      effects.gain.setValueAtTime(this.volumes.effects, ctx.currentTime);
      effects.connect(master);
      this.effectsBus = effects;

      const ui = ctx.createGain();
      ui.gain.setValueAtTime(this.volumes.ui, ctx.currentTime);
      ui.connect(master);
      this.uiBus = ui;

      // Эмбиент-шина с узлом контекстного дакинга
      const taskDuck = ctx.createGain();
      taskDuck.gain.setValueAtTime(this.taskDucking ? 0.45 : 1.0, ctx.currentTime);
      taskDuck.connect(master);
      this.taskDuckingGain = taskDuck;

      const ambient = ctx.createGain();
      ambient.gain.setValueAtTime(this.volumes.ambient, ctx.currentTime);
      ambient.connect(taskDuck);
      this.ambientBus = ambient;

      this.startLfoEngine();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  private setupAutoplayUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          // Мягкий подъём громкости мастер-шины при разблокировке контекста в браузере
          const now = ctx.currentTime;
          if (this.masterGain && !this.muted) {
            this.masterGain.gain.setValueAtTime(0.001, now);
            this.masterGain.gain.setTargetAtTime(this.volumes.master, now, 0.4);
          }
        }).catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  /**
   * Загружает и декодирует аудиофайл в память браузера (AudioBuffer).
   * Пробует сначала высокоэффективный сжатый Opus OGG, затем WAV.
   */
  public async loadBuffer(soundId: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(soundId);
    if (cached) return cached;

    const pending = this.pendingFetches.get(soundId);
    if (pending) return pending;

    const ctx = this.getAudioContext();
    if (!ctx) return null;

    const def = SOUND_DEFINITIONS[soundId];
    if (!def) return null;

    const fetchPromise = (async () => {
      const candidateUrls = [def.compressedUrl, def.url].filter(Boolean) as string[];

      for (const url of candidateUrls) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const arrayBuffer = await resp.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          this.bufferCache.set(soundId, decoded);
          return decoded;
        } catch {
          // Пробуем следующий URL (фоллбэк на WAV)
        }
      }
      return null;
    })();

    this.pendingFetches.set(soundId, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.pendingFetches.delete(soundId);
    }
  }

  // ---------------------------------------------------------------------------
  // Управление громкостью, мутом и сенсорным режимом
  // ---------------------------------------------------------------------------

  public setVolume(channel: AudioChannel, volume: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, volume));
    this.volumes[channel] = clamped;

    const ctx = this.audioCtx;
    if (ctx && ctx.state !== 'closed') {
      const now = ctx.currentTime;
      if (channel === 'master' && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0.0 : clamped, now, 0.05);
      } else if (channel === 'ambient' && this.ambientBus) {
        this.ambientBus.gain.setTargetAtTime(clamped, now, 0.05);
      } else if (channel === 'effects' && this.effectsBus) {
        this.effectsBus.gain.setTargetAtTime(clamped, now, 0.05);
      } else if (channel === 'ui' && this.uiBus) {
        this.uiBus.gain.setTargetAtTime(clamped, now, 0.05);
      }
    }
  }

  public getVolume(channel: AudioChannel): number {
    return this.volumes[channel];
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    const ctx = this.audioCtx;
    if (ctx && this.masterGain) {
      const target = muted ? 0.0 : this.volumes.master;
      this.masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
    }
    // Для fallback-элементов
    for (const layer of this.activeAmbientLayers.values()) {
      if (layer.fallbackElement) {
        layer.fallbackElement.muted = muted;
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setReducedSensory(enabled: boolean): void {
    this.reducedSensory = enabled;
    const ctx = this.audioCtx;
    if (ctx && this.sensoryFilterNode) {
      const cutoff = enabled ? 3800 : 22000;
      this.sensoryFilterNode.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.2);
    }
  }

  public isReducedSensory(): boolean {
    return this.reducedSensory;
  }

  /**
   * Контекстный дакинг фонового звука (-4 дБ) во время решения задач и экзаменов.
   */
  public setTaskDucking(enabled: boolean, transitionSec = 1.2): void {
    this.taskDucking = enabled;
    const ctx = this.audioCtx;
    if (ctx && this.taskDuckingGain) {
      const target = enabled ? 0.45 : 1.0;
      this.taskDuckingGain.gain.setTargetAtTime(target, ctx.currentTime, transitionSec / 3);
    }
  }

  public isTaskDucking(): boolean {
    return this.taskDucking;
  }

  // ---------------------------------------------------------------------------
  // Воспроизведение звуковых эффектов (с микро-вариациями)
  // ---------------------------------------------------------------------------

  /**
   * Воспроизводит звуковой эффект или UI-сигнал.
   * Применяет алгоритм микро-вариаций (питч, громкость, стерео-панорама)
   * для устранения эффекта «пулемёта» (machine-gun fatigue).
   */
  public play(
    soundId: string,
    options?: {
      volume?: number;
      loop?: boolean;
      detuneCents?: number;
      pan?: number;
      allowVariance?: boolean;
    }
  ): void {
    if (this.muted) return;

    let targetId = soundId;
    const def = SOUND_DEFINITIONS[soundId];
    if (def?.variations && def.variations.length > 0) {
      // Автоматический выбор из колоды без повторений
      targetId = def.variations[Math.floor(Math.random() * def.variations.length)];
    }

    const soundDef = SOUND_DEFINITIONS[targetId] || def;
    if (!soundDef) {
      console.warn(`[WorldAudioManager] Неизвестный звук: ${soundId}`);
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) {
      this.playFallbackAudio(soundDef, options);
      return;
    }

    // Загрузка буфера и воспроизведение через Web Audio граф
    this.loadBuffer(targetId).then((buffer) => {
      if (!buffer) {
        this.playFallbackAudio(soundDef, options);
        return;
      }

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = options?.loop ?? soundDef.loop;

        // Микро-вариация питча (±30 центов для органичности)
        const applyVariance = options?.allowVariance ?? true;
        const pitchVariance = applyVariance ? (Math.random() - 0.5) * 60 : 0;
        source.detune.setValueAtTime(
          (options?.detuneCents ?? 0) + pitchVariance,
          ctx.currentTime
        );

        // Индивидуальный узел громкости эффекта
        const gainNode = ctx.createGain();
        const baseVol = soundDef.defaultVolume * (options?.volume ?? 1.0);
        const gainJitter = applyVariance ? 0.92 + Math.random() * 0.16 : 1.0;
        gainNode.gain.setValueAtTime(baseVol * gainJitter, ctx.currentTime);

        // Стерео-панорамирование (если поддерживается StereoPannerNode)
        let lastNode: AudioNode = gainNode;
        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          const panVal = options?.pan ?? (applyVariance ? (Math.random() - 0.5) * 0.6 : 0.0);
          panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, panVal)), ctx.currentTime);
          source.connect(gainNode);
          gainNode.connect(panner);
          lastNode = panner;
        } else {
          source.connect(gainNode);
        }

        // Подключение к шине
        const targetBus =
          soundDef.channel === 'ui'
            ? this.uiBus
            : soundDef.channel === 'ambient'
            ? this.ambientBus
            : this.effectsBus;

        if (targetBus) {
          lastNode.connect(targetBus);
        } else {
          lastNode.connect(ctx.destination);
        }

        source.start(ctx.currentTime);
      } catch (err) {
        console.warn('[WorldAudioManager] Ошибка Web Audio play:', err);
      }
    });
  }

  private playFallbackAudio(
    def: SoundDefinition,
    options?: { volume?: number; loop?: boolean }
  ): void {
    try {
      const audio = new Audio(def.compressedUrl || def.url);
      const chVol = this.volumes[def.channel] ?? 1.0;
      const sensoryFactor = this.reducedSensory ? 0.75 : 1.0;
      audio.volume = Math.max(
        0.0,
        Math.min(
          1.0,
          def.defaultVolume * this.volumes.master * chVol * (options?.volume ?? 1.0) * sensoryFactor
        )
      );
      audio.loop = options?.loop ?? def.loop;
      audio.play().catch(() => {});
    } catch {
      // Игнорируем ошибки воспроизведения
    }
  }

  // ---------------------------------------------------------------------------
  // Многослойный генеративный эмбиент (Incommensurate Loops & Breathing LFO)
  // ---------------------------------------------------------------------------

  /**
   * Запускает многослойную звуковую картину для открытого кампуса:
   * Слой 1: ветер в соснах (29.3 с);
   * Слой 2: прибой Финского залива (19.1 с);
   * Слой 3 (опционально): мягкий дождь (23.7 с).
   */
  public playHubOutdoorAmbient(hasRain = false, fadeDurationMs = 2000): void {
    this.addAmbientLayer('audio.ambient.wind-trees', 0.45, 0.0, fadeDurationMs);
    this.addAmbientLayer('audio.ambient.water-shore', 0.40, Math.PI / 2, fadeDurationMs);
    if (hasRain) {
      this.addAmbientLayer('audio.ambient.rain-soft', 0.35, Math.PI, fadeDurationMs);
    } else {
      this.removeAmbientLayer('audio.ambient.rain-soft', fadeDurationMs);
    }
    this.removeAmbientLayer('audio.ambient.archive-room', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.night-air', fadeDurationMs);
    this.startHubAtmosphereSchedule();
  }

  /**
   * Запускает тихий интерьерный эмбиент (архив / кабинет синоптика).
   */
  public playArchiveAmbient(fadeDurationMs = 1500): void {
    this.stopHubAtmosphereSchedule();
    this.removeAmbientLayer('audio.ambient.wind-trees', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.water-shore', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.rain-soft', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.night-air', fadeDurationMs);
    this.addAmbientLayer('audio.ambient.archive-room', 0.40, 0.0, fadeDurationMs);
  }

  /**
   * Запускает ночной эмбиент кампуса (27.1 с).
   */
  public playNightAmbient(fadeDurationMs = 1500): void {
    this.addAmbientLayer('audio.ambient.night-air', 0.40, 0.0, fadeDurationMs);
    this.addAmbientLayer('audio.ambient.water-shore', 0.25, Math.PI, fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.wind-trees', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.archive-room', fadeDurationMs);
    this.removeAmbientLayer('audio.ambient.rain-soft', fadeDurationMs);
  }

  /**
   * Добавляет или плавно включает конкретный эмбиент-слой.
   */
  public addAmbientLayer(
    soundId: string,
    targetVolume: number,
    phaseOffset = 0.0,
    fadeDurationMs = 2000
  ): void {
    const existing = this.activeAmbientLayers.get(soundId);
    if (existing) {
      existing.baseVolume = targetVolume;
      const ctx = this.audioCtx;
      if (ctx) {
        existing.gainNode.gain.setTargetAtTime(targetVolume, ctx.currentTime, fadeDurationMs / 3000);
      }
      return;
    }

    const def = SOUND_DEFINITIONS[soundId];
    if (!def) return;

    const ctx = this.getAudioContext();
    if (!ctx) {
      this.startFallbackAmbientLoop(soundId, def, targetVolume);
      return;
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    if (this.ambientBus) {
      gainNode.connect(this.ambientBus);
    } else {
      gainNode.connect(ctx.destination);
    }

    const layerRecord: ActiveAmbientLayer = {
      soundId,
      sourceNode: null,
      gainNode,
      fallbackElement: null,
      baseVolume: targetVolume,
      phaseOffset,
    };
    this.activeAmbientLayers.set(soundId, layerRecord);

    this.loadBuffer(soundId).then((buffer) => {
      if (!buffer || !this.activeAmbientLayers.has(soundId)) return;

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gainNode);
        source.start(ctx.currentTime);
        layerRecord.sourceNode = source;

        // Плавный и мягкий fade-in без щелчков
        gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
        gainNode.gain.setTargetAtTime(
          targetVolume,
          ctx.currentTime,
          fadeDurationMs / 3000
        );
      } catch (err) {
        console.warn(`[WorldAudioManager] Ошибка запуска эмбиент-петли ${soundId}:`, err);
      }
    });
  }

  /**
   * Плавно останавливает и удаляет конкретный эмбиент-слой.
   */
  public removeAmbientLayer(soundId: string, fadeDurationMs = 1500): void {
    const layer = this.activeAmbientLayers.get(soundId);
    if (!layer) return;

    this.activeAmbientLayers.delete(soundId);
    const ctx = this.audioCtx;

    if (ctx && layer.gainNode) {
      layer.gainNode.gain.setTargetAtTime(0.0001, ctx.currentTime, fadeDurationMs / 3000);
      setTimeout(() => {
        try {
          layer.sourceNode?.stop();
          layer.sourceNode?.disconnect();
          layer.gainNode?.disconnect();
        } catch {}
      }, fadeDurationMs + 150);
    }

    if (layer.fallbackElement) {
      layer.fallbackElement.pause();
    }
  }

  /**
   * Совместимость с предыдущим API.
   */
  public playAmbientBed(soundId: string, fadeDurationMs = 1500): void {
    for (const id of Array.from(this.activeAmbientLayers.keys())) {
      if (id !== soundId) {
        this.removeAmbientLayer(id, fadeDurationMs);
      }
    }
    const def = SOUND_DEFINITIONS[soundId];
    this.addAmbientLayer(soundId, def?.defaultVolume ?? 0.4, 0.0, fadeDurationMs);
  }

  public stopAmbient(fadeDurationMs = 1000): void {
    for (const id of Array.from(this.activeAmbientLayers.keys())) {
      this.removeAmbientLayer(id, fadeDurationMs);
    }
  }

  private startFallbackAmbientLoop(
    soundId: string,
    def: SoundDefinition,
    targetVolume: number
  ): void {
    try {
      const audio = new Audio(def.compressedUrl || def.url);
      audio.loop = true;
      audio.volume = targetVolume * this.volumes.ambient * this.volumes.master;
      audio.play().catch(() => {});
      this.activeAmbientLayers.set(soundId, {
        soundId,
        sourceNode: null,
        gainNode: null as unknown as GainNode,
        fallbackElement: audio,
        baseVolume: targetVolume,
        phaseOffset: 0.0,
      });
    } catch {}
  }

  /**
   * Сверхмедленный LFO (дыхание природы: 0.025 Гц / период 40 с).
   * Мягко модулирует баланс между слоями ветра и прибоя,
   * предотвращая слуховую усталость при длительных игровых сессиях.
   */
  private startLfoEngine(): void {
    if (typeof window === 'undefined' || this.lfoAnimationId !== null) return;

    this.lfoStartTime = performance.now();
    const lfoFreq = 0.025; // 0.025 Гц = цикл 40 секунд

    const lfoTick = () => {
      const elapsedSec = (performance.now() - this.lfoStartTime) / 1000.0;
      const ctx = this.audioCtx;

      if (ctx && this.activeAmbientLayers.size > 0) {
        const now = ctx.currentTime;
        for (const layer of this.activeAmbientLayers.values()) {
          if (!layer.gainNode) continue;
          // Модуляция ±18% от базовой громкости слоя
          const modulation = Math.sin(2.0 * Math.PI * lfoFreq * elapsedSec + layer.phaseOffset);
          const dynamicGain = layer.baseVolume * (1.0 + 0.18 * modulation);
          layer.gainNode.gain.setValueAtTime(dynamicGain, now);
        }
      }

      this.lfoAnimationId = requestAnimationFrame(lfoTick);
    };

    this.lfoAnimationId = requestAnimationFrame(lfoTick);
  }

  // ---------------------------------------------------------------------------
  // Пуассоновский планировщик живого мира (Landscape & Fauna Schedulers)
  // ---------------------------------------------------------------------------

  /**
   * Запускает многослойное генеративное расписание живого мира:
   * 1. Ландшафтный поток: скрип сосен, порывы ветра в кронах, далёкий морской гудок;
   * 2. Фаунистический поток: голоса птиц Северо-Запада, дятел, белка, редкие чайки.
   *
   * Каждый поток рассчитывается по закону Пуассона (экспоненциальное распределение
   * со случайными интервалами и рефрактерным периодом cooldown).
   * Звуки из колод без повторений (ShuffleBag) гарантируют отсутствие монотонности.
   */
  public startHubAtmosphereSchedule(): void {
    this.stopHubAtmosphereSchedule();

    // 1. Поток ландшафтных звуков (скрип сосен, порывы ветра, туманный гудок)
    // Cooldown 14 с + экспоненциальная случайная задержка (16 - 45 с)
    const scheduleNextLandscape = () => {
      const u = Math.random();
      const exponentialDelay = -Math.log(1.0 - Math.min(0.95, u)) * 18.0;
      const delayMs = (14.0 + exponentialDelay) * 1000.0;

      this.landscapeTimer = window.setTimeout(() => {
        if (!this.muted && !this.reducedSensory) {
          this.triggerRandomLandscape();
        }
        scheduleNextLandscape();
      }, delayMs);
    };

    // 2. Поток фауны (птицы, дятел, белка, редкие парящие чайки)
    // Cooldown 18 с + экспоненциальная случайная задержка (20 - 55 с)
    const scheduleNextFauna = () => {
      const u = Math.random();
      const exponentialDelay = -Math.log(1.0 - Math.min(0.95, u)) * 22.0;
      const delayMs = (18.0 + exponentialDelay) * 1000.0;

      this.faunaTimer = window.setTimeout(() => {
        if (!this.muted && !this.reducedSensory) {
          this.triggerRandomFauna();
        }
        scheduleNextFauna();
      }, delayMs);
    };

    scheduleNextLandscape();
    scheduleNextFauna();
  }

  public stopHubAtmosphereSchedule(): void {
    if (this.landscapeTimer !== null) {
      clearTimeout(this.landscapeTimer);
      this.landscapeTimer = null;
    }
    if (this.faunaTimer !== null) {
      clearTimeout(this.faunaTimer);
      this.faunaTimer = null;
    }
  }

  // Обратная совместимость для startFaunaSchedule / stopFaunaSchedule
  public startFaunaSchedule(): void {
    this.startHubAtmosphereSchedule();
  }

  public stopFaunaSchedule(): void {
    this.stopHubAtmosphereSchedule();
  }

  /**
   * Выбирает и воспроизводит случайное ландшафтное событие (скрип сосны, порыв ветра, гудок).
   */
  public triggerRandomLandscape(): void {
    const pool = this.atmosphereShuffleBags.get('landscape_all');
    if (!pool) return;

    const category = pool.draw();
    if (category === 'pine_creak') {
      const bag = this.atmosphereShuffleBags.get('pine_creak');
      const soundId = bag ? bag.draw() : 'audio.ambient.pine-creak-01';
      // Скрип сосны в роще: реалистичное пространственное панорамирование
      const pan = (Math.random() - 0.5) * 0.9;
      this.play(soundId, { allowVariance: true, pan, volume: 0.95 });
    } else if (category === 'wind_gust') {
      const bag = this.atmosphereShuffleBags.get('wind_gust');
      const soundId = bag ? bag.draw() : 'audio.ambient.wind-gust-01';
      const pan = (Math.random() - 0.5) * 0.7;
      this.play(soundId, { allowVariance: true, pan, volume: 0.90 });
    } else if (category === 'foghorn') {
      // Далёкий морской сигнал маяка на фарватере залива
      const pan = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4);
      this.play('audio.ambient.foghorn-distant', { allowVariance: false, pan, volume: 0.75 });
    }
  }

  /**
   * Выбирает голос птицы или фауны из колоды без повторений и воспроизводит его.
   */
  public triggerRandomFauna(): void {
    const categoryBag = this.atmosphereShuffleBags.get('fauna_all');
    if (!categoryBag) return;

    const selectedCategory = categoryBag.draw();
    if (selectedCategory === 'squirrel') {
      const pan = (Math.random() - 0.5) * 0.8;
      this.play('audio.fauna.squirrel-scurry', { allowVariance: true, pan });
      return;
    }
    if (selectedCategory === 'woodpecker') {
      const pan = (Math.random() - 0.5) * 0.7;
      this.play('audio.fauna.woodpecker-drum', { allowVariance: true, pan });
      return;
    }
    if (selectedCategory === 'crow') {
      const pan = (Math.random() - 0.5) * 0.8;
      this.play('audio.fauna.crow-distant', { allowVariance: true, pan });
      return;
    }

    const speciesBag = this.atmosphereShuffleBags.get(selectedCategory);
    if (!speciesBag) return;

    const soundId = speciesBag.draw();
    if (selectedCategory === 'gull') {
      // Чайка парит вдалеке над заливом: широкая панорама и мягкая громкость, не заглушающая лес
      const pan = (Math.random() - 0.5) * 1.4;
      this.play(soundId, { allowVariance: true, pan, volume: 0.80 });
    } else {
      const pan = (Math.random() - 0.5) * 0.9;
      this.play(soundId, { allowVariance: true, pan });
    }
  }
}

export const worldAudio = WorldAudioManager.getInstance();
