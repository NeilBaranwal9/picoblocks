/**
 * Promise-based confirm and prompt dialogs, so destructive actions (deleting a
 * file on the board, clearing the workspace) always ask first.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}

interface PromptRequest {
  kind: 'prompt';
  title: string;
  message?: ReactNode;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
}

type Request = (ConfirmRequest | PromptRequest) & {
  resolve: (value: string | boolean | null) => void;
};

interface DialogApi {
  confirm(request: Omit<ConfirmRequest, 'kind'>): Promise<boolean>;
  prompt(request: Omit<PromptRequest, 'kind'>): Promise<string | null>;
}

const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  prompt: async () => null,
});

export function useDialogs(): DialogApi {
  return useContext(DialogContext);
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          setRequest({
            ...options,
            kind: 'confirm',
            resolve: (result) => resolve(Boolean(result)),
          });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          setValue(options.defaultValue ?? '');
          setRequest({
            ...options,
            kind: 'prompt',
            resolve: (result) => resolve(typeof result === 'string' ? result : null),
          });
        }),
    }),
    [],
  );

  const close = useCallback(
    (result: string | boolean | null) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request],
  );

  useEffect(() => {
    if (request?.kind === 'prompt') inputRef.current?.select();
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(request.kind === 'prompt' ? null : false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, close]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-md rounded-2xl border-[1.5px] border-line-strong bg-surface p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              close(request.kind === 'prompt' ? value.trim() : true);
            }}
          >
            <h2 className="font-display text-lg font-semibold">{request.title}</h2>
            {'message' in request && request.message && (
              <p className="mt-2 text-sm text-ink-soft">{request.message}</p>
            )}
            {request.kind === 'prompt' && (
              <label className="mt-4 block text-sm font-semibold">
                {request.label}
                <input
                  ref={inputRef}
                  className="pb-input mt-1 w-full"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoFocus
                />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="pb-btn"
                onClick={() => close(request.kind === 'prompt' ? null : false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`pb-btn ${
                  request.kind === 'confirm' && request.destructive
                    ? 'pb-btn-stop'
                    : 'pb-btn-brand'
                }`}
                disabled={request.kind === 'prompt' && !value.trim()}
              >
                {request.confirmLabel ?? 'OK'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}
