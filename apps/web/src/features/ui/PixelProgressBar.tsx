import React from 'react';

export interface PixelProgressBarProps {
  value: number;
  max: number;
  variant?: 'teal' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  stepText?: string;
  showPercent?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

/**
 * PixelProgressBar — аутентичная метеорологическая шкала прогресса
 * с фосфорным мятным свечением и тактильной пиксельной рамкой.
 */
export function PixelProgressBar({
  value,
  max,
  variant = 'teal',
  size = 'md',
  label,
  stepText,
  showPercent = false,
  className = '',
  style,
  ariaLabel,
}: PixelProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));
  const accessibleLabel = ariaLabel || stepText || (typeof label === 'string' ? label : `Прогресс: ${value} из ${max}`);

  return (
    <div
      className={`pixel-progress-wrapper pixel-progress-${size} pixel-progress-${variant} ${className}`.trim()}
      style={style}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={accessibleLabel}
    >
      {(label || stepText || showPercent) && (
        <div className="pixel-progress-header">
          <span className="pixel-progress-label">{stepText || label}</span>
          {showPercent && <span className="pixel-progress-percent">{percent}%</span>}
        </div>
      )}

      <div className="pixel-progress-track" aria-hidden="true">
        <div
          className="pixel-progress-fill"
          style={{ width: `${percent}%` }}
        >
          {percent > 5 && percent < 100 && (
            <span className="pixel-progress-leading-accent" />
          )}
        </div>
      </div>
    </div>
  );
}
