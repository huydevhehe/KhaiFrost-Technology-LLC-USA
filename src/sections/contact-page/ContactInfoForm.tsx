"use client";

import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "@/content/siteConfig";
import { useLocalizedField } from "@/lib/useLocalizedField";
import {
  validateContactForm,
  ContactFormValues,
  ContactFormErrors,
} from "@/lib/validateContactForm";
import { Button } from "@/components/ui/Button";
import { SocialIcons } from "@/components/ui/SocialIcons";
import { OfficeLocation } from "@/types";

const fieldClassName =
  "w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/50";

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

function OfficeRow({ office }: { office: OfficeLocation }) {
  const label = useLocalizedField(office.label);
  const addressLine = office.state
    ? `${office.street}, ${office.city}, ${office.state} ${office.zip}`
    : `${office.street}, ${office.city}`;

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
        <MapPin size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-sm text-white/60">
          {addressLine}, {office.country}
        </p>
      </div>
    </div>
  );
}

export function ContactInfoForm() {
  const { t } = useTranslation();
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(false);
    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setSubmitted(true);
      setValues(initialValues);
    }
  }

  const nameErrorText = errors.name
    ? t("contact.form.errors.nameRequired")
    : undefined;
  const emailErrorText =
    errors.email === "required"
      ? t("contact.form.errors.emailRequired")
      : errors.email === "invalid"
      ? t("contact.form.errors.emailInvalid")
      : undefined;
  const messageErrorText = errors.message
    ? t("contact.form.errors.messageRequired")
    : undefined;

  return (
    <section className="bg-navy py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("contactPage.info.eyebrow")}
          </p>
          <h2 className="text-3xl font-bold">{t("contactPage.info.heading")}</h2>
          <p className="mt-4 text-white/70">{t("contactPage.info.paragraph")}</p>

          <div className="mt-6 space-y-3 text-sm text-white/80">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">
                <Mail size={16} />
              </span>
              <div>
                <p className="text-xs text-white/50">
                  {t("contactPage.info.emailLabel")}
                </p>
                <a href={`mailto:${siteConfig.email}`} className="hover:text-accent">
                  {siteConfig.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">
                <Phone size={16} />
              </span>
              <div>
                <p className="text-xs text-white/50">
                  {t("contactPage.info.phoneLabel")}
                </p>
                <a href={`tel:${siteConfig.phone}`} className="hover:text-accent">
                  {siteConfig.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("contactPage.info.officesLabel")}
            </p>
            <div className="space-y-4">
              {siteConfig.offices.map((office) => (
                <OfficeRow key={office.id} office={office} />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SocialIcons />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white/5 p-6 backdrop-blur"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-page-name" className="sr-only">
                {t("contact.form.nameLabel")}
              </label>
              <input
                id="contact-page-name"
                type="text"
                placeholder={t("contact.form.namePlaceholder")}
                value={values.name}
                onChange={(e) =>
                  setValues({ ...values, name: e.target.value })
                }
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "contact-page-name-error" : undefined
                }
                className={fieldClassName}
              />
              {nameErrorText && (
                <p
                  id="contact-page-name-error"
                  className="mt-1 text-xs text-red-400"
                >
                  {nameErrorText}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="contact-page-email" className="sr-only">
                {t("contact.form.emailLabel")}
              </label>
              <input
                id="contact-page-email"
                type="email"
                placeholder={t("contact.form.emailPlaceholder")}
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "contact-page-email-error" : undefined
                }
                className={fieldClassName}
              />
              {emailErrorText && (
                <p
                  id="contact-page-email-error"
                  className="mt-1 text-xs text-red-400"
                >
                  {emailErrorText}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="contact-page-subject" className="sr-only">
              {t("contact.form.subjectLabel")}
            </label>
            <select
              id="contact-page-subject"
              value={values.subject}
              onChange={(e) =>
                setValues({ ...values, subject: e.target.value })
              }
              className={`${fieldClassName} [&>option]:text-slate-900`}
            >
              <option value="">{t("contact.form.subjectPlaceholder")}</option>
              <option value="source-code">
                {t("contact.form.subjectOptionSourceCode")}
              </option>
              <option value="services">
                {t("contact.form.subjectOptionServices")}
              </option>
              <option value="partnership">
                {t("contact.form.subjectOptionPartnership")}
              </option>
              <option value="other">
                {t("contact.form.subjectOptionOther")}
              </option>
            </select>
          </div>
          <div>
            <label htmlFor="contact-page-message" className="sr-only">
              {t("contact.form.messageLabel")}
            </label>
            <textarea
              id="contact-page-message"
              placeholder={t("contact.form.messagePlaceholder")}
              rows={4}
              value={values.message}
              onChange={(e) =>
                setValues({ ...values, message: e.target.value })
              }
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? "contact-page-message-error" : undefined
              }
              className={fieldClassName}
            />
            {messageErrorText && (
              <p
                id="contact-page-message-error"
                className="mt-1 text-xs text-red-400"
              >
                {messageErrorText}
              </p>
            )}
          </div>
          <Button type="submit" variant="primary-blue">
            {t("contact.form.submit")}
          </Button>
          {submitted && (
            <p className="text-sm text-accent">
              {t("contact.form.successMessage")}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
