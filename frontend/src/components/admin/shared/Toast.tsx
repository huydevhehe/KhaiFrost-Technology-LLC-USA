"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { describeApiError, type ErrorContext } from "@/lib/api/errorMessages";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
  /** Optional bold first line. */
  title?: string;
}

export interface ToastApi {
  show: (message: string, tone?: ToastTone, title?: string) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  /** Maps any thrown value (ApiError included) to a Vietnamese message and shows it. */
  apiError: (error: unknown, context?: ErrorContext) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION_MS = 4000;

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-red-200 bg-white text-red-800",
  info: "border-slate-200 bg-white text-slate-800",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />;
  if (tone === "error") return <AlertCircle size={18} className="shrink-0 text-red-500" />;
  return <Info size={18} className="shrink-0 text-sky-500" />;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Auto-dismiss delay in ms (default 4000). */
  duration?: number;
}

/** Mount once (admin layout). Renders an accessible live region in the corner. */
export function ToastProvider({ children, duration = DEFAULT_DURATION_MS }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info", title?: string) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((prev) => [...prev, { id, tone, message, title }]);
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
      timers.current.set(id, timer);
      return id;
    },
    [duration],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, title) => show(message, "success", title),
      error: (message, title) => show(message, "error", title),
      info: (message, title) => show(message, "info", title),
      apiError: (error, context) => {
        const message = describeApiError(error, context);
        show(message, "error");
        return message;
      },
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed top-4 right-4 z-60 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg ${TONE_STYLES[toast.tone]}`}
          >
            <ToneIcon tone={toast.tone} />
            <div className="min-w-0 flex-1 text-sm">
              {toast.title && <p className="font-semibold">{toast.title}</p>}
              <p className="wrap-break-word">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Đóng thông báo"
              className="-mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:ring-2 focus:ring-accent/30 focus:outline-none"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Throws when no ToastProvider is mounted above the caller. */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast phải được dùng bên trong <ToastProvider>.");
  return context;
}

export interface ApiActionOptions {
  /** Toast shown when the call resolves. */
  successMessage?: string;
  /** Context used by describeApiError for a better Vietnamese wording. */
  errorContext?: ErrorContext;
  /** Set false to keep the error silent (it is still returned in `error`). */
  showErrorToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown, message: string) => void;
}

export interface ApiAction {
  /** Runs the call; resolves with its result, or `undefined` when it failed. */
  run: <T>(action: () => Promise<T>, options?: ApiActionOptions) => Promise<T | undefined>;
  pending: boolean;
  /** Vietnamese message of the last failure, or null. */
  error: string | null;
  reset: () => void;
}

/** Wraps an admin API call with pending state, a success toast and Vietnamese error mapping. */
export function useApiAction(defaults: ApiActionOptions = {}): ApiAction {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const defaultsRef = useRef(defaults);

  useEffect(() => {
    defaultsRef.current = defaults;
  }, [defaults]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options?: ApiActionOptions): Promise<T | undefined> => {
      const merged = { ...defaultsRef.current, ...options };
      setPending(true);
      setError(null);
      try {
        const result = await action();
        if (merged.successMessage) toast.success(merged.successMessage);
        merged.onSuccess?.();
        return result;
      } catch (caught) {
        const message = describeApiError(caught, merged.errorContext);
        if (alive.current) setError(message);
        if (merged.showErrorToast !== false) toast.error(message);
        merged.onError?.(caught, message);
        return undefined;
      } finally {
        if (alive.current) setPending(false);
      }
    },
    [toast],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
