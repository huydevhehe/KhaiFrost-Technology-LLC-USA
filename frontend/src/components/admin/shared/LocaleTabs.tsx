"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "./types";

export interface LocaleTabsProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  /** Locales still missing required fields get a red dot. */
  incomplete?: Partial<Record<Locale, boolean>>;
  /** Extra content on the right of the tab strip (e.g. a "Sao chép từ VI" button). */
  action?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Tiếng Việt / English tab strip for translated forms. */
export function LocaleTabs({
  value,
  onChange,
  incomplete,
  action,
  disabled = false,
  className = "",
}: LocaleTabsProps) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-slate-200 ${className}`}>
      <div role="tablist" aria-label="Ngôn ngữ" className="flex items-center gap-1">
        {LOCALES.map((locale) => {
          const active = locale === value;
          const missing = incomplete?.[locale] === true;
          return (
            <button
              key={locale}
              type="button"
              role="tab"
              id={`locale-tab-${locale}`}
              aria-selected={active}
              aria-controls={`locale-panel-${locale}`}
              disabled={disabled}
              onClick={() => onChange(locale)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50 ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {LOCALE_LABELS[locale]}
              {missing && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-red-500"
                  title="Thiếu nội dung bắt buộc"
                  aria-label="Thiếu nội dung bắt buộc"
                  role="img"
                />
              )}
            </button>
          );
        })}
      </div>
      {action}
    </div>
  );
}

export interface TranslatedFieldsProps {
  /** The locale this panel belongs to; it is hidden unless it is the active one. */
  locale: Locale;
  active: Locale;
  children: ReactNode;
  className?: string;
}

/**
 * Panel wrapper for one locale. Inactive panels stay mounted (hidden) so typed
 * values and scroll position survive tab switches.
 */
export function TranslatedFields({ locale, active, children, className = "" }: TranslatedFieldsProps) {
  const isActive = locale === active;
  return (
    <div
      role="tabpanel"
      id={`locale-panel-${locale}`}
      aria-labelledby={`locale-tab-${locale}`}
      hidden={!isActive}
      className={isActive ? className : undefined}
    >
      {children}
    </div>
  );
}

export interface UseLocaleTabs {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Focuses the locale that is missing something (no-op when it is already active). */
  showLocale: (locale: Locale) => void;
}

/** Local state for a LocaleTabs strip. */
export function useLocaleTabs(initial: Locale = "vi"): UseLocaleTabs {
  const [locale, setLocale] = useState<Locale>(initial);
  const showLocale = useCallback((next: Locale) => setLocale(next), []);
  return { locale, setLocale, showLocale };
}

/** Locales whose required values are empty — feed straight into `LocaleTabs.incomplete`. */
export function missingLocales(
  values: Partial<Record<Locale, readonly (string | null | undefined)[]>>,
): Locale[] {
  return LOCALES.filter((locale) => {
    const required = values[locale];
    if (!required) return false;
    return required.some((value) => !value || value.trim() === "");
  });
}

/** `{ vi: true, en: false }` map for `LocaleTabs.incomplete`. */
export function toIncompleteMap(locales: readonly Locale[]): Partial<Record<Locale, boolean>> {
  const map: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) map[locale] = true;
  return map;
}
