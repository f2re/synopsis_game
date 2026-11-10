/**
 * WorldBridge.ts
 * 
 * Мост дискретных событий между React/сервером и Phaser (World Engine).
 * Согласно ADR-0004 и правилам проекта:
 * - Никаких обновлений per-frame React state из игрового цикла!
 * - Только дискретные команды (смена фазы, получение состояний зданий от сервера, клик по объекту).
 */

import { normalizeAvatarPresentation, type WorldAvatarPresentation } from '../runtime/characterAssets';

export type DayPhase = 'night' | 'dawn' | 'day' | 'golden_hour' | 'twilight' | 'white_nights';

export type BuildingStateId = 'locked' | 'available' | 'active' | 'just_unlocked';

export interface BuildingStatePayload {
  buildingId: string;
  state: BuildingStateId;
}

export type WorldEventCallback<T = any> = (data: T) => void;

export class WorldBridge {
  private static instance: WorldBridge | null = null;
  private listeners: Map<string, Set<WorldEventCallback>> = new Map();
  private avatarPresentation: WorldAvatarPresentation = normalizeAvatarPresentation(null);

  static getInstance(): WorldBridge {
    if (!WorldBridge.instance) {
      WorldBridge.instance = new WorldBridge();
    }
    return WorldBridge.instance;
  }

  // Подписка на событие
  on<T>(event: string, callback: WorldEventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Отправка события
  emit<T>(event: string, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(data));
    }
  }

  /** Presentation only: use the saved account profile, not an unsaved editor draft. */
  setAvatarPresentation(value: unknown): void {
    this.avatarPresentation = normalizeAvatarPresentation(value);
    this.emit('ui:avatar_presentation', this.getAvatarPresentation());
  }

  getAvatarPresentation(): WorldAvatarPresentation {
    return { ...this.avatarPresentation, ...(this.avatarPresentation.profile ? { profile: { ...this.avatarPresentation.profile } } : {}) };
  }

  // Команды от сервера/React в Phaser
  setBuildingStates(states: Record<string, BuildingStateId>): void {
    this.emit('server:building_states', states);
  }

  setTimePhase(phase: DayPhase): void {
    this.emit('server:time_phase', phase);
  }

  setDemoAcceleration(accelerated: boolean): void {
    this.emit('server:demo_acceleration', accelerated);
  }

  /** Принудительный сезон кампуса; `null` — вернуться к календарю станции. */
  setSeason(season: 'spring' | 'summer' | 'autumn' | 'winter' | null): void {
    this.emit('server:season', season);
  }

  /** Пройденные этапы маршрута (id из hubStages). Состояния зданий выводятся из них. */
  setStageProgress(completedStageIds: string[]): void {
    this.emit('server:stage_progress', completedStageIds);
  }

  notifySeasonChanged(season: string): void {
    this.emit('world:season_change', season);
  }

  // События из Phaser в React
  notifyBuildingClicked(buildingId: string): void {
    this.emit('world:building_click', buildingId);
  }

  notifyPhaseChanged(phase: DayPhase): void {
    this.emit('world:phase_change', phase);
  }

  notifySceneReady(sceneName: string): void {
    this.emit('world:scene_ready', sceneName);
  }

  clear(): void {
    this.listeners.clear();
    this.avatarPresentation = normalizeAvatarPresentation(null);
  }
}

export const worldBridge = WorldBridge.getInstance();
