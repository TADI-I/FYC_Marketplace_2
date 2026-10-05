import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAccessibleModal } from './useAccessibleModal';

export type AppNotificationType = 'success' | 'error' | 'warning' | 'info';

export type AppNotification = {
  title: string;
  message: string;
  type?: AppNotificationType;
  actionLabel?: string;
};

type QueuedNotification = AppNotification & {
  id: number;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve?: (confirmed: boolean) => void;
};

const NOTIFICATION_EVENT = 'fyc:app-notification';
export const NOTIFICATION_VISIBILITY_EVENT = 'fyc:app-notification-visibility';
let nextNotificationId = 1;

const dispatchNotification = (notification: Omit<QueuedNotification, 'id'>) => {
  window.dispatchEvent(new CustomEvent<QueuedNotification>(NOTIFICATION_EVENT, {
    detail: { ...notification, id: nextNotificationId++ }
  }));
};

export const showNotification = (notification: AppNotification) => {
  dispatchNotification(notification);
};

export const showConfirmation = (
  notification: AppNotification & { confirmLabel?: string; cancelLabel?: string }
): Promise<boolean> => new Promise(resolve => {
  dispatchNotification({ ...notification, resolve });
});

const notificationPresentation = {
  success: { Icon: CheckCircle2, eyebrow: 'Completed' },
  error: { Icon: XCircle, eyebrow: 'Something went wrong' },
  warning: { Icon: AlertTriangle, eyebrow: 'Attention needed' },
  info: { Icon: Info, eyebrow: 'Marketplace update' }
};

const ActiveNotificationModal: React.FC<{
  notification: QueuedNotification;
  onResolve: (confirmed: boolean) => void;
}> = ({ notification, onResolve }) => {
  const close = useCallback(() => onResolve(false), [onResolve]);
  const dialogRef = useAccessibleModal(close);
  const type = notification.type || 'info';
  const { Icon, eyebrow } = notificationPresentation[type];
  const isConfirmation = Boolean(notification.resolve);

  return (
    <div className="premium-modal-layer" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <div
        ref={dialogRef}
        className={`premium-modal-card app-notification-card app-notification-${type}`}
        role={type === 'error' || type === 'warning' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={`app-notification-title-${notification.id}`}
        aria-describedby={`app-notification-message-${notification.id}`}
      >
        <button type="button" className="premium-modal-close" onClick={close} aria-label="Close notification">
          <X aria-hidden="true" />
        </button>

        <div className={`premium-modal-icon app-notification-icon app-notification-icon-${type}`} aria-hidden="true">
          <Icon />
        </div>
        <p className="premium-modal-eyebrow app-notification-eyebrow">{eyebrow}</p>
        <h2 id={`app-notification-title-${notification.id}`}>{notification.title}</h2>
        <p id={`app-notification-message-${notification.id}`} className="premium-modal-copy">
          {notification.message}
        </p>

        <div className={`app-notification-actions${isConfirmation ? ' app-notification-actions-split' : ''}`}>
          {isConfirmation && (
            <button type="button" className="premium-modal-secondary" onClick={() => onResolve(false)}>
              {notification.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={`premium-modal-primary app-notification-primary-${type}`}
            onClick={() => onResolve(true)}
            data-autofocus="true"
          >
            {isConfirmation ? notification.confirmLabel || 'Confirm' : notification.actionLabel || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppNotificationHost: React.FC = () => {
  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const activeNotification = queue[0] || null;

  useEffect(() => {
    const receiveNotification = (event: Event) => {
      const notification = (event as CustomEvent<QueuedNotification>).detail;
      setQueue(current => [...current, notification]);
    };
    window.addEventListener(NOTIFICATION_EVENT, receiveNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, receiveNotification);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent<boolean>(NOTIFICATION_VISIBILITY_EVENT, {
      detail: Boolean(activeNotification)
    }));
  }, [activeNotification]);

  const resolveActive = useCallback((confirmed: boolean) => {
    setQueue(current => {
      const [active, ...remaining] = current;
      active?.resolve?.(confirmed);
      return remaining;
    });
  }, []);

  return activeNotification
    ? <ActiveNotificationModal notification={activeNotification} onResolve={resolveActive} />
    : null;
};
