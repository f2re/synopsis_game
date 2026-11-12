/** Describe visible geometry without naming the meteorological answer. */
export function stationPositionLabel(x: number, y: number, centerX = 500, centerY = 500): string {
  const horizontal = x < centerX ? 'слева' : x > centerX ? 'справа' : '';
  const vertical = y < centerY ? 'сверху' : y > centerY ? 'снизу' : '';
  return [horizontal, vertical].filter(Boolean).join(' ') || 'в центре';
}
