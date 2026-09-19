export enum SettingGroup {
  COMPANY = 'company',
  BRANDING = 'branding',
  SOCIAL = 'social',
  CONTACT = 'contact',
  LOCALIZATION = 'localization',
  SEO_DEFAULTS = 'seo-defaults',
}

// Keys used in the public payload (camelCase so the frontend can destructure them)
export const PUBLIC_GROUP_KEYS: Record<SettingGroup, string> = {
  [SettingGroup.COMPANY]: 'company',
  [SettingGroup.BRANDING]: 'branding',
  [SettingGroup.SOCIAL]: 'social',
  [SettingGroup.CONTACT]: 'contact',
  [SettingGroup.LOCALIZATION]: 'localization',
  [SettingGroup.SEO_DEFAULTS]: 'seoDefaults',
};
