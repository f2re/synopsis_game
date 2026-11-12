import { useEffect, useRef, type ReactNode } from 'react';
import { keepTabInDialog } from '../ui/modalFocus';
import { PixelScrollArea } from '../ui/PixelScrollArea';

/** Keeps existing identity forms inside the browser's accessible modal layer. */
export function HubModalLayer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="hub-auth-dialog" tabIndex={-1} aria-label={label} onKeyDown={keepTabInDialog}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <PixelScrollArea label={label} className="hub-auth-scroll" viewportClassName="hub-auth-viewport" contentClassName="hub-auth-content">{children}</PixelScrollArea>
  </dialog>;
}
