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

// BEGIN generated audio definitions
// Source: assets/manifests/audio.collection.json; regenerate with npm run sync:audio in this package.
// Source SHA-256: e0abe23c6050bacc20ee9efba9f1f9dcb9490ecde635dcd89e35e6977a71dd5e
export const SOUND_DEFINITIONS: Record<string, SoundDefinition> = {
  "audio.ambient.wind-trees": {
    "id": "audio.ambient.wind-trees",
    "url": "/audio/ambient/amb_wind_trees_bed.wav",
    "compressedUrl": "/audio/ambient/amb_wind_trees_bed.ogg",
    "channel": "ambient",
    "defaultVolume": 0.45,
    "loop": true
  },
  "audio.ambient.water-shore": {
    "id": "audio.ambient.water-shore",
    "url": "/audio/ambient/amb_water_shore_bed.wav",
    "compressedUrl": "/audio/ambient/amb_water_shore_bed.ogg",
    "channel": "ambient",
    "defaultVolume": 0.4,
    "loop": true
  },
  "audio.ambient.rain-soft": {
    "id": "audio.ambient.rain-soft",
    "url": "/audio/ambient/amb_rain_soft_bed.wav",
    "compressedUrl": "/audio/ambient/amb_rain_soft_bed.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": true
  },
  "audio.ambient.archive-room": {
    "id": "audio.ambient.archive-room",
    "url": "/audio/ambient/amb_archive_room_bed.wav",
    "compressedUrl": "/audio/ambient/amb_archive_room_bed.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": true
  },
  "audio.ambient.night-air": {
    "id": "audio.ambient.night-air",
    "url": "/audio/ambient/amb_night_air_bed.wav",
    "compressedUrl": "/audio/ambient/amb_night_air_bed.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": true
  },
  "audio.ambient.pine-creak-01": {
    "id": "audio.ambient.pine-creak-01",
    "url": "/audio/ambient/amb_pine_creak_01.wav",
    "compressedUrl": "/audio/ambient/amb_pine_creak_01.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.ambient.pine-creak-02": {
    "id": "audio.ambient.pine-creak-02",
    "url": "/audio/ambient/amb_pine_creak_02.wav",
    "compressedUrl": "/audio/ambient/amb_pine_creak_02.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.ambient.pine-creak-03": {
    "id": "audio.ambient.pine-creak-03",
    "url": "/audio/ambient/amb_pine_creak_03.wav",
    "compressedUrl": "/audio/ambient/amb_pine_creak_03.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.ambient.wind-gust-01": {
    "id": "audio.ambient.wind-gust-01",
    "url": "/audio/ambient/amb_wind_gust_01.wav",
    "compressedUrl": "/audio/ambient/amb_wind_gust_01.ogg",
    "channel": "ambient",
    "defaultVolume": 0.55,
    "loop": false
  },
  "audio.ambient.wind-gust-02": {
    "id": "audio.ambient.wind-gust-02",
    "url": "/audio/ambient/amb_wind_gust_02.wav",
    "compressedUrl": "/audio/ambient/amb_wind_gust_02.ogg",
    "channel": "ambient",
    "defaultVolume": 0.5,
    "loop": false
  },
  "audio.ambient.foghorn-distant": {
    "id": "audio.ambient.foghorn-distant",
    "url": "/audio/ambient/amb_foghorn_distant.wav",
    "compressedUrl": "/audio/ambient/amb_foghorn_distant.ogg",
    "channel": "ambient",
    "defaultVolume": 0.4,
    "loop": false
  },
  "audio.fauna.tit-chirp-01": {
    "id": "audio.fauna.tit-chirp-01",
    "url": "/audio/fauna/fauna_tit_chirp_01.wav",
    "compressedUrl": "/audio/fauna/fauna_tit_chirp_01.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.fauna.tit-chirp-02": {
    "id": "audio.fauna.tit-chirp-02",
    "url": "/audio/fauna/fauna_tit_chirp_02.wav",
    "compressedUrl": "/audio/fauna/fauna_tit_chirp_02.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.fauna.tit-chirp-03": {
    "id": "audio.fauna.tit-chirp-03",
    "url": "/audio/fauna/fauna_tit_chirp_03.wav",
    "compressedUrl": "/audio/fauna/fauna_tit_chirp_03.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.fauna.finch-trill-01": {
    "id": "audio.fauna.finch-trill-01",
    "url": "/audio/fauna/fauna_finch_trill_01.wav",
    "compressedUrl": "/audio/fauna/fauna_finch_trill_01.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.finch-trill-02": {
    "id": "audio.fauna.finch-trill-02",
    "url": "/audio/fauna/fauna_finch_trill_02.wav",
    "compressedUrl": "/audio/fauna/fauna_finch_trill_02.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.gull-distant-01": {
    "id": "audio.fauna.gull-distant-01",
    "url": "/audio/fauna/fauna_gull_distant_01.wav",
    "compressedUrl": "/audio/fauna/fauna_gull_distant_01.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": false
  },
  "audio.fauna.gull-distant-02": {
    "id": "audio.fauna.gull-distant-02",
    "url": "/audio/fauna/fauna_gull_distant_02.wav",
    "compressedUrl": "/audio/fauna/fauna_gull_distant_02.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": false
  },
  "audio.fauna.gull-distant-03": {
    "id": "audio.fauna.gull-distant-03",
    "url": "/audio/fauna/fauna_gull_distant_03.wav",
    "compressedUrl": "/audio/fauna/fauna_gull_distant_03.ogg",
    "channel": "ambient",
    "defaultVolume": 0.35,
    "loop": false
  },
  "audio.fauna.woodpecker-drum": {
    "id": "audio.fauna.woodpecker-drum",
    "url": "/audio/fauna/fauna_woodpecker_drum.wav",
    "compressedUrl": "/audio/fauna/fauna_woodpecker_drum.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.crow-distant": {
    "id": "audio.fauna.crow-distant",
    "url": "/audio/fauna/fauna_crow_distant.wav",
    "compressedUrl": "/audio/fauna/fauna_crow_distant.ogg",
    "channel": "ambient",
    "defaultVolume": 0.45,
    "loop": false
  },
  "audio.fauna.squirrel-scurry": {
    "id": "audio.fauna.squirrel-scurry",
    "url": "/audio/fauna/fauna_squirrel_scurry.wav",
    "compressedUrl": "/audio/fauna/fauna_squirrel_scurry.ogg",
    "channel": "ambient",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.equip.barograph-tick": {
    "id": "audio.equip.barograph-tick",
    "url": "/audio/equipment/equip_barograph_tick.wav",
    "compressedUrl": "/audio/equipment/equip_barograph_tick.ogg",
    "channel": "effects",
    "defaultVolume": 0.7,
    "loop": false
  },
  "audio.equip.clockwork-hum": {
    "id": "audio.equip.clockwork-hum",
    "url": "/audio/equipment/equip_clockwork_hum.wav",
    "compressedUrl": "/audio/equipment/equip_clockwork_hum.ogg",
    "channel": "effects",
    "defaultVolume": 0.5,
    "loop": false
  },
  "audio.equip.lamp-switch": {
    "id": "audio.equip.lamp-switch",
    "url": "/audio/equipment/equip_lamp_switch.wav",
    "compressedUrl": "/audio/equipment/equip_lamp_switch.ogg",
    "channel": "effects",
    "defaultVolume": 0.75,
    "loop": false
  },
  "audio.equip.paper-turn": {
    "id": "audio.equip.paper-turn",
    "url": "/audio/equipment/equip_paper_turn.wav",
    "compressedUrl": "/audio/equipment/equip_paper_turn.ogg",
    "channel": "effects",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.equip.teletype-chatter": {
    "id": "audio.equip.teletype-chatter",
    "url": "/audio/equipment/equip_teletype_chatter.wav",
    "compressedUrl": "/audio/equipment/equip_teletype_chatter.ogg",
    "channel": "effects",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.interact.radar-pulse": {
    "id": "audio.interact.radar-pulse",
    "url": "/audio/interact/interact_radar_pulse.wav",
    "compressedUrl": "/audio/interact/interact_radar_pulse.ogg",
    "channel": "effects",
    "defaultVolume": 0.7,
    "loop": false
  },
  "audio.interact.balloon-release": {
    "id": "audio.interact.balloon-release",
    "url": "/audio/interact/interact_balloon_release.wav",
    "compressedUrl": "/audio/interact/interact_balloon_release.ogg",
    "channel": "effects",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.interact.anemometer-spin": {
    "id": "audio.interact.anemometer-spin",
    "url": "/audio/interact/interact_anemometer_spin.wav",
    "compressedUrl": "/audio/interact/interact_anemometer_spin.ogg",
    "channel": "effects",
    "defaultVolume": 0.65,
    "loop": false
  },
  "audio.interact.door-latch": {
    "id": "audio.interact.door-latch",
    "url": "/audio/interact/interact_door_latch.wav",
    "compressedUrl": "/audio/interact/interact_door_latch.ogg",
    "channel": "effects",
    "defaultVolume": 0.75,
    "loop": false
  },
  "audio.ui.click-soft": {
    "id": "audio.ui.click-soft",
    "url": "/audio/feedback/ui_click_soft.wav",
    "compressedUrl": "/audio/feedback/ui_click_soft.ogg",
    "channel": "ui",
    "defaultVolume": 0.8,
    "loop": false
  },
  "audio.ui.hover-subtle": {
    "id": "audio.ui.hover-subtle",
    "url": "/audio/feedback/ui_hover_subtle.wav",
    "compressedUrl": "/audio/feedback/ui_hover_subtle.ogg",
    "channel": "ui",
    "defaultVolume": 0.5,
    "loop": false
  },
  "audio.feedback.synoptic-chime": {
    "id": "audio.feedback.synoptic-chime",
    "url": "/audio/feedback/feedback_synoptic_chime.wav",
    "compressedUrl": "/audio/feedback/feedback_synoptic_chime.ogg",
    "channel": "effects",
    "defaultVolume": 0.85,
    "loop": false
  },
  "audio.feedback.mistake-thud": {
    "id": "audio.feedback.mistake-thud",
    "url": "/audio/feedback/feedback_mistake_thud.wav",
    "compressedUrl": "/audio/feedback/feedback_mistake_thud.ogg",
    "channel": "effects",
    "defaultVolume": 0.75,
    "loop": false
  },
  "audio.arena.round-start": {
    "id": "audio.arena.round-start",
    "url": "/audio/feedback/arena_round_start.wav",
    "compressedUrl": "/audio/feedback/arena_round_start.ogg",
    "channel": "effects",
    "defaultVolume": 0.85,
    "loop": false
  },
  "audio.arena.countdown-tick": {
    "id": "audio.arena.countdown-tick",
    "url": "/audio/feedback/arena_countdown_tick.wav",
    "compressedUrl": "/audio/feedback/arena_countdown_tick.ogg",
    "channel": "effects",
    "defaultVolume": 0.75,
    "loop": false
  },
  "audio.lore.callsign-26063": {
    "id": "audio.lore.callsign-26063",
    "url": "/audio/lore/lore_callsign_26063.wav",
    "compressedUrl": "/audio/lore/lore_callsign_26063.ogg",
    "channel": "effects",
    "defaultVolume": 0.7,
    "loop": false
  },
  "audio.ambient.pine-creak": {
    "id": "audio.ambient.pine-creak",
    "url": "/audio/ambient/amb_pine_creak.wav",
    "compressedUrl": "/audio/ambient/amb_pine_creak.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.ambient.wind-gust": {
    "id": "audio.ambient.wind-gust",
    "url": "/audio/ambient/amb_wind_gust.wav",
    "compressedUrl": "/audio/ambient/amb_wind_gust.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.tit-chirp": {
    "id": "audio.fauna.tit-chirp",
    "url": "/audio/fauna/fauna_tit_chirp.wav",
    "compressedUrl": "/audio/fauna/fauna_tit_chirp.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.finch-trill": {
    "id": "audio.fauna.finch-trill",
    "url": "/audio/fauna/fauna_finch_trill.wav",
    "compressedUrl": "/audio/fauna/fauna_finch_trill.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  },
  "audio.fauna.gull-distant": {
    "id": "audio.fauna.gull-distant",
    "url": "/audio/fauna/fauna_gull_distant.wav",
    "compressedUrl": "/audio/fauna/fauna_gull_distant.ogg",
    "channel": "ambient",
    "defaultVolume": 0.6,
    "loop": false
  }
};
// END generated audio definitions

// The existing reward UI uses this legacy cue; the shipped positive chime is
// the documented fallback until a dedicated reward cue enters the manifest.
SOUND_DEFINITIONS['audio.reward.fanfare-short'] = SOUND_DEFINITIONS['audio.feedback.synoptic-chime'];

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
