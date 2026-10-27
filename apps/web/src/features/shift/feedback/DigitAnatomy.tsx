import { useMemo } from 'react';
import { PixelCard } from '../../ui';

export interface DigitSegment {
  digits: string;
  symbol: string;
  title: string;
  decodedValue: string;
  colorRole: 'cyan' | 'amber' | 'green' | 'purple' | 'blue';
}

interface DigitAnatomyProps {
  codeGroup: string;
  groupType?: string;
  isCorrect?: boolean;
  userAnswer?: string;
  explanation?: string;
}

export function parseGroupAnatomy(group: string, groupType: string = ''): DigitSegment[] {
  const g = group.trim();

  // Nddff
  if (g.length === 5 && (groupType.includes('Nddff') || (!g.startsWith('1') && !g.startsWith('2') && !g.startsWith('3') && !g.startsWith('4') && !g.startsWith('5')))) {
    return [
      { digits: g[0], symbol: 'N', title: 'Общая облачность', decodedValue: `${g[0]} баллов`, colorRole: 'cyan' },
      { digits: g.slice(1, 3), symbol: 'dd', title: 'Направление ветра', decodedValue: `${Number(g.slice(1, 3)) * 10}°`, colorRole: 'amber' },
      { digits: g.slice(3, 5), symbol: 'ff', title: 'Скорость ветра', decodedValue: `${Number(g.slice(3, 5))} м/с`, colorRole: 'green' },
    ];
  }

  // 1snTTT
  if (g.startsWith('1') && g.length === 5) {
    const sign = g[1] === '1' ? '-' : '+';
    const val = (Number(g.slice(2, 5)) / 10).toFixed(1);
    return [
      { digits: '1', symbol: '1', title: 'Индикатор температуры', decodedValue: 'Температура воздуха', colorRole: 'blue' },
      { digits: g[1], symbol: 'sn', title: 'Знак температуры', decodedValue: g[1] === '0' ? 'Плюс (sn=0)' : 'Минус (sn=1)', colorRole: 'amber' },
      { digits: g.slice(2, 5), symbol: 'TTT', title: 'Величина температуры', decodedValue: `${sign}${val} °C`, colorRole: 'cyan' },
    ];
  }

  // 2snTdTdTd
  if (g.startsWith('2') && g.length === 5) {
    const sign = g[1] === '1' ? '-' : '+';
    const val = (Number(g.slice(2, 5)) / 10).toFixed(1);
    return [
      { digits: '2', symbol: '2', title: 'Индикатор точки росы', decodedValue: 'Точка росы', colorRole: 'blue' },
      { digits: g[1], symbol: 'sn', title: 'Знак точки росы', decodedValue: g[1] === '0' ? 'Плюс (sn=0)' : 'Минус (sn=1)', colorRole: 'amber' },
      { digits: g.slice(2, 5), symbol: 'TdTdTd', title: 'Величина точки росы', decodedValue: `${sign}${val} °C`, colorRole: 'cyan' },
    ];
  }

  // 3PoPoPoPo
  if (g.startsWith('3') && g.length === 5) {
    const val = (Number(g.slice(1, 5)) / 10).toFixed(1);
    return [
      { digits: '3', symbol: '3', title: 'Индикатор давления на станции', decodedValue: 'Давление на станции', colorRole: 'blue' },
      { digits: g.slice(1, 5), symbol: 'PoPoPoPo', title: 'Давление на станции', decodedValue: `${val} гПа`, colorRole: 'purple' },
    ];
  }

  // 4PPPP
  if (g.startsWith('4') && g.length === 5) {
    const raw = Number(g.slice(1, 5)) / 10;
    const full = raw < 500 ? (1000 + raw).toFixed(1) : raw.toFixed(1);
    return [
      { digits: '4', symbol: '4', title: 'Индикатор уровня моря', decodedValue: 'Приведённое давление', colorRole: 'blue' },
      { digits: g.slice(1, 5), symbol: 'PPPP', title: 'Давление уровня моря', decodedValue: `${full} гПа`, colorRole: 'green' },
    ];
  }

  // 5appp
  if (g.startsWith('5') && g.length === 5) {
    const val = (Number(g.slice(2, 5)) / 10).toFixed(1);
    return [
      { digits: '5', symbol: '5', title: 'Индикатор тенденции', decodedValue: 'Барическая тенденция', colorRole: 'blue' },
      { digits: g[1], symbol: 'a', title: 'Характеристика барографа', decodedValue: `Код ${g[1]}`, colorRole: 'amber' },
      { digits: g.slice(2, 5), symbol: 'ppp', title: 'Величина изменения за 3ч', decodedValue: `${val} гПа`, colorRole: 'cyan' },
    ];
  }

  // Default fallback
  return [
    { digits: g, symbol: groupType || 'КН-01', title: 'Кодовая группа', decodedValue: g, colorRole: 'cyan' }
  ];
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'rgba(78, 205, 196, 0.15)', text: 'var(--color-primary-cyan)', border: 'var(--color-primary-cyan)' },
  amber: { bg: 'rgba(243, 156, 18, 0.15)', text: 'var(--color-accent-amber)', border: 'var(--color-accent-amber)' },
  green: { bg: 'rgba(46, 204, 113, 0.15)', text: 'var(--color-success, #2ecc71)', border: 'var(--color-success, #2ecc71)' },
  purple: { bg: 'rgba(155, 89, 182, 0.15)', text: '#b084cc', border: '#b084cc' },
  blue: { bg: 'rgba(52, 152, 219, 0.15)', text: '#5dade2', border: '#5dade2' },
};

