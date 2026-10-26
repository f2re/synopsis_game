import React from 'react';

export interface PixelSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * PixelSwitch — аутентичный пиксельный тумблер в стиле cozy-science консоли 26063.
 * Имеет тактильный отклик, анимацию хода ползунка и поддержку доступности (a11y).
 */
export function PixelSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  name,
  ariaLabel,
  className = '',
}: PixelSwitchProps) {
  return (
    <label className={`pixel-switch ${className}`.trim()}>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pixel-switch-track" aria-hidden="true">
        <span className="pixel-switch-thumb" />
      </span>
      {label && <span className="pixel-switch-label">{label}</span>}
    </label>
  );
}
