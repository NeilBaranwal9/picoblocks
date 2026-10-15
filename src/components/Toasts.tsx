/** Corner notifications for things that happen away from the pointer. */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

export type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show(message: string, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const TONE_STYLE: Record<ToastTone, string> = {
  info: 'border-line-strong bg-surface text-ink',
  success: 'border-run bg-run text-white',
  error: 'border-stop bg-stop text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show(message, tone = 'info') {
        const id = nextId.current++;
        setToasts((current) => [...current.slice(-3), { id, tone, message }]);
        setTimeout(() => dismiss(id), tone === 'error' ? 9000 : 4500);
      },
    }),
    [dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border-[1.5px] px-4 py-2.5 shadow-lg ${TONE_STYLE[toast.tone]}`}
          >
            <span className="text-sm leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="mt-0.5 shrink-0 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