export function DigitAnatomy({
  codeGroup,
  groupType = '',
  isCorrect = true,
  userAnswer,
  explanation,
}: DigitAnatomyProps) {
  const segments = useMemo(() => parseGroupAnatomy(codeGroup, groupType), [codeGroup, groupType]);

  return (
    <div className="digit-anatomy" style={{
      background: 'rgba(7, 13, 30, 0.95)',
      border: '1px solid var(--ui-border-subtle)',
      borderRadius: 6,
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden',
      marginTop: 12
    }}>
      {/* Аутентичный штамп верификации */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 16,
        transform: 'rotate(-4deg)',
        border: isCorrect ? '2px solid var(--color-success, #2ecc71)' : '2px solid var(--color-danger, #e74c3c)',
        color: isCorrect ? 'var(--color-success, #2ecc71)' : 'var(--color-danger, #e74c3c)',
        background: isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
        padding: '3px 10px',
        fontSize: 11,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        letterSpacing: 1,
        borderRadius: 2
      }}>
        {isCorrect ? '✔ ПРОВЕРЕНО 26063' : '✖ ОШИБКА РАСКОДИРОВАНИЯ'}
      </div>

      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginBottom: 8, fontFamily: 'var(--font-pixel-ui)' }}>
        ПОЦИФРОВОЙ РАЗБОР ГРУППЫ:
      </div>

      {/* Поцифровые блоки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {segments.map((seg, i) => {
          const colors = COLOR_MAP[seg.colorRole] || COLOR_MAP.cyan;
          return (
            <div
              key={i}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: '6px 12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold', color: colors.text }}>
                {seg.digits}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', fontFamily: 'monospace' }}>
                {seg.symbol}
              </div>
            </div>
          );
        })}
      </div>

      {/* Список расшифрованных полей */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg, i) => {
          const colors = COLOR_MAP[seg.colorRole] || COLOR_MAP.cyan;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                paddingBottom: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: colors.text,
                  width: 36,
                  display: 'inline-block'
                }}>
                  {seg.digits}
                </span>
                <span style={{ color: 'var(--ui-text-secondary)' }}>
                  {seg.title} ({seg.symbol}):
                </span>
              </div>
              <span style={{ fontWeight: 'bold', color: 'var(--ui-text-primary)', fontFamily: 'monospace' }}>
                {seg.decodedValue}
              </span>
            </div>
          );
        })}
      </div>

      {explanation && (
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px dashed var(--ui-border-subtle)',
          fontSize: 11,
          color: 'var(--ui-text-muted)',
          lineHeight: 1.45
        }}>
          💡 <strong>Методическое указание:</strong> {explanation}
        </div>
      )}
    </div>
  );
}
