import { useEffect, useRef, type ReactNode } from 'react';

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
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={ref} className="hub-auth-dialog" aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
