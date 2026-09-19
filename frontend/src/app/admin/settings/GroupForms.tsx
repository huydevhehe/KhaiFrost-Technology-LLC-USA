"use client";

import { Plus, X } from "lucide-react";
import { LOCALES, LOCALE_LABELS, MediaPicker, type Locale, type MediaSelection } from "@/components/admin/shared";
import { ActionButton } from "@/components/admin/content";
import { Field, Input, Select, Textarea } from "@/components/admin/ui";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_CHANNEL_TYPES,
  SETTING_LIMITS,
  type BrandingSettings,
  type CompanySettings,
  type ContactChannelType,
  type ContactSettings,
  type LocalizationSettings,
  type LocalizedText,
  type SeoDefaultsSettings,
  type SocialSettings,
} from "@/lib/api/admin/settings";
import { GroupEditor } from "./GroupEditor";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function newKey(): string {
  return crypto.randomUUID();
}

function media(
  id: string | null | undefined,
  urls: Record<string, string>,
  name: string,
): MediaSelection | null {
  const url = id ? urls[id] : undefined;
  return id && url ? { id, url, thumbnailUrl: url, name } : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/** Optional localized text: both languages or none. Returns undefined when both are empty. */
function optionalLocalized(vi: string, en: string): LocalizedText | undefined {
  return vi.trim() || en.trim() ? { vi: vi.trim(), en: en.trim() } : undefined;
}

function halfFilled(vi: string, en: string): boolean {
  return Boolean(vi.trim()) !== Boolean(en.trim());
}

const REMOVE_BUTTON =
  "rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40";

function LocalizedInputs({
  idPrefix,
  label,
  vi,
  en,
  onChange,
  required = false,
  multiline = false,
  max = SETTING_LIMITS.localizedTextMax,
  hint,
}: {
  idPrefix: string;
  label: string;
  vi: string;
  en: string;
  onChange: (locale: Locale, value: string) => void;
  required?: boolean;
  multiline?: boolean;
  max?: number;
  hint?: string;
}) {
  const values: Record<Locale, string> = { vi, en };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {LOCALES.map((locale, index) => (
        <Field
          key={locale}
          label={`${label} (${LOCALE_LABELS[locale]})`}
          htmlFor={`${idPrefix}-${locale}`}
          required={required}
          hint={index === 0 ? hint : undefined}
        >
          {multiline ? (
            <Textarea
              id={`${idPrefix}-${locale}`}
              rows={3}
              maxLength={max}
              value={values[locale]}
              onChange={(event) => onChange(locale, event.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-${locale}`}
              maxLength={max}
              value={values[locale]}
              onChange={(event) => onChange(locale, event.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

interface CompanyForm {
  companyName: string;
  email: string;
  phone: string;
  addressVi: string;
  addressEn: string;
  website: string;
}

export function CompanyGroup() {
  return (
    <GroupEditor<CompanySettings, CompanyForm>
      group="company"
      title="Thông tin công ty"
      description="Hiển thị ở chân trang, trang liên hệ và email gửi đi."
      toForm={(value) => ({
        companyName: value.companyName ?? "",
        email: value.email ?? "",
        phone: value.phone ?? "",
        addressVi: value.address?.vi ?? "",
        addressEn: value.address?.en ?? "",
        website: value.website ?? "",
      })}
      toValue={(form) => ({
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: { vi: form.addressVi.trim(), en: form.addressEn.trim() },
        website: form.website.trim(),
      })}
      validate={(form) => {
        if (!form.companyName.trim()) return "Vui lòng nhập tên công ty.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Email chưa hợp lệ.";
        if (!/^[0-9+()\-.\s]{5,30}$/.test(form.phone.trim())) return "Số điện thoại chưa hợp lệ.";
        if (!form.addressVi.trim() || !form.addressEn.trim()) {
          return "Vui lòng nhập địa chỉ bằng cả tiếng Việt và tiếng Anh.";
        }
        if (!isHttpUrl(form.website)) return "Website phải bắt đầu bằng http:// hoặc https://.";
        return null;
      }}
    >
      {({ form, setForm }) => (
        <>
          <Field label="Tên công ty" htmlFor="company-name" required>
            <Input
              id="company-name"
              value={form.companyName}
              maxLength={SETTING_LIMITS.companyNameMax}
              onChange={(event) => setForm({ companyName: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="company-email" required>
              <Input
                id="company-email"
                type="email"
                value={form.email}
                maxLength={SETTING_LIMITS.emailMax}
                onChange={(event) => setForm({ email: event.target.value })}
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="company-phone" required>
              <Input
                id="company-phone"
                value={form.phone}
                maxLength={SETTING_LIMITS.phoneMax}
                onChange={(event) => setForm({ phone: event.target.value })}
              />
            </Field>
          </div>
          <LocalizedInputs
            idPrefix="company-address"
            label="Địa chỉ"
            required
            vi={form.addressVi}
            en={form.addressEn}
            onChange={(locale, value) =>
              setForm(locale === "vi" ? { addressVi: value } : { addressEn: value })
            }
          />
          <Field label="Website" htmlFor="company-website" required hint="Bắt đầu bằng https://">
            <Input
              id="company-website"
              type="url"
              value={form.website}
              maxLength={SETTING_LIMITS.websiteMax}
              onChange={(event) => setForm({ website: event.target.value })}
            />
          </Field>
        </>
      )}
    </GroupEditor>
  );
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

interface BrandingForm {
  logo: MediaSelection | null;
  logoDark: MediaSelection | null;
  favicon: MediaSelection | null;
  brandColor: string;
}

export function BrandingGroup() {
  return (
    <GroupEditor<BrandingSettings, BrandingForm>
      group="branding"
      title="Thương hiệu"
      description="Logo, favicon và màu thương hiệu của website."
      toForm={(value, response) => ({
        logo: media(value.logoId, response.mediaUrls, "Logo"),
        logoDark: media(value.logoDarkId, response.mediaUrls, "Logo nền tối"),
        favicon: media(value.faviconId, response.mediaUrls, "Favicon"),
        brandColor: value.brandColor ?? "",
      })}
      toValue={(form) => ({
        logoId: form.logo?.id ?? null,
        logoDarkId: form.logoDark?.id ?? null,
        faviconId: form.favicon?.id ?? null,
        brandColor: form.brandColor.trim() || null,
      })}
      validate={(form) =>
        form.brandColor.trim() && !/^#[0-9a-fA-F]{6}$/.test(form.brandColor.trim())
          ? "Màu thương hiệu phải có dạng #RRGGBB, ví dụ #0ea5e9."
          : null
      }
    >
      {({ form, setForm, readOnly }) => (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MediaPicker
              label="Logo"
              value={form.logo}
              onChange={(logo) => setForm({ logo })}
              disabled={readOnly}
              folder="thuong-hieu"
            />
            <MediaPicker
              label="Logo cho nền tối"
              value={form.logoDark}
              onChange={(logoDark) => setForm({ logoDark })}
              disabled={readOnly}
              folder="thuong-hieu"
            />
            <MediaPicker
              label="Favicon"
              value={form.favicon}
              onChange={(favicon) => setForm({ favicon })}
              disabled={readOnly}
              folder="thuong-hieu"
            />
          </div>
          <Field label="Màu thương hiệu" htmlFor="brand-color" hint="Định dạng #RRGGBB. Để trống để dùng màu mặc định.">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Chọn màu thương hiệu"
                value={/^#[0-9a-fA-F]{6}$/.test(form.brandColor) ? form.brandColor : "#000000"}
                onChange={(event) => setForm({ brandColor: event.target.value })}
                className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <Input
                id="brand-color"
                className="max-w-40"
                value={form.brandColor}
                maxLength={7}
                placeholder="#0ea5e9"
                onChange={(event) => setForm({ brandColor: event.target.value })}
              />
            </div>
          </Field>
        </>
      )}
    </GroupEditor>
  );
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

interface SocialRow {
  key: string;
  network: string;
  url: string;
}

interface SocialForm {
  links: SocialRow[];
}

const NETWORK_SUGGESTIONS = ["facebook", "linkedin", "youtube", "x", "instagram", "tiktok", "github", "zalo"];

export function SocialGroup() {
  return (
    <GroupEditor<SocialSettings, SocialForm>
      group="social"
      title="Mạng xã hội"
      description="Các liên kết hiển thị ở chân trang."
      toForm={(value) => ({
        links: (value.links ?? []).map((link) => ({ key: newKey(), ...link })),
      })}
      toValue={(form) => ({
        links: form.links.map((link) => ({ network: link.network.trim(), url: link.url.trim() })),
      })}
      validate={(form) => {
        for (const [index, link] of form.links.entries()) {
          if (!/^[a-z0-9-]+$/.test(link.network.trim())) {
            return `Liên kết ${index + 1}: tên mạng chỉ gồm chữ thường, số và dấu gạch ngang.`;
          }
          if (!isHttpUrl(link.url)) return `Liên kết ${index + 1}: địa chỉ phải bắt đầu bằng http:// hoặc https://.`;
        }
        return null;
      }}
    >
      {({ form, setForm }) => {
        const patchRow = (key: string, patch: Partial<SocialRow>) =>
          setForm({ links: form.links.map((row) => (row.key === key ? { ...row, ...patch } : row)) });
        return (
          <>
            <datalist id="social-networks">
              {NETWORK_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {form.links.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có liên kết mạng xã hội nào.</p>
            )}
            {form.links.map((row, index) => (
              <div key={row.key} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[10rem_1fr_auto]">
                <Field label={`Mạng ${index + 1}`} htmlFor={`social-network-${row.key}`}>
                  <Input
                    id={`social-network-${row.key}`}
                    list="social-networks"
                    value={row.network}
                    maxLength={SETTING_LIMITS.networkMax}
                    onChange={(event) => patchRow(row.key, { network: event.target.value })}
                  />
                </Field>
                <Field label="Địa chỉ liên kết" htmlFor={`social-url-${row.key}`}>
                  <Input
                    id={`social-url-${row.key}`}
                    type="url"
                    placeholder="https://"
                    value={row.url}
                    maxLength={SETTING_LIMITS.urlMax}
                    onChange={(event) => patchRow(row.key, { url: event.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  aria-label="Xoá liên kết"
                  className={`${REMOVE_BUTTON} mb-1.5`}
                  onClick={() => setForm({ links: form.links.filter((item) => item.key !== row.key) })}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div>
              <ActionButton
                variant="secondary"
                icon={<Plus size={15} />}
                disabled={form.links.length >= SETTING_LIMITS.maxListSize}
                onClick={() =>
                  setForm({ links: [...form.links, { key: newKey(), network: "", url: "" }] })
                }
              >
                Thêm liên kết
              </ActionButton>
            </div>
          </>
        );
      }}
    </GroupEditor>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

interface ChannelRow {
  key: string;
  type: ContactChannelType;
  value: string;
  labelVi: string;
  labelEn: string;
}

interface OfficeRow {
  key: string;
  id: string;
  labelVi: string;
  labelEn: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
  mapX: string;
  mapY: string;
  image: MediaSelection | null;
}

interface ContactForm {
  channels: ChannelRow[];
  hoursVi: string;
  hoursEn: string;
  offices: OfficeRow[];
}

function emptyOffice(count: number): OfficeRow {
  return {
    key: newKey(),
    id: `van-phong-${count + 1}`,
    labelVi: "",
    labelEn: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    countryCode: "",
    mapX: "",
    mapY: "",
    image: null,
  };
}

export function ContactGroup() {
  return (
    <GroupEditor<ContactSettings, ContactForm>
      group="contact"
      title="Liên hệ"
      description="Kênh liên hệ, giờ làm việc và các văn phòng hiển thị trên trang liên hệ."
      toForm={(value, response) => ({
        channels: (value.channels ?? []).map((channel) => ({
          key: newKey(),
          type: channel.type,
          value: channel.value,
          labelVi: channel.label?.vi ?? "",
          labelEn: channel.label?.en ?? "",
        })),
        hoursVi: value.businessHours?.vi ?? "",
        hoursEn: value.businessHours?.en ?? "",
        offices: (value.offices ?? []).map((office) => ({
          key: newKey(),
          id: office.id,
          labelVi: office.label?.vi ?? "",
          labelEn: office.label?.en ?? "",
          street: office.street,
          city: office.city,
          state: office.state ?? "",
          zip: office.zip ?? "",
          country: office.country,
          countryCode: office.countryCode,
          mapX: office.mapX === null || office.mapX === undefined ? "" : String(office.mapX),
          mapY: office.mapY === null || office.mapY === undefined ? "" : String(office.mapY),
          image: media(office.imageId, response.mediaUrls, "Ảnh văn phòng"),
        })),
      })}
      toValue={(form) => {
        const hours = optionalLocalized(form.hoursVi, form.hoursEn);
        return {
          channels: form.channels.map((channel) => {
            const label = optionalLocalized(channel.labelVi, channel.labelEn);
            return {
              type: channel.type,
              value: channel.value.trim(),
              ...(label ? { label } : {}),
            };
          }),
          ...(hours ? { businessHours: hours } : {}),
          offices: form.offices.map((office) => ({
            id: office.id.trim(),
            label: { vi: office.labelVi.trim(), en: office.labelEn.trim() },
            street: office.street.trim(),
            city: office.city.trim(),
            state: office.state.trim() || null,
            zip: office.zip.trim() || null,
            country: office.country.trim(),
            countryCode: office.countryCode.trim().toUpperCase(),
            mapX: office.mapX.trim() === "" ? null : Number(office.mapX),
            mapY: office.mapY.trim() === "" ? null : Number(office.mapY),
            imageId: office.image?.id ?? null,
          })),
        };
      }}
      validate={(form) => {
        for (const [index, channel] of form.channels.entries()) {
          if (!channel.value.trim()) return `Kênh liên hệ ${index + 1}: vui lòng nhập giá trị.`;
          if (halfFilled(channel.labelVi, channel.labelEn)) {
            return `Kênh liên hệ ${index + 1}: nhãn cần đủ tiếng Việt và tiếng Anh, hoặc để trống cả hai.`;
          }
        }
        if (halfFilled(form.hoursVi, form.hoursEn)) {
          return "Giờ làm việc cần đủ tiếng Việt và tiếng Anh, hoặc để trống cả hai.";
        }
        const ids = new Set<string>();
        for (const [index, office] of form.offices.entries()) {
          const name = `Văn phòng ${index + 1}`;
          if (!/^[a-z0-9-]+$/.test(office.id.trim())) {
            return `${name}: mã chỉ gồm chữ thường, số và dấu gạch ngang.`;
          }
          if (ids.has(office.id.trim())) return `${name}: mã văn phòng bị trùng.`;
          ids.add(office.id.trim());
          if (!office.labelVi.trim() || !office.labelEn.trim()) {
            return `${name}: cần tên bằng cả tiếng Việt và tiếng Anh.`;
          }
          if (!office.street.trim() || !office.city.trim() || !office.country.trim()) {
            return `${name}: vui lòng nhập đường, thành phố và quốc gia.`;
          }
          if (!/^[A-Za-z]{2}$/.test(office.countryCode.trim())) {
            return `${name}: mã quốc gia gồm 2 chữ cái (ví dụ VN, US).`;
          }
          for (const coordinate of [office.mapX, office.mapY]) {
            const number = Number(coordinate);
            if (coordinate.trim() !== "" && !(Number.isFinite(number) && number >= 0 && number <= 100)) {
              return `${name}: vị trí trên bản đồ phải từ 0 đến 100.`;
            }
          }
        }
        return null;
      }}
    >
      {({ form, setForm, readOnly }) => {
        const patchChannel = (key: string, patch: Partial<ChannelRow>) =>
          setForm({
            channels: form.channels.map((row) => (row.key === key ? { ...row, ...patch } : row)),
          });
        const patchOffice = (key: string, patch: Partial<OfficeRow>) =>
          setForm({
            offices: form.offices.map((row) => (row.key === key ? { ...row, ...patch } : row)),
          });
        return (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Kênh liên hệ</h3>
              {form.channels.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có kênh liên hệ nào.</p>
              )}
              {form.channels.map((row, index) => (
                <div key={row.key} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">Kênh {index + 1}</span>
                    <button
                      type="button"
                      aria-label="Xoá kênh liên hệ"
                      disabled={readOnly}
                      className={REMOVE_BUTTON}
                      onClick={() =>
                        setForm({ channels: form.channels.filter((item) => item.key !== row.key) })
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Loại" htmlFor={`channel-type-${row.key}`}>
                      <Select
                        id={`channel-type-${row.key}`}
                        value={row.type}
                        onChange={(event) =>
                          patchChannel(row.key, { type: event.target.value as ContactChannelType })
                        }
                      >
                        {CONTACT_CHANNEL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {CONTACT_CHANNEL_LABELS[type]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Giá trị" htmlFor={`channel-value-${row.key}`} required>
                      <Input
                        id={`channel-value-${row.key}`}
                        value={row.value}
                        maxLength={SETTING_LIMITS.channelValueMax}
                        onChange={(event) => patchChannel(row.key, { value: event.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <LocalizedInputs
                      idPrefix={`channel-label-${row.key}`}
                      label="Nhãn hiển thị"
                      vi={row.labelVi}
                      en={row.labelEn}
                      onChange={(locale, value) =>
                        patchChannel(row.key, locale === "vi" ? { labelVi: value } : { labelEn: value })
                      }
                    />
                  </div>
                </div>
              ))}
              <div>
                <ActionButton
                  variant="secondary"
                  icon={<Plus size={15} />}
                  disabled={form.channels.length >= SETTING_LIMITS.maxListSize}
                  onClick={() =>
                    setForm({
                      channels: [
                        ...form.channels,
                        { key: newKey(), type: "email", value: "", labelVi: "", labelEn: "" },
                      ],
                    })
                  }
                >
                  Thêm kênh liên hệ
                </ActionButton>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Giờ làm việc</h3>
              <LocalizedInputs
                idPrefix="contact-hours"
                label="Giờ làm việc"
                vi={form.hoursVi}
                en={form.hoursEn}
                onChange={(locale, value) =>
                  setForm(locale === "vi" ? { hoursVi: value } : { hoursEn: value })
                }
                hint="Để trống cả hai nếu không hiển thị."
              />
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Văn phòng</h3>
              {form.offices.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có văn phòng nào.</p>
              )}
              {form.offices.map((row, index) => (
                <div key={row.key} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">Văn phòng {index + 1}</span>
                    <button
                      type="button"
                      aria-label="Xoá văn phòng"
                      disabled={readOnly}
                      className={REMOVE_BUTTON}
                      onClick={() =>
                        setForm({ offices: form.offices.filter((item) => item.key !== row.key) })
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <LocalizedInputs
                      idPrefix={`office-label-${row.key}`}
                      label="Tên văn phòng"
                      required
                      vi={row.labelVi}
                      en={row.labelEn}
                      onChange={(locale, value) =>
                        patchOffice(row.key, locale === "vi" ? { labelVi: value } : { labelEn: value })
                      }
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="Mã văn phòng"
                        htmlFor={`office-id-${row.key}`}
                        required
                        hint="Chữ thường, số, dấu gạch ngang."
                      >
                        <Input
                          id={`office-id-${row.key}`}
                          value={row.id}
                          maxLength={SETTING_LIMITS.officeIdMax}
                          onChange={(event) => patchOffice(row.key, { id: event.target.value })}
                        />
                      </Field>
                      <Field label="Đường / số nhà" htmlFor={`office-street-${row.key}`} required>
                        <Input
                          id={`office-street-${row.key}`}
                          value={row.street}
                          maxLength={SETTING_LIMITS.streetMax}
                          onChange={(event) => patchOffice(row.key, { street: event.target.value })}
                        />
                      </Field>
                      <Field label="Thành phố" htmlFor={`office-city-${row.key}`} required>
                        <Input
                          id={`office-city-${row.key}`}
                          value={row.city}
                          maxLength={SETTING_LIMITS.cityMax}
                          onChange={(event) => patchOffice(row.key, { city: event.target.value })}
                        />
                      </Field>
                      <Field label="Bang / tỉnh" htmlFor={`office-state-${row.key}`}>
                        <Input
                          id={`office-state-${row.key}`}
                          value={row.state}
                          maxLength={SETTING_LIMITS.stateMax}
                          onChange={(event) => patchOffice(row.key, { state: event.target.value })}
                        />
                      </Field>
                      <Field label="Mã bưu chính" htmlFor={`office-zip-${row.key}`}>
                        <Input
                          id={`office-zip-${row.key}`}
                          value={row.zip}
                          maxLength={SETTING_LIMITS.zipMax}
                          onChange={(event) => patchOffice(row.key, { zip: event.target.value })}
                        />
                      </Field>
                      <Field label="Quốc gia" htmlFor={`office-country-${row.key}`} required>
                        <Input
                          id={`office-country-${row.key}`}
                          value={row.country}
                          maxLength={SETTING_LIMITS.countryMax}
                          onChange={(event) => patchOffice(row.key, { country: event.target.value })}
                        />
                      </Field>
                      <Field
                        label="Mã quốc gia"
                        htmlFor={`office-code-${row.key}`}
                        required
                        hint="2 chữ cái, ví dụ VN, US."
                      >
                        <Input
                          id={`office-code-${row.key}`}
                          value={row.countryCode}
                          maxLength={2}
                          onChange={(event) =>
                            patchOffice(row.key, { countryCode: event.target.value.toUpperCase() })
                          }
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Bản đồ X (%)" htmlFor={`office-x-${row.key}`}>
                          <Input
                            id={`office-x-${row.key}`}
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={row.mapX}
                            onChange={(event) => patchOffice(row.key, { mapX: event.target.value })}
                          />
                        </Field>
                        <Field label="Bản đồ Y (%)" htmlFor={`office-y-${row.key}`}>
                          <Input
                            id={`office-y-${row.key}`}
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={row.mapY}
                            onChange={(event) => patchOffice(row.key, { mapY: event.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                    <MediaPicker
                      label="Ảnh văn phòng"
                      value={row.image}
                      onChange={(image) => patchOffice(row.key, { image })}
                      disabled={readOnly}
                      folder="lien-he"
                    />
                  </div>
                </div>
              ))}
              <div>
                <ActionButton
                  variant="secondary"
                  icon={<Plus size={15} />}
                  disabled={form.offices.length >= SETTING_LIMITS.maxListSize}
                  onClick={() => setForm({ offices: [...form.offices, emptyOffice(form.offices.length)] })}
                >
                  Thêm văn phòng
                </ActionButton>
              </div>
            </section>
          </>
        );
      }}
    </GroupEditor>
  );
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

export function LocalizationGroup() {
  return (
    <GroupEditor<LocalizationSettings, LocalizationSettings>
      group="localization"
      title="Ngôn ngữ"
      description="Ngôn ngữ mặc định và các ngôn ngữ mà website cung cấp."
      toForm={(value) => ({
        defaultLocale: value.defaultLocale,
        enabledLocales: [...value.enabledLocales],
      })}
      toValue={(form) => ({
        defaultLocale: form.defaultLocale,
        enabledLocales: LOCALES.filter((locale) => form.enabledLocales.includes(locale)),
      })}
      validate={(form) => {
        if (form.enabledLocales.length === 0) return "Cần bật ít nhất một ngôn ngữ.";
        if (!form.enabledLocales.includes(form.defaultLocale)) {
          return "Ngôn ngữ mặc định phải nằm trong các ngôn ngữ đang bật.";
        }
        return null;
      }}
    >
      {({ form, setForm }) => (
        <>
          <Field label="Ngôn ngữ mặc định" htmlFor="localization-default">
            <Select
              id="localization-default"
              value={form.defaultLocale}
              onChange={(event) => setForm({ defaultLocale: event.target.value as Locale })}
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {LOCALE_LABELS[locale]}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Ngôn ngữ đang bật</legend>
            {LOCALES.map((locale) => (
              <label key={locale} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.enabledLocales.includes(locale)}
                  onChange={(event) =>
                    setForm({
                      enabledLocales: event.target.checked
                        ? [...form.enabledLocales, locale]
                        : form.enabledLocales.filter((item) => item !== locale),
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                {LOCALE_LABELS[locale]}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </GroupEditor>
  );
}

// ---------------------------------------------------------------------------
// SEO defaults
// ---------------------------------------------------------------------------

interface SeoForm {
  siteName: string;
  titleTemplate: string;
  descriptionVi: string;
  descriptionEn: string;
  ogImage: MediaSelection | null;
  twitterHandle: string;
}

export function SeoDefaultsGroup() {
  return (
    <GroupEditor<SeoDefaultsSettings, SeoForm>
      group="seo-defaults"
      title="SEO mặc định"
      description="Giá trị dùng khi một trang chưa khai báo SEO riêng."
      toForm={(value, response) => ({
        siteName: value.siteName ?? "",
        titleTemplate: value.titleTemplate ?? "",
        descriptionVi: value.defaultDescription?.vi ?? "",
        descriptionEn: value.defaultDescription?.en ?? "",
        ogImage: media(value.defaultOgImageId, response.mediaUrls, "Ảnh chia sẻ mặc định"),
        twitterHandle: value.twitterHandle ?? "",
      })}
      toValue={(form) => {
        const description = optionalLocalized(form.descriptionVi, form.descriptionEn);
        return {
          siteName: form.siteName.trim(),
          titleTemplate: form.titleTemplate.trim(),
          ...(description ? { defaultDescription: description } : {}),
          defaultOgImageId: form.ogImage?.id ?? null,
          twitterHandle: form.twitterHandle.trim() || null,
        };
      }}
      validate={(form) => {
        if (!form.siteName.trim()) return "Vui lòng nhập tên website.";
        if (!form.titleTemplate.includes("%s")) {
          return "Mẫu tiêu đề phải chứa %s, nơi tiêu đề trang sẽ được chèn vào.";
        }
        if (halfFilled(form.descriptionVi, form.descriptionEn)) {
          return "Mô tả mặc định cần đủ tiếng Việt và tiếng Anh, hoặc để trống cả hai.";
        }
        if (form.twitterHandle.trim() && !/^@?[A-Za-z0-9_]{1,15}$/.test(form.twitterHandle.trim())) {
          return "Tài khoản X (Twitter) chưa hợp lệ.";
        }
        return null;
      }}
    >
      {({ form, setForm, readOnly }) => (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tên website" htmlFor="seo-site-name" required>
              <Input
                id="seo-site-name"
                value={form.siteName}
                maxLength={SETTING_LIMITS.siteNameMax}
                onChange={(event) => setForm({ siteName: event.target.value })}
              />
            </Field>
            <Field
              label="Mẫu tiêu đề"
              htmlFor="seo-title-template"
              required
              hint="Dùng %s cho tiêu đề trang, ví dụ %s | KhaiFrost."
            >
              <Input
                id="seo-title-template"
                value={form.titleTemplate}
                maxLength={SETTING_LIMITS.titleTemplateMax}
                onChange={(event) => setForm({ titleTemplate: event.target.value })}
              />
            </Field>
          </div>
          <LocalizedInputs
            idPrefix="seo-description"
            label="Mô tả mặc định"
            multiline
            vi={form.descriptionVi}
            en={form.descriptionEn}
            onChange={(locale, value) =>
              setForm(locale === "vi" ? { descriptionVi: value } : { descriptionEn: value })
            }
            hint="Để trống cả hai nếu không dùng."
          />
          <Field label="Tài khoản X (Twitter)" htmlFor="seo-twitter" hint="Ví dụ @khaifrost">
            <Input
              id="seo-twitter"
              className="max-w-xs"
              value={form.twitterHandle}
              maxLength={16}
              onChange={(event) => setForm({ twitterHandle: event.target.value })}
            />
          </Field>
          <MediaPicker
            label="Ảnh chia sẻ mặc định"
            value={form.ogImage}
            onChange={(ogImage) => setForm({ ogImage })}
            disabled={readOnly}
            folder="seo"
          />
        </>
      )}
    </GroupEditor>
  );
}
