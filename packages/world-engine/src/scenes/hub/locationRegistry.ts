export type LocationState = 'available' | 'active' | 'locked' | 'disabled';
export type TooltipDirection = 'top' | 'right' | 'bottom' | 'left';

export interface HubPoint {
  x: number;
  y: number;
}

export interface HubRect extends HubPoint {
  width: number;
  height: number;
}

export interface HubOutlineDefinition extends HubRect {
  textureKey: string;
}

export interface HubLocationDefinition {
  id: string;
  dossierId: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  state: LocationState;
  unlockHint?: string;
  sceneKey?: string;
  bounds: HubRect;
  hitArea: HubRect;
  entranceAnchor: HubPoint;
  markerAnchor: HubPoint;
  outline: HubOutlineDefinition;
  preferredTooltipDirection: TooltipDirection;
  tooltipAlternatives: readonly TooltipDirection[];
  priority: number;
  markerGlyph: string;
}

export const HUB_LOCATIONS: readonly HubLocationDefinition[] = [
  {
    id: 'hub.location.synoptic-center',
    dossierId: 'synoptic-center',
    title: 'Оперативный зал анализа',
    shortTitle: 'Оперативный зал',
    subtitle: 'Дежурная смена · код КН-01',
    state: 'available',
    sceneKey: 'hub',
    bounds: { x: 335, y: 172, width: 287, height: 214 },
    hitArea: { x: 348, y: 200, width: 260, height: 170 },
    entranceAnchor: { x: 478, y: 344 },
    markerAnchor: { x: 478, y: 364 },
    outline: { x: 335, y: 172, width: 287, height: 214, textureKey: 'outline-synoptic' },
    preferredTooltipDirection: 'bottom',
    tooltipAlternatives: ['right', 'left', 'top'],
    priority: 100,
    markerGlyph: '●',
  },
  {
    id: 'hub.location.cartography',
    dossierId: 'cartography',
    title: 'Картографический класс',
    shortTitle: 'Картография',
    subtitle: 'Карты и синоптические планшеты',
    state: 'locked',
    unlockHint: 'После первой смены КН-01',
    bounds: { x: 68, y: 195, width: 218, height: 158 },
    hitArea: { x: 80, y: 205, width: 190, height: 140 },
    entranceAnchor: { x: 175, y: 326 },
    markerAnchor: { x: 175, y: 350 },
    outline: { x: 68, y: 195, width: 218, height: 158, textureKey: 'outline-cartography' },
    preferredTooltipDirection: 'bottom',
    tooltipAlternatives: ['right', 'top', 'left'],
    priority: 60,
    markerGlyph: 'КН',
  },
  {
    id: 'hub.location.archive',
    dossierId: 'archive',
    title: 'Научно-исторический архив',
    shortTitle: 'Научный архив',
    subtitle: 'Фонд метеоданных и планшетов',
    state: 'locked',
    unlockHint: 'После первой смены КН-01',
    sceneKey: 'archive',
    bounds: { x: 551, y: 212, width: 212, height: 160 },
    hitArea: { x: 565, y: 222, width: 180, height: 140 },
    entranceAnchor: { x: 655, y: 340 },
    markerAnchor: { x: 655, y: 365 },
    outline: { x: 551, y: 212, width: 212, height: 160, textureKey: 'outline-archive' },
    preferredTooltipDirection: 'bottom',
    tooltipAlternatives: ['left', 'right', 'top'],
    priority: 55,
    markerGlyph: 'КН',
  },
  {
    id: 'hub.location.radar',
    dossierId: 'radar',
    title: 'Радарный комплекс ДМРЛ-С',
    shortTitle: 'Радар ДМРЛ-С',
    subtitle: 'Доплеровское радиолокационное сканирование',
    state: 'locked',
    unlockHint: 'Нужен уровень 2: Радар',
    bounds: { x: 40, y: 80, width: 229, height: 170 },
    hitArea: { x: 50, y: 90, width: 200, height: 150 },
    entranceAnchor: { x: 150, y: 222 },
    markerAnchor: { x: 150, y: 246 },
    outline: { x: 40, y: 80, width: 229, height: 170, textureKey: 'outline-radar' },
    preferredTooltipDirection: 'right',
    tooltipAlternatives: ['bottom', 'top', 'left'],
    priority: 50,
    markerGlyph: '2',
  },
  {
    id: 'hub.location.aerology',
    dossierId: 'aerology',
    title: 'Аэрологический павильон',
    shortTitle: 'Аэрология',
    subtitle: 'Радиозондирование свободной атмосферы',
    state: 'locked',
    unlockHint: 'Нужен уровень 3: Зонд',
    bounds: { x: 677, y: 97, width: 218, height: 162 },
    hitArea: { x: 687, y: 103, width: 190, height: 150 },
    entranceAnchor: { x: 782, y: 222 },
    markerAnchor: { x: 782, y: 247 },
    outline: { x: 677, y: 97, width: 218, height: 162, textureKey: 'outline-aerology' },
    preferredTooltipDirection: 'left',
    tooltipAlternatives: ['bottom', 'top', 'right'],
    priority: 50,
    markerGlyph: '3',
  },
  {
    id: 'hub.location.tournament-hall',
    dossierId: 'tournament-hall',
    title: 'Турнирный зал дуэлей',
    shortTitle: 'Турнирный зал',
    subtitle: 'Квалификационные синоптические соревнования',
    state: 'locked',
    unlockHint: 'После зачёта по коду КН-01',
    bounds: { x: 729, y: 206, width: 223, height: 168 },
    hitArea: { x: 745, y: 215, width: 190, height: 150 },
    entranceAnchor: { x: 840, y: 340 },
    markerAnchor: { x: 840, y: 366 },
    outline: { x: 729, y: 206, width: 223, height: 168, textureKey: 'outline-tournament' },
    preferredTooltipDirection: 'left',
    tooltipAlternatives: ['bottom', 'top', 'right'],
    priority: 45,
    markerGlyph: 'КН',
  },
] as const;

export function getLocationNotice(location: HubLocationDefinition): string {
  if (location.state === 'locked') {
    return location.unlockHint ?? 'Локация пока закрыта';
  }

  if (location.state === 'disabled') {
    return 'В разработке';
  }

  if (location.state === 'active') {
    return 'Текущая локация';
  }

  return 'Доступно';
}
