import React from 'react';
import { PixelIcon, type PixelIconName } from './PixelIcon';

export type PixelCardVariant =
  | 'default'
  | 'active'
  | 'focused'
  | 'success'
  | 'disabled'
  | 'banner'
  | 'dialog';

export interface PixelCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: PixelCardVariant;
  cornerBrackets?: boolean;
  accentDiamond?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: PixelIconName;
  headerRight?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'aside';
  className?: string;
  children?: React.ReactNode;
}

/**
 * PixelCard (PixelFrame) — аутентичный контейнер с пиксельной фаской,
 * угловыми кронштейнами и поддержкой состояний станции 26063.
 */
export function PixelCard({
  variant = 'default',
  cornerBrackets = false,
  accentDiamond = false,
  title,
  subtitle,
  icon,
  headerRight,
  onClose,
  footer,
  as: Component = 'div',
  className = '',
  children,
  style,
  ...props
}: PixelCardProps) {
  const hasHeader = Boolean(title || subtitle || icon || headerRight || onClose);

  return (
    <Component
      className={`pixel-card pixel-card-${variant} ${cornerBrackets ? 'pixel-card-with-brackets' : ''} ${className}`.trim()}
      style={style}
      {...props}
    >
      {cornerBrackets && (
        <span className="pixel-card-brackets" aria-hidden="true">
          <img
            src="/ui/frames/decor_corner_bracket_tl.png"
            className="pixel-card-bracket bracket-tl"
            alt=""
            draggable={false}
          />
          <img
            src="/ui/frames/decor_corner_bracket_tr.png"
            className="pixel-card-bracket bracket-tr"
            alt=""
            draggable={false}
          />
          <img
            src="/ui/frames/decor_corner_bracket_bl.png"
            className="pixel-card-bracket bracket-bl"
            alt=""
            draggable={false}
          />
          <img
            src="/ui/frames/decor_corner_bracket_br.png"
            className="pixel-card-bracket bracket-br"
            alt=""
            draggable={false}
          />
        </span>
      )}

      {accentDiamond && (
        <img
          src="/ui/frames/decor_accent_diamond.png"
          className="pixel-card-accent-diamond"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}

      {hasHeader && (
        <header className="pixel-card-header">
          <div className="pixel-card-header-main">
            {icon && <PixelIcon name={icon} size="md" className="pixel-card-header-icon" />}
            <div className="pixel-card-title-group">
              {title && <h3 className="pixel-card-title">{title}</h3>}
              {subtitle && <p className="pixel-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {(headerRight || onClose) && (
            <div className="pixel-card-header-actions">
              {headerRight}
              {onClose && (
                <button
                  type="button"
                  className="pixel-card-close-btn"
                  onClick={onClose}
                  aria-label="Закрыть панель"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </header>
      )}

      <div className="pixel-card-body">{children}</div>

      {footer && <footer className="pixel-card-footer">{footer}</footer>}
    </Component>
  );
}

export const PixelFrame = PixelCard;
