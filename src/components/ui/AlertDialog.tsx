import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';
import './AlertDialog.css';

// ─── Types ───────────────────────────────────────────────

type DialogVariant = 'info' | 'warning' | 'danger' | 'success';

interface AlertOptions {
  title: string;
  message: string;
  variant?: DialogVariant;
  confirmLabel?: string;
}

interface ConfirmOptions extends AlertOptions {
  cancelLabel?: string;
}

interface DialogState extends ConfirmOptions {
  type: 'alert' | 'confirm';
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

// ─── Icon Map ────────────────────────────────────────────

function DialogIcon({ variant }: { variant: DialogVariant }) {
  const icon = {
    info: <Info size={22} />,
    warning: <AlertTriangle size={22} />,
    danger: <Trash2 size={22} />,
    success: <CheckCircle size={22} />,
  }[variant];

  return <div className={`alert-dialog-icon ${variant}`}>{icon}</div>;
}

// ─── Provider ────────────────────────────────────────────

export function AlertProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  const showAlert = useCallback(
    (options: AlertOptions): Promise<void> => {
      return new Promise((resolve) => {
        resolveRef.current = () => resolve();
        setDialog({
          type: 'alert',
          variant: 'info',
          confirmLabel: 'OK',
          ...options,
        });
      });
    },
    []
  );

  const showConfirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog({
          type: 'confirm',
          variant: 'danger',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          ...options,
        });
      });
    },
    []
  );

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className="alert-overlay" onClick={() => close(false)}>
          <div
            className="alert-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="alert-dialog-body">
              <DialogIcon variant={dialog.variant || 'info'} />
              <h2 className="alert-dialog-title">{dialog.title}</h2>
              <p className="alert-dialog-message">{dialog.message}</p>
            </div>
            <div className="alert-dialog-actions">
              {dialog.type === 'confirm' && (
                <button
                  className="alert-dialog-btn cancel"
                  onClick={() => close(false)}
                >
                  {dialog.cancelLabel}
                </button>
              )}
              <button
                className={`alert-dialog-btn confirm ${dialog.variant === 'danger' ? 'danger' : ''}`}
                onClick={() => close(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
