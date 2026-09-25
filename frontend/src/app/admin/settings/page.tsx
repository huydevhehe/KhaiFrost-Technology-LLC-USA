"use client";

import { useState, type ComponentType } from "react";
import { InfoNotice } from "@/components/admin/content";
import { TableSkeleton } from "@/components/admin/shared";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { SETTING_GROUP_LABELS, type SettingGroup } from "@/lib/api/admin/settings";
import { LocalizationGroup, SeoDefaultsGroup } from "./GroupForms";

// Company, Branding, Social and Contact moved to Admin → Header & Footer,
// since they're only used to render the site's header/footer chrome.
const VISIBLE_SETTINGS_GROUPS = ["seo-defaults", "localization"] as const satisfies readonly SettingGroup[];

const GROUP_COMPONENTS: Partial<Record<SettingGroup, ComponentType>> = {
  localization: LocalizationGroup,
  "seo-defaults": SeoDefaultsGroup,
};

export default function AdminSettingsPage() {
  const { hasPermission, loading } = useAuth();
  const [active, setActive] = useState<SettingGroup>(VISIBLE_SETTINGS_GROUPS[0]);

  if (loading) return <TableSkeleton rows={5} columns={2} />;
  if (!hasPermission(PERMISSIONS.SETTING_READ)) {
    return <InfoNotice>Bạn không có quyền xem cài đặt chung.</InfoNotice>;
  }

  const ActiveGroup = GROUP_COMPONENTS[active] ?? LocalizationGroup;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Cài đặt chung</h1>

      <div role="tablist" aria-label="Nhóm cài đặt" className="flex flex-wrap gap-1 border-b border-slate-200">
        {VISIBLE_SETTINGS_GROUPS.map((group) => {
          const selected = group === active;
          return (
            <button
              key={group}
              type="button"
              role="tab"
              id={`settings-tab-${group}`}
              aria-selected={selected}
              aria-controls="settings-panel"
              onClick={() => setActive(group)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {SETTING_GROUP_LABELS[group]}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="settings-panel" aria-labelledby={`settings-tab-${active}`}>
        <ActiveGroup key={active} />
      </div>
    </div>
  );
}
