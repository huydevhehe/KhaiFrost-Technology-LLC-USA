import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Locale } from '../../../common/enums/locale.enum';
import { ResourceBundle, unflattenResourceBundle } from '../utils/resource-bundle';
import { UiTranslationsService } from './ui-translations.service';

export interface RenderedBundle {
  body: ResourceBundle;
  etag: string;
}

@Injectable()
export class UiTranslationBundleService {
  constructor(private readonly translations: UiTranslationsService) {}

  // { namespace: { nested: { keys } } } for i18next `resources[locale]`; empty texts are omitted so fallbackLng applies
  async buildLocaleBundle(locale: Locale): Promise<RenderedBundle> {
    const rows = await this.translations.loadAllForBundle();
    const flatByNamespace = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const value = locale === Locale.VI ? row.valueVi : row.valueEn;
      if (value === null || value.trim() === '') continue;
      const flat = flatByNamespace.get(row.namespace) ?? {};
      flat[row.key] = value;
      flatByNamespace.set(row.namespace, flat);
    }
    const body: ResourceBundle = {};
    for (const [namespace, flat] of flatByNamespace)
      body[namespace] = unflattenResourceBundle(flat);
    return { body, etag: this.computeEtag(body) };
  }

  // One namespace, nested, for loaders such as i18next-http-backend (loadPath "/{{lng}}/{{ns}}")
  async buildNamespaceBundle(locale: Locale, namespace: string): Promise<RenderedBundle> {
    const rows = await this.translations.loadAllForBundle(namespace);
    const flat: Record<string, string> = {};
    for (const row of rows) {
      const value = locale === Locale.VI ? row.valueVi : row.valueEn;
      if (value !== null && value.trim() !== '') flat[row.key] = value;
    }
    const body = unflattenResourceBundle(flat);
    return { body, etag: this.computeEtag(body) };
  }

  private computeEtag(body: ResourceBundle): string {
    return `"${createHash('sha1').update(JSON.stringify(body)).digest('base64url')}"`;
  }
}
