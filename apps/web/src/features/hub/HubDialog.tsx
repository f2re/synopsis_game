import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { PixelIconName } from '../ui/PixelIcon';
import { HubIcon } from './HubIcon';

interface HubDialogProps {
  title: string;
  subtitle?: string;
  icon?: PixelIconName;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** A native modal keeps Tab in the dialog and restores the triggering control. */
export function HubDialog({ title, subtitle, icon, onClose, children, footer }: HubDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();

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

  return (
    <dialog
      ref={ref}
      className="hub-dialog"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <header className="hub-dialog__header">
        {icon && <HubIcon name={icon} size={40} />}
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p id={subtitleId}>{subtitle}</p>}
        </div>
        <button type="button" className="hub-icon-button hub-dialog__close" onClick={onClose} aria-label="Закрыть окно" autoFocus>×</button>
      </header>
      <div className="hub-dialog__body">{children}</div>
      {footer && <footer className="hub-dialog__footer">{footer}</footer>}
    </dialog>
  );
}
