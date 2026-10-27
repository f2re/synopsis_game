/**
 * Определения звуков, каналов и колод без повторений (ShuffleBag)
 * для звукового движка 26063: Позывной «Синоптик».
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
  'audio.ambience.wind-loop': {
    id: 'audio.ambience.wind-loop',
    url: '/assets/audio/ambience/wind_light_loop.wav',
    compressedUrl: '/assets/audio/ambience/wind_light_loop.opus.ogg',
    channel: 'ambient',
    defaultVolume: 0.45,
    loop: true,
  },
  'audio.ambience.surf-loop': {
    id: 'audio.ambience.surf-loop',
    url: '/assets/audio/ambience/gulf_surf_loop.wav',
    compressedUrl: '/assets/audio/ambience/gulf_surf_loop.opus.ogg',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: true,
  },
  'audio.ambience.rain-loop': {
    id: 'audio.ambience.rain-loop',
    url: '/assets/audio/ambience/rain_moderate_loop.wav',
    compressedUrl: '/assets/audio/ambience/rain_moderate_loop.opus.ogg',
    channel: 'ambient',
    defaultVolume: 0.4,
    loop: true,
  },
  'audio.ambience.room-archive-hum': {
    id: 'audio.ambience.room-archive-hum',
    url: '/assets/audio/ambience/room_archive_hum.wav',
    compressedUrl: '/assets/audio/ambience/room_archive_hum.opus.ogg',
    channel: 'ambient',
    defaultVolume: 0.3,
    loop: true,
  },

  // --- Фауна (Органичные спорадические голоса птиц) ---
  'audio.fauna.tit-chirp': {
    id: 'audio.fauna.tit-chirp',
    url: '/assets/audio/fauna/tit_chirp_01.wav',
    channel: 'ambient',
    defaultVolume: 0.5,
    loop: false,
    variations: [
      '/assets/audio/fauna/tit_chirp_01.wav',
      '/assets/audio/fauna/tit_chirp_02.wav',
      '/assets/audio/fauna/tit_chirp_03.wav',
    ],
  },
  'audio.fauna.chaffinch-trill': {
    id: 'audio.fauna.chaffinch-trill',
    url: '/assets/audio/fauna/chaffinch_trill_01.wav',
    channel: 'ambient',
    defaultVolume: 0.45,
    loop: false,
    variations: [
      '/assets/audio/fauna/chaffinch_trill_01.wav',
      '/assets/audio/fauna/chaffinch_trill_02.wav',
    ],
  },
  'audio.fauna.gull-distant': {
    id: 'audio.fauna.gull-distant',
    url: '/assets/audio/fauna/gull_distant_01.wav',
    channel: 'ambient',
    defaultVolume: 0.35,
    loop: false,
    variations: [
      '/assets/audio/fauna/gull_distant_01.wav',
      '/assets/audio/fauna/gull_distant_02.wav',
      '/assets/audio/fauna/gull_distant_03.wav',
    ],
  },
  'audio.fauna.crow-caw': {
    id: 'audio.fauna.crow-caw',
    url: '/assets/audio/fauna/crow_caw.wav',
    channel: 'ambient',
    defaultVolume: 0.4,
    loop: false,
  },
  'audio.fauna.squirrel-scurry': {
    id: 'audio.fauna.squirrel-scurry',
    url: '/assets/audio/fauna/squirrel_scurry.wav',
    channel: 'ambient',
    defaultVolume: 0.45,
    loop: false,
  },

  // --- Оборудование метеостанции (Аутентичные ретро-приборы) ---
  'audio.equipment.barometer-tick': {
    id: 'audio.equipment.barometer-tick',
    url: '/assets/audio/equipment/barometer_tick.wav',
    channel: 'effects',
    defaultVolume: 0.55,
    loop: false,
  },
  'audio.equipment.clock-pendulum': {
    id: 'audio.equipment.clock-pendulum',
    url: '/assets/audio/equipment/clock_pendulum.wav',
    channel: 'effects',
    defaultVolume: 0.3,
    loop: false,
  },
  'audio.equipment.teletype-clatter': {
    id: 'audio.equipment.teletype-clatter',
    url: '/assets/audio/equipment/teletype_clatter.wav',
    channel: 'effects',
    defaultVolume: 0.5,
    loop: false,
  },
  'audio.equipment.anemometer-spin': {
    id: 'audio.equipment.anemometer-spin',
    url: '/assets/audio/equipment/anemometer_spin.wav',
    channel: 'effects',
    defaultVolume: 0.4,
    loop: false,
  },
  'audio.equipment.hygrograph-scrape': {
    id: 'audio.equipment.hygrograph-scrape',
    url: '/assets/audio/equipment/hygrograph_scrape.wav',
    channel: 'effects',
    defaultVolume: 0.4,
    loop: false,
  },

  // --- Взаимодействие с миром (Интерьер и физика) ---
  'audio.interact.door-latch': {
    id: 'audio.interact.door-latch',
    url: '/assets/audio/interact/door_latch_heavy.wav',
    channel: 'effects',
    defaultVolume: 0.6,
    loop: false,
  },
  'audio.interact.drawer-slide': {
    id: 'audio.interact.drawer-slide',
    url: '/assets/audio/interact/drawer_slide.wav',
    channel: 'effects',
    defaultVolume: 0.5,
    loop: false,
  },
  'audio.interact.teacup-clink': {
    id: 'audio.interact.teacup-clink',
    url: '/assets/audio/interact/teacup_clink.wav',
    channel: 'effects',
    defaultVolume: 0.45,
    loop: false,
  },
  'audio.interact.steps-wood': {
    id: 'audio.interact.steps-wood',
    url: '/assets/audio/interact/steps_wood_01.wav',
    channel: 'effects',
    defaultVolume: 0.45,
    loop: false,
    variations: [
      '/assets/audio/interact/steps_wood_01.wav',
      '/assets/audio/interact/steps_wood_02.wav',
      '/assets/audio/interact/steps_wood_03.wav',
      '/assets/audio/interact/steps_wood_04.wav',
    ],
  },
  'audio.interact.steps-gravel': {
    id: 'audio.interact.steps-gravel',
    url: '/assets/audio/interact/steps_gravel_01.wav',
    channel: 'effects',
    defaultVolume: 0.4,
    loop: false,
    variations: [
      '/assets/audio/interact/steps_gravel_01.wav',
      '/assets/audio/interact/steps_gravel_02.wav',
      '/assets/audio/interact/steps_gravel_03.wav',
    ],
  },

  // --- Экипировка и картография ---
  'audio.equip.cloth-rustle': {
    id: 'audio.equip.cloth-rustle',
    url: '/assets/audio/equip/cloth_rustle.wav',
    channel: 'effects',
    defaultVolume: 0.45,
    loop: false,
  },
  'audio.equip.paper-turn': {
    id: 'audio.equip.paper-turn',
    url: '/assets/audio/equip/paper_turn.wav',
    channel: 'effects',
    defaultVolume: 0.5,
    loop: false,
  },
  'audio.equip.pencil-write': {
    id: 'audio.equip.pencil-write',
    url: '/assets/audio/equip/pencil_write.wav',
    channel: 'effects',
    defaultVolume: 0.55,
    loop: false,
  },

  // --- UI и навигация ---
  'audio.ui.click-soft': {
    id: 'audio.ui.click-soft',
    url: '/assets/audio/ui/click_soft.wav',
    channel: 'ui',
    defaultVolume: 0.5,
    loop: false,
  },
  'audio.ui.tab-switch': {
    id: 'audio.ui.tab-switch',
    url: '/assets/audio/ui/tab_switch.wav',
    channel: 'ui',
    defaultVolume: 0.45,
    loop: false,
  },
  'audio.ui.toggle-lever': {
    id: 'audio.ui.toggle-lever',
    url: '/assets/audio/ui/toggle_lever.wav',
    channel: 'ui',
    defaultVolume: 0.6,
    loop: false,
  },
  'audio.ui.error-buzz': {
    id: 'audio.ui.error-buzz',
    url: '/assets/audio/ui/error_buzz.wav',
    channel: 'ui',
    defaultVolume: 0.5,
    loop: false,
  },

  // --- Обратная связь задач КН-01 (Педагогические стимулы) ---
  'audio.feedback.synoptic-chime': {
    id: 'audio.feedback.synoptic-chime',
    url: '/assets/audio/feedback/synoptic_chime_c_major.wav',
    channel: 'effects',
    defaultVolume: 0.6,
    loop: false,
  },
  'audio.feedback.mistake-thud': {
    id: 'audio.feedback.mistake-thud',
    url: '/assets/audio/feedback/mistake_soft_thud.wav',
    channel: 'effects',
    defaultVolume: 0.5,
    loop: false,
  },
  'audio.feedback.streak-ascend': {
    id: 'audio.feedback.streak-ascend',
    url: '/assets/audio/feedback/streak_ascend.wav',
    channel: 'effects',
    defaultVolume: 0.6,
    loop: false,
  },
  'audio.feedback.storm-warning': {
    id: 'audio.feedback.storm-warning',
    url: '/assets/audio/feedback/storm_warning_horn.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },

  // --- Награды и торжественные вехи ---
  'audio.reward.fanfare-short': {
    id: 'audio.reward.fanfare-short',
    url: '/assets/audio/reward/fanfare_short.wav',
    channel: 'effects',
    defaultVolume: 0.65,
    loop: false,
  },
  'audio.reward.stamp-verdict': {
    id: 'audio.reward.stamp-verdict',
    url: '/assets/audio/reward/stamp_verdict.wav',
    channel: 'effects',
    defaultVolume: 0.7,
    loop: false,
  },
  'audio.reward.medal-shimmer': {
    id: 'audio.reward.medal-shimmer',
    url: '/assets/audio/reward/medal_shimmer.wav',
    channel: 'effects',
    defaultVolume: 0.55,
    loop: false,
  },
};

export interface ActiveAmbientLayer {
  soundId: string;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  fallbackElement: HTMLAudioElement | null;
  baseVolume: number;
  phaseOffset: number;
}

export function createAtmosphereShuffleBags(): Map<string, ShuffleBag<string>> {
  const bags = new Map<string, ShuffleBag<string>>();
  bags.set('tit', new ShuffleBag(['audio.fauna.tit-chirp-01', 'audio.fauna.tit-chirp-02', 'audio.fauna.tit-chirp-03']));
  bags.set('finch', new ShuffleBag(['audio.fauna.finch-trill-01', 'audio.fauna.finch-trill-02']));
  bags.set('gull', new ShuffleBag(['audio.fauna.gull-distant-01', 'audio.fauna.gull-distant-02', 'audio.fauna.gull-distant-03']));
  bags.set('fauna_all', new ShuffleBag(['tit', 'finch', 'woodpecker', 'crow', 'squirrel', 'gull']));
  bags.set('pine_creak', new ShuffleBag(['audio.ambient.pine-creak-01', 'audio.ambient.pine-creak-02', 'audio.ambient.pine-creak-03']));
  bags.set('wind_gust', new ShuffleBag(['audio.ambient.wind-gust-01', 'audio.ambient.wind-gust-02']));
  bags.set('landscape_all', new ShuffleBag(['pine_creak', 'pine_creak', 'wind_gust', 'wind_gust', 'foghorn']));
  return bags;
}
