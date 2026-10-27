import type { BuildingStateId } from '../../bridge/WorldBridge.ts';

export type StageStatus = 'completed' | 'current' | 'available' | 'locked';

export interface HubStageDefinition {
  id: string;
  order: number;
  buildingId: string;
  title: string;
  /** Что нужно закрыть до открытия этапа. */
  requires: readonly string[];
}

/**
 * Маршрут прохождения по кампусу. Порядок выведен из подсказок
 * разблокировки в `locationRegistry.ts`; финальный сюжетный порядок
 * подтверждает методист/гейм-дизайнер.
 */
export const HUB_STAGES: readonly HubStageDefinition[] = [
  { id: 'kn01', order: 1, buildingId: 'codepost', title: 'Кодовый пост · КН-01', requires: [] },
  { id: 'archive', order: 2, buildingId: 'archive', title: 'Архив наблюдений', requires: ['kn01'] },
  { id: 'cartography', order: 3, buildingId: 'cartography', title: 'Картографический класс', requires: ['kn01'] },
  { id: 'duel', order: 4, buildingId: 'hall', title: 'Зал дуэлей · зачёт КН-01', requires: ['kn01', 'archive', 'cartography'] },
  { id: 'radar', order: 5, buildingId: 'radar', title: 'Радар ДМРЛ · уровень 2', requires: ['duel'] },
  { id: 'aerology', order: 6, buildingId: 'lab', title: 'Аэрология · уровень 3', requires: ['radar'] },
];

export type StageStatusMap = Readonly<Record<string, StageStatus>>;

export function computeStageStatuses(
  completed: readonly string[],
  stages: readonly HubStageDefinition[] = HUB_STAGES,
): StageStatusMap {
  const done = new Set(completed);
  const result: Record<string, StageStatus> = {};
  let currentAssigned = false;

  for (const stage of [...stages].sort((a, b) => a.order - b.order)) {
    if (done.has(stage.id)) {
      result[stage.id] = 'completed';
      continue;
    }
    const open = stage.requires.every((id) => done.has(id));
    if (!open) {
      result[stage.id] = 'locked';
    } else if (!currentAssigned) {
      result[stage.id] = 'current';
      currentAssigned = true;
    } else {
      result[stage.id] = 'available';
    }
  }
  return result;
}

export function stageToBuildingState(status: StageStatus): BuildingStateId {
  switch (status) {
    case 'current':
      return 'active';
    case 'locked':
      return 'locked';
    default:
      return 'available';
  }
}

export function buildingStatesFromStages(
  statuses: StageStatusMap,
  stages: readonly HubStageDefinition[] = HUB_STAGES,
): Record<string, BuildingStateId> {
  const states: Record<string, BuildingStateId> = {};
  for (const stage of stages) {
    states[stage.buildingId] = stageToBuildingState(statuses[stage.id] ?? 'locked');
  }
  return states;
}
