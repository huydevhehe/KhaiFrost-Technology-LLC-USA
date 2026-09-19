import { useMemo } from "react";
import { aboutTeamMembers } from "@/content/aboutPageData";
import type { AboutTeamMember } from "@/types";
import { sectionImageUrl, useSection } from "./pages";
import { asArray, localized, text, useContentLocale } from "./store";

interface TeamItemDto {
  id?: string;
  title?: string;
  description?: string;
  image?: unknown;
}

/** Team cards of the about page (`team` card-grid section: title = name, description = role). */
export function useTeamMembers(): AboutTeamMember[] {
  const locale = useContentLocale();
  const content = useSection("/ve-chung-toi", "team");
  return useMemo(() => {
    const items = asArray<TeamItemDto>(content.items);
    const members: AboutTeamMember[] = [];
    items.forEach((item, i) => {
      const fallback = aboutTeamMembers[i];
      const image = sectionImageUrl(item as Record<string, unknown>, "image") ?? fallback?.image;
      const name = text(item.title, fallback?.name ?? "");
      if (!image || !name) return;
      members.push({
        id: text(item.id, fallback?.id ?? `team-${i}`),
        name,
        role: localized(locale, item.description, fallback?.role ?? { en: "", vi: "" }),
        image,
      });
    });
    return members.length > 0 ? members : aboutTeamMembers;
  }, [content, locale]);
}
