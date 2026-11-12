import type { KeyboardEvent } from 'react';

const TAB_TARGETS = 'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

/** Keep sequential focus inside a native modal instead of handing it to browser chrome. */
export function keepTabInDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;

  const dialog = event.currentTarget;
  if (!dialog.open || !(event.target instanceof Element) || event.target.closest('dialog') !== dialog) return;

  // Read on each Tab: loading, validation and conditional fields may change the order.
  const visibleTargets = Array.from(dialog.querySelectorAll<HTMLElement>(TAB_TARGETS))
    .filter((node) => {
      if (node.tabIndex < 0 || node.matches(':disabled, input[type="hidden"]') || node.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const visibility = window.getComputedStyle(node).visibility;
      return node.getClientRects().length > 0 && visibility !== 'hidden' && visibility !== 'collapse';
    });
  // A named radio group is one Tab stop. Keep the checked radio (or the first
  // enabled option), matching native sequential focus in Chromium and Firefox.
  const targets = visibleTargets.filter(node => {
      if (!(node instanceof HTMLInputElement) || node.type !== 'radio' || !node.name) return true;
      const group = visibleTargets.filter((candidate): candidate is HTMLInputElement =>
        candidate instanceof HTMLInputElement && candidate.type === 'radio' && candidate.name === node.name && candidate.form === node.form);
      return node === (group.find(candidate => candidate.checked) ?? group[0]);
    })
    .sort((left, right) => (left.tabIndex || Number.MAX_SAFE_INTEGER) - (right.tabIndex || Number.MAX_SAFE_INTEGER));

  const first = targets[0];
  const last = targets[targets.length - 1];
  const active = document.activeElement;
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (active instanceof Element && dialog.contains(active) && active !== dialog && !targets.includes(active as HTMLElement)) {
    // A page heading can receive programmatic focus after navigation. Continue
    // from its DOM position instead of jumping back to the close button.
    const adjacent = event.shiftKey
      ? [...targets].reverse().find(node => active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING)
      : targets.find(node => active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    event.preventDefault();
    (adjacent ?? (event.shiftKey ? last : first)).focus();
  } else if (event.shiftKey && (active === first || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    first.focus();
  }
}
