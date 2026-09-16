import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/content/i18n/en.json";
import vi from "@/content/i18n/vi.json";

export const LANG_STORAGE_KEY = "khaifrost-lang";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
