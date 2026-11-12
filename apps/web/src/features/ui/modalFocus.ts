import type { KeyboardEvent } from 'react';

const TAB_TARGETS = 'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

/** Keep sequential focus inside a native modal instead of handing it to browser chrome. */
export function keepTabInDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;

  const dialog = event.currentTarget;
  if (!dialog.open || !(event.target instanceof Element) || event.target.closest('dialog') !== dialog) return;

  // Read on each Tab: loading, validation and conditional fields may change the order.
  const targets = Array.from(dialog.querySelectorAll<HTMLElement>(TAB_TARGETS))
    .filter((node) => {
      if (node.tabIndex < 0 || node.matches(':disabled, input[type="hidden"]') || node.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const visibility = window.getComputedStyle(node).visibility;
      return node.getClientRects().length > 0 && visibility !== 'hidden' && visibility !== 'collapse';
    })
    .sort((left, right) => (left.tabIndex || Number.MAX_SAFE_INTEGER) - (right.tabIndex || Number.MAX_SAFE_INTEGER));

  const first = targets[0];
  const last = targets[targets.length - 1];
  const active = document.activeElement;
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (event.shiftKey && (active === first || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    first.focus();
  }
}
