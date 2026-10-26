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
    id: 'synoptic',
    title: 'Оперативный зал анализа',
    subtitle: 'Дешифровка кода КН-01 SYNOP',
    state: 'available',
    sceneKey: 'hub',
    x: 478,
    y: 285,
  },
  {
    id: 'cartography',
    title: 'Картографический класс',
    subtitle: 'Анализ карт и синоптические планшеты',
    state: 'locked',
    unlockHint: 'Требуется: сдать дешифровку кода КН-01',
    x: 175,
    y: 275,
  },
  {
    id: 'archive',
    title: 'Научно-исторический архив',
    subtitle: 'Фонд метеоданных и планшетов',
    state: 'locked',
    unlockHint: 'Требуется: сдать дешифровку кода КН-01',
    sceneKey: 'archive',
    x: 655,
    y: 292,
  },
  {
    id: 'radar',
    title: 'Радарный комплекс ДМРЛ-С',
    subtitle: 'Доплеровское радиолокационное сканирование',
    state: 'locked',
    unlockHint: 'Откроется на 2 уровне допуска',
    x: 150,
    y: 165,
  },
  {
    id: 'aerology',
    title: 'Аэрологический павильон',
    subtitle: 'Радиозондирование свободной атмосферы',
    state: 'locked',
    unlockHint: 'Откроется на 3 уровне допуска',
    x: 782,
    y: 178,
  },
  {
    id: 'tournament',
    title: 'Турнирный зал дуэлей',
    subtitle: 'Квалификационные синоптические соревнования',
    state: 'locked',
    unlockHint: 'Квалификационный зачёт после дежурной смены',
    x: 840,
    y: 290,
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
