/** Public screen routes never imply authorisation for a server-owned action. */
export const SCREEN_TITLES: Record<string, string> = {
  '/': 'Главное меню', '/campus': 'Кампус', '/library': 'Библиотека', '/archive': 'Читальный зал',
  '/help': 'Помощь', '/settings': 'Настройки', '/codebook': 'Справочник КН-01',
  '/shift': 'Учебная смена', '/blitz': 'Блиц-практика', '/profile/avatar': 'Персонаж и инвентарь',
  '/exit': 'Выход из игры', '/admin': 'Управление группами', '/arena-tv': 'Большой экран',
};

export function screenSurface(path: string): 'home' | 'campus' | 'library' | 'help' | 'settings' | 'study' | 'silent' {
  if (path === '/') return 'home';
  if (path === '/campus') return 'campus';
  if (path === '/library' || path === '/codebook' || path === '/archive') return 'library';
  if (path === '/help') return 'help';
  if (path === '/settings') return 'settings';
  if (path === '/shift' || path === '/blitz') return 'study';
  return 'silent';
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  // Only public in-app reading/menu surfaces; no external URLs or active tasks.
  const path = value.split('?')[0];
  return ['/', '/campus', '/archive', '/library', '/help', '/settings', '/codebook'].includes(path) ? value : '/';
}
