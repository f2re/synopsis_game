export type LocationState = 'available' | 'active' | 'locked' | 'disabled';

export interface HubLocationDefinition {
  id: string;
  title: string;
  subtitle: string;
  state: LocationState;
  unlockHint?: string;
  sceneKey?: string;
  x: number;
  y: number;
}

export const HUB_LOCATIONS: readonly HubLocationDefinition[] = [
  {
    id: 'archive',
    title: 'Архив',
    subtitle: 'Метеоданные и отчёты',
    state: 'available',
    sceneKey: 'archive',
    x: 92,
    y: 178,
  },
  {
    id: 'cartography',
    title: 'Картографический класс',
    subtitle: 'Анализ и прогнозы',
    state: 'locked',
    unlockHint: 'Откроется на ур. 2',
    x: 390,
    y: 154,
  },
  {
    id: 'aerology',
    title: 'Аэрологическая лаборатория',
    subtitle: 'Исследование верхних слоёв',
    state: 'locked',
    unlockHint: 'Откроется на ур. 3',
    x: 82,
    y: 116,
  },
  {
    id: 'radar',
    title: 'Радарный комплекс',
    subtitle: 'Наблюдение за осадками',
    state: 'locked',
    unlockHint: 'Откроется на ур. 4',
    x: 397,
    y: 86,
  },
  {
    id: 'observatory',
    title: 'Обсерватория',
    subtitle: 'Изучение атмосферы',
    state: 'locked',
    unlockHint: 'Откроется на ур. 5',
    x: 86,
    y: 58,
  },
  {
    id: 'tournament',
    title: 'Турнирный зал',
    subtitle: 'Соревнования',
    state: 'locked',
    unlockHint: 'Откроется позже',
    x: 396,
    y: 208,
  },
] as const;

export function getLocationNotice(location: HubLocationDefinition): string {
  if (location.state === 'locked') {
    return location.unlockHint ?? 'Локация пока закрыта';
  }

  if (location.state === 'disabled') {
    return 'В разработке';
  }

  return location.subtitle;
}
