import { useCallback, useRef, useState } from "react";
import { apiPost, isApiError } from "@/lib/api/client";
import type { ContactFormValues } from "@/lib/validateContactForm";
import { useContentLocale } from "./store";

export type ContactSubmitStatus = "idle" | "sending" | "success" | "error" | "rateLimited";

/**
 * Sends the website contact form to POST /public/contact (5 requests per minute per IP on the backend).
 * `subject` is the human readable subject text; the honeypot field `website` must stay empty for real visitors.
 */
export function useContactSubmit(): {
  status: ContactSubmitStatus;
  submit: (values: ContactFormValues, subjectText: string, honeypot: string) => Promise<boolean>;
  reset: () => void;
} {
  const locale = useContentLocale();
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const busy = useRef(false);

  const submit = useCallback(
    async (values: ContactFormValues, subjectText: string, honeypot: string): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setStatus("sending");
      try {
        await apiPost("/public/contact", {
          name: values.name.trim(),
          email: values.email.trim(),
          subject: subjectText.trim() || undefined,
          message: values.message.trim(),
          locale,
          sourcePage: typeof window !== "undefined" ? window.location.pathname : undefined,
          website: honeypot,
        }, { skipRefresh: true });
        setStatus("success");
        return true;
      } catch (error) {
        setStatus(isApiError(error) && (error.status === 429 || error.code === "RATE_LIMITED") ? "rateLimited" : "error");
        return false;
      } finally {
        busy.current = false;
      }
    },
    [locale],
  );

  const reset = useCallback(() => setStatus("idle"), []);
  return { status, submit, reset };
}
