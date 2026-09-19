"use client";

import { useEffect, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANG_STORAGE_KEY } from "@/lib/i18n";
import { loadUiTranslations } from "@/lib/content/uiTranslations";

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const updateHtmlLang = (lng: string) => {
      document.documentElement.lang = lng.startsWith("vi") ? "vi" : "en";
    };
    // Overlay the UI strings edited in the admin on top of the bundled ones (silently keeps the bundle on failure).
    const syncApiStrings = (lng: string) => {
      void loadUiTranslations(i18n, lng.startsWith("vi") ? "vi" : "en");
    };
    i18n.on("languageChanged", updateHtmlLang);
    i18n.on("languageChanged", syncApiStrings);

    // Runs after hydration so the first client render still matches the
    // server's "en" output — avoids a hydration mismatch, then switches to
    // the saved/browser language as a normal post-mount update.
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    const detected = saved ?? (navigator.language.startsWith("vi") ? "vi" : "en");
    if (detected !== i18n.language) {
      i18n.changeLanguage(detected);
    } else {
      updateHtmlLang(detected);
      syncApiStrings(detected);
    }

    return () => {
      i18n.off("languageChanged", updateHtmlLang);
      i18n.off("languageChanged", syncApiStrings);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
