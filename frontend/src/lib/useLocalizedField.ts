import { useTranslation } from "react-i18next";
import { LocalizedText } from "@/types";

export function useLocalizedField(field: LocalizedText): string {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("vi") ? field.vi : field.en;
}
