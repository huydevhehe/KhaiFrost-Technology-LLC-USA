"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { describeApiError } from "@/lib/api/errorMessages";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  title: string;
  /** Body text or rich content. */
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button and warning icon. */
  danger?: boolean;
  /**
   * Optional work to run while the dialog shows a spinner. The dialog stays
   * open and shows the API error when it rejects; it resolves `true` only on success.
   */
  onConfirm?: () => void | Promise<void>;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onCancel: () => void;
  /** Resolved after `onConfirm` (when given) succeeded. */
  onResolve: (confirmed: boolean) => void;
}

/** Standalone confirmation modal with async confirm handling. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger = false,
  onConfirm,
  onCancel,
  onResolve,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!onConfirm) {
      onResolve(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setPending(false);
      onResolve(true);
    } catch (caught) {
      setPending(false);
      setError(describeApiError(caught));
    }
  }, [onConfirm, onResolve]);

  const handleCancel = useCallback(() => {
    if (pending) return;
    setError(null);
    onCancel();
  }, [pending, onCancel]);

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={title}
      size="sm"
      disableDismiss={pending}
      hideCloseButton={pending}
      footer={
        <>
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={pending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors focus:ring-2 focus:outline-none disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-300"
                : "bg-accent hover:bg-accent/90 focus:ring-accent/30"
            }`}
          >
            {pending && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />}
        <div className="min-w-0 flex-1 text-sm text-slate-600">
          {typeof message === "string" ? <p>{message}</p> : message}
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/** Mount once (admin layout or page root) so `useConfirm()` works below it. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PendingConfirm | null>(null);
  const currentRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    // A second request replaces the first, which then resolves false.
    currentRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next: PendingConfirm = { options, resolve };
      currentRef.current = next;
      setCurrent(next);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    const pending = currentRef.current;
    currentRef.current = null;
    setCurrent(null);
    pending?.resolve(confirmed);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current && (
        <ConfirmDialog
          {...current.options}
          open
          onCancel={() => settle(false)}
          onResolve={settle}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** `const ok = await confirm({ title, message, confirmLabel, danger })`. */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm phải được dùng bên trong <ConfirmProvider>.");
  return context;
}
