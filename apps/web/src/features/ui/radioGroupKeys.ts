import type { KeyboardEvent } from 'react';

/** Roving focus for button-based radio choices. Selection uses the same click
 * handler as pointer input, so disabled controls and answer state stay shared. */
export function handleRadioGroupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const target = event.target as Element;
  const active = target.closest<HTMLButtonElement>('button[role="radio"]');
  if (!active || active.closest('[role="radiogroup"]') !== event.currentTarget) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]'))
    .filter(button => button.closest('[role="radiogroup"]') === event.currentTarget && !button.disabled && button.getAttribute('aria-disabled') !== 'true' && !button.hidden);
  const index = buttons.indexOf(active);
  if (index < 0 || buttons.length === 0) return;
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[next].focus();
  buttons[next].click();
}
