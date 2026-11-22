/** Public screen routes never imply authorisation for a server-owned action. */
export const SCREEN_TITLES: Record<string, string> = {
  '/': 'Станция', '/campus': 'Станция', '/library': 'Библиотека', '/archive': 'Читальный зал',
  '/help': 'Помощь', '/settings': 'Настройки', '/codebook': 'Справочник КН-01',
  '/shift': 'Учебная смена', '/blitz': 'Блиц-практика', '/profile/avatar': 'Персонаж и инвентарь',
  '/level-one': 'Первый уровень',
  '/rewards': 'Награды',
  '/exit': 'Выход из игры', '/admin': 'Управление группами', '/arena-tv': 'Большой экран',
  '/art/r08': 'Художественный пилот R08',
};

export function screenSurface(path: string): 'home' | 'campus' | 'library' | 'help' | 'settings' | 'study' | 'silent' {
  if (path === '/' || path === '/campus') return 'campus';
  if (path === '/library' || path === '/codebook' || path === '/archive' || path === '/rewards') return 'library';
  if (path === '/help') return 'help';
  if (path === '/settings') return 'settings';
  if (path === '/shift' || path === '/blitz' || path === '/level-one') return 'study';
  return 'silent';
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  // Only public in-app reading/menu surfaces; no external URLs or active tasks.
  const path = value.split('?')[0];
  return ['/', '/campus', '/archive', '/library', '/help', '/settings', '/codebook', '/art/r08'].includes(path) ? value : '/';
}

/** Preview return is explicit; a normal visit to the archive keeps its existing exit. */
export function archiveReturnPath(search: string): '/' | '/art/r08' {
  return new URLSearchParams(search).get('returnTo') === '/art/r08' ? '/art/r08' : '/';
}

/** The character editor has one explicitly supported game return, never an arbitrary URL. */
export function characterReturnPath(search: string): '/' | '/level-one' {
  return new URLSearchParams(search).get('returnTo') === '/level-one' ? '/level-one' : '/';
}
