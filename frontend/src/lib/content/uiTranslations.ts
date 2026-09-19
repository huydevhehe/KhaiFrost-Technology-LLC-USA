import type { i18n as I18nInstance } from "i18next";
import { fetchPublicOnce } from "./store";

type Bundle = Record<string, unknown>;

const REFRESH_AFTER_MS = 60_000;
const lastLoaded = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

/** Drops empty strings so a blank value in the database never hides the bundled text. */
function withoutEmpty(node: unknown): unknown {
  if (typeof node === "string") return node.trim() === "" ? undefined : node;
  if (node === null || typeof node !== "object" || Array.isArray(node)) return node;
  const result: Bundle = {};
  for (const [key, value] of Object.entries(node as Bundle)) {
    const cleaned = withoutEmpty(value);
    if (cleaned !== undefined) result[key] = cleaned;
  }
  return result;
}

/**
 * Merges the UI strings served by GET /public/ui-translations/:locale over the bundled i18n JSON
 * (deep merge, API wins). Failures are silent: the bundled strings keep working.
 */
export function loadUiTranslations(i18n: I18nInstance, locale: "vi" | "en"): Promise<void> {
  const existing = inFlight.get(locale);
  if (existing) return existing;
  const last = lastLoaded.get(locale);
  if (last !== undefined && Date.now() - last < REFRESH_AFTER_MS) return Promise.resolve();

  const job = (async () => {
    const bundle = await fetchPublicOnce<Record<string, Bundle>>(`/public/ui-translations/${locale}`);
    if (!bundle || typeof bundle !== "object") return;
    for (const [namespace, resources] of Object.entries(bundle)) {
      if (resources === null || typeof resources !== "object") continue;
      const cleaned = withoutEmpty(resources) as Bundle;
      i18n.addResourceBundle(locale, namespace, cleaned, true, true);
    }
    lastLoaded.set(locale, Date.now());
  })().finally(() => {
    inFlight.delete(locale);
  });
  inFlight.set(locale, job);
  return job;
}
