import React from 'react';

// 1. Panel (Dark Teal, Raised Slate, Brass Dialog)
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'dark_teal' | 'raised_slate' | 'brass_dialog';
  focused?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  variant = 'dark_teal',
  focused = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`pixel-panel pixel-panel--${variant} ${focused ? 'pixel-panel--focused' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. Button (Primary Amber, Secondary Teal, Ghost)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`pixel-btn pixel-btn--${variant} ${isLoading ? 'pixel-btn--loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="pixel-spinner">...</span> : children}
    </button>
  );
};

// 3. PaperForm (Sheet, Perforated, Clipboard)
export interface PaperFormProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'sheet' | 'perforated' | 'clipboard';
  state?: 'normal' | 'stamped' | 'error_redline';
}

export const PaperForm: React.FC<PaperFormProps> = ({
  variant = 'sheet',
  state = 'normal',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`pixel-blank pixel-blank--${variant} pixel-blank--${state} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 4. Tape (Telegram ribbon)
export interface TapeProps extends React.HTMLAttributes<HTMLDivElement> {
  groups: string[];
  selectedIndex?: number;
  errorIndex?: number;
  acceptedIndex?: number;
  onSelectGroup?: (index: number) => void;
}

export const Tape: React.FC<TapeProps> = ({
  groups,
  selectedIndex,
  errorIndex,
  acceptedIndex,
  onSelectGroup,
  className = '',
  ...props
}) => {
  return (
    <div className={`pixel-tape ${className}`} role="region" aria-label="Телеграфная лента" {...props}>
      <div className="pixel-tape__perforation pixel-tape__perforation--top" />
      <div className="pixel-tape__groups">
        {groups.map((grp, idx) => {
          let statusClass = '';
          if (idx === selectedIndex) statusClass = 'pixel-tape__group--selected';
          if (idx === errorIndex) statusClass = 'pixel-tape__group--error';
          if (idx === acceptedIndex) statusClass = 'pixel-tape__group--accepted';

          return (
            <button
              key={`${grp}-${idx}`}
              type="button"
              className={`pixel-tape__group ${statusClass}`}
              onClick={() => onSelectGroup?.(idx)}
              aria-selected={idx === selectedIndex}
            >
              {grp}
            </button>
          );
        })}
      </div>
      <div className="pixel-tape__perforation pixel-tape__perforation--bottom" />
    </div>
  );
};

// 5. KeyPad (0-9, /, Backspace, Enter)
export interface KeyPadProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const KeyPad: React.FC<KeyPadProps> = ({
  onKeyPress,
  onBackspace,
  onSubmit,
  disabled = false,
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/'];

  return (
    <div className="pixel-keypad" role="group" aria-label="Клавиатура ввода">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className="pixel-keypad__key"
          disabled={disabled}
          onClick={() => onKeyPress(k)}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        className="pixel-keypad__key pixel-keypad__key--backspace"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Стереть"
      >
        ⌫
      </button>
      <button
        type="button"
        className="pixel-keypad__key pixel-keypad__key--enter"
        disabled={disabled}
        onClick={onSubmit}
        aria-label="Ввод"
      >
        Ввод
      </button>
    </div>
  );
};

// 6. ChoiceCard (А-Г)
export interface ChoiceCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  letter: string;
  label: string;
  state?: 'idle' | 'selected' | 'correct' | 'incorrect';
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  letter,
  label,
  state = 'idle',
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      className={`pixel-choice-card pixel-choice-card--${state} ${className}`}
      {...props}
    >
      <span className="pixel-choice-card__letter">[{letter}]</span>
      <span className="pixel-choice-card__label">{label}</span>
      {state === 'correct' && <span className="pixel-choice-card__icon">✓</span>}
      {state === 'incorrect' && <span className="pixel-choice-card__icon">✗</span>}
    </button>
  );
};

// 7. Stamp («ПРИНЯТО», «ПРОВЕРИТЬ», «ДОПУСК»)
export interface StampProps {
  type: 'ПРИНЯТО' | 'ПРОВЕРИТЬ' | 'ДОПУСК';
  animated?: boolean;
}

export const Stamp: React.FC<StampProps> = ({ type, animated = false }) => {
  return (
    <div
      className={`pixel-stamp pixel-stamp--${type.toLowerCase()} ${animated ? 'pixel-stamp--impact' : ''}`}
      role="status"
    >
      {type}
    </div>
  );
};

// 8. StreakLamps (5 ламп)
export interface StreakLampsProps {
  currentStreak: number;
  maxStreak?: number;
}

export const StreakLamps: React.FC<StreakLampsProps> = ({ currentStreak, maxStreak = 5 }) => {
  return (
    <div className="pixel-streak-lamps" role="progressbar" aria-valuenow={currentStreak} aria-valuemax={maxStreak}>
      {Array.from({ length: maxStreak }).map((_, i) => {
        const isLit = i < currentStreak;
        const isFlash = i === currentStreak - 1 && currentStreak > 0;
        return (
          <span
            key={i}
            className={`pixel-streak-lamp ${isLit ? 'pixel-streak-lamp--lit' : ''} ${isFlash ? 'pixel-streak-lamp--flash' : ''}`}
          />
        );
      })}
    </div>
  );
};

// 9. MentorPortrait (6 эмоций)
export type MentorEmotion = 'neutral' | 'smile' | 'thoughtful' | 'surprised' | 'approval' | 'glasses_up';

export interface MentorPortraitProps {
  emotion?: MentorEmotion;
  size?: number;
}

export const MentorPortrait: React.FC<MentorPortraitProps> = ({ emotion = 'neutral', size = 64 }) => {
  return (
    <div
      className={`pixel-mentor-portrait pixel-mentor-portrait--${emotion}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Вера Павловна Ладожская: ${emotion}`}
    />
  );
};

// 10. SpeechBubble
export interface SpeechBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  tail?: 'left' | 'bottom';
  speaker?: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  tail = 'left',
  speaker,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`pixel-speech-bubble pixel-speech-bubble--tail-${tail} ${className}`} {...props}>
      {speaker && <div className="pixel-speech-bubble__speaker">{speaker}</div>}
      <div className="pixel-speech-bubble__content">{children}</div>
    </div>
  );
};

// 11. Dialog
export interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="pixel-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="pixel-dialog-container pixel-panel pixel-panel--brass_dialog">
        <div className="pixel-dialog-header">
          <h2 id="dialog-title" className="pixel-dialog-title">{title}</h2>
          <button type="button" className="pixel-dialog-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="pixel-dialog-body">{children}</div>
      </div>
    </div>
  );
};

// 12. DigitAnatomy (разбор структуры группы КН-01)
export interface DigitAnatomyItem {
  digit: string;
  role: string;
  description: string;
}

export interface DigitAnatomyProps {
  groupName: string;
  items: DigitAnatomyItem[];
}

export const DigitAnatomy: React.FC<DigitAnatomyProps> = ({ groupName, items }) => {
  return (
    <div className="pixel-digit-anatomy" role="region" aria-label={`Анатомия группы ${groupName}`}>
      <div className="pixel-digit-anatomy__name">{groupName}</div>
      <div className="pixel-digit-anatomy__digits">
        {items.map((item, idx) => (
          <div key={idx} className="pixel-digit-anatomy__item">
            <span className="pixel-digit-anatomy__digit">{item.digit}</span>
            <span className="pixel-digit-anatomy__role">{item.role}</span>
            <span className="pixel-digit-anatomy__desc">{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
