"use client";

import { useEffect, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const updateHtmlLang = (lng: string) => {
      document.documentElement.lang = lng.startsWith("vi") ? "vi" : "en";
    };
    updateHtmlLang(i18n.language);
    i18n.on("languageChanged", updateHtmlLang);
    return () => {
      i18n.off("languageChanged", updateHtmlLang);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
