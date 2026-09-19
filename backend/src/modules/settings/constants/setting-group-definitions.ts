import { Type } from '@nestjs/common';
import { Locale } from '../../../common/enums/locale.enum';
import { ValidationErrorDetail } from '../../../common/exceptions/exception.factories';
import { BrandingSettingsDto } from '../dto/groups/branding-settings.dto';
import { CompanySettingsDto } from '../dto/groups/company-settings.dto';
import { ContactSettingsDto } from '../dto/groups/contact-settings.dto';
import { LocalizationSettingsDto } from '../dto/groups/localization-settings.dto';
import { SeoDefaultsSettingsDto } from '../dto/groups/seo-defaults-settings.dto';
import { SocialSettingsDto } from '../dto/groups/social-settings.dto';
import { MediaFieldSpec } from '../utils/setting-media-paths';
import { SettingGroup } from './setting-group';

export interface SettingGroupDefinition {
  group: SettingGroup;
  dto: Type<object>;
  // Used when the group has never been saved, so a fresh database still works
  defaultValue: () => Record<string, unknown>;
  defaultIsPublic: boolean;
  mediaFields: readonly MediaFieldSpec[];
  // Cross-field rules the DTO decorators cannot express
  refine?: (value: Record<string, unknown>) => ValidationErrorDetail[];
}

function refineLocalization(value: Record<string, unknown>): ValidationErrorDetail[] {
  const enabled = value.enabledLocales as Locale[];
  if (!enabled.includes(value.defaultLocale as Locale)) {
    return [
      { field: 'enabledLocales', messages: ['enabledLocales must include the default locale'] },
    ];
  }
  return [];
}

function refineContact(value: Record<string, unknown>): ValidationErrorDetail[] {
  const offices = (value.offices ?? []) as { id: string }[];
  const ids = offices.map((office) => office.id);
  if (new Set(ids).size !== ids.length) {
    return [{ field: 'offices', messages: ['Office ids must be unique'] }];
  }
  return [];
}

export const SETTING_GROUP_DEFINITIONS: Record<SettingGroup, SettingGroupDefinition> = {
  [SettingGroup.COMPANY]: {
    group: SettingGroup.COMPANY,
    dto: CompanySettingsDto,
    defaultValue: () => ({
      companyName: 'KhaiFrost Technology LLC',
      email: 'contact@khaifrost.com',
      phone: '+1 (713) 555-0100',
      address: {
        vi: '1200 West Loop S #1000, Houston, TX, 77027',
        en: '1200 West Loop S #1000, Houston, TX, 77027',
      },
      website: 'https://khaifrost.vn',
    }),
    defaultIsPublic: true,
    mediaFields: [],
  },
  [SettingGroup.BRANDING]: {
    group: SettingGroup.BRANDING,
    dto: BrandingSettingsDto,
    defaultValue: () => ({
      logoId: null,
      logoDarkId: null,
      faviconId: null,
      brandColor: '#0B1120',
    }),
    defaultIsPublic: true,
    mediaFields: [
      { path: 'logoId', outputKey: 'logo' },
      { path: 'logoDarkId', outputKey: 'logoDark' },
      { path: 'faviconId', outputKey: 'favicon' },
    ],
  },
  [SettingGroup.SOCIAL]: {
    group: SettingGroup.SOCIAL,
    dto: SocialSettingsDto,
    defaultValue: () => ({ links: [] }),
    defaultIsPublic: true,
    mediaFields: [],
  },
  [SettingGroup.CONTACT]: {
    group: SettingGroup.CONTACT,
    dto: ContactSettingsDto,
    defaultValue: () => ({ channels: [], offices: [] }),
    defaultIsPublic: true,
    mediaFields: [{ path: 'offices[].imageId', outputKey: 'image' }],
    refine: refineContact,
  },
  [SettingGroup.LOCALIZATION]: {
    group: SettingGroup.LOCALIZATION,
    dto: LocalizationSettingsDto,
    defaultValue: () => ({ defaultLocale: Locale.VI, enabledLocales: [Locale.VI, Locale.EN] }),
    defaultIsPublic: true,
    mediaFields: [],
    refine: refineLocalization,
  },
  [SettingGroup.SEO_DEFAULTS]: {
    group: SettingGroup.SEO_DEFAULTS,
    dto: SeoDefaultsSettingsDto,
    defaultValue: () => ({
      siteName: 'KhaiFrost Technology',
      titleTemplate: '%s | KhaiFrost Technology LLC',
      defaultOgImageId: null,
    }),
    defaultIsPublic: true,
    mediaFields: [{ path: 'defaultOgImageId', outputKey: 'defaultOgImage' }],
  },
};
