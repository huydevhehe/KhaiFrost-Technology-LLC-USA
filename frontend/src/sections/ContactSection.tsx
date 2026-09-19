"use client";

import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSectionText } from "@/lib/content/pages";
import { useContactSubmit } from "@/lib/content/contact";
import { useSiteConfig } from "@/lib/content/site";
import {
  validateContactForm,
  ContactFormValues,
  ContactFormErrors,
} from "@/lib/validateContactForm";
import { Button } from "@/components/ui/Button";

const fieldClassName =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactSection() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const section = useSectionText("/", "contact");
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const { status, submit, reset } = useContactSubmit();

  const SUBJECT_KEYS: Record<string, string> = {
    "source-code": "contact.form.subjectOptionSourceCode",
    services: "contact.form.subjectOptionServices",
    partnership: "contact.form.subjectOptionPartnership",
    other: "contact.form.subjectOptionOther",
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    reset();
    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const subjectKey = SUBJECT_KEYS[values.subject];
    const ok = await submit(values, subjectKey ? t(subjectKey) : "", honeypot);
    if (ok) setValues(initialValues);
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
    <section className="border-t border-slate-100 bg-white py-16 text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            {section("eyebrow", t("contact.eyebrow"))}
          </p>
          <h2 className="text-3xl font-bold text-slate-900">{section("heading", t("contact.heading"))}</h2>
          <p className="mt-4 text-slate-500">{section("description", t("contact.subtext"))}</p>
          <div className="mt-6 space-y-2 text-sm text-slate-600">
            <p>{siteConfig.email}</p>
            <p>{siteConfig.phone}</p>
            <p>{siteConfig.address}</p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-6"
        >
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="sr-only">
                {t("contact.form.nameLabel")}
              </label>
              <input
                id="contact-name"
                type="text"
                placeholder={t("contact.form.namePlaceholder")}
                value={values.name}
                onChange={(e) =>
                  setValues({ ...values, name: e.target.value })
                }
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "contact-name-error" : undefined}
                className={fieldClassName}
              />
              {nameErrorText && (
                <p
                  id="contact-name-error"
                  className="mt-1 text-xs text-red-500"
                >
                  {nameErrorText}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="contact-email" className="sr-only">
                {t("contact.form.emailLabel")}
              </label>
              <input
                id="contact-email"
                type="email"
                placeholder={t("contact.form.emailPlaceholder")}
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "contact-email-error" : undefined
                }
                className={fieldClassName}
              />
              {emailErrorText && (
                <p
                  id="contact-email-error"
                  className="mt-1 text-xs text-red-500"
                >
                  {emailErrorText}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="contact-subject" className="sr-only">
              {t("contact.form.subjectLabel")}
            </label>
            <select
              id="contact-subject"
              value={values.subject}
              onChange={(e) =>
                setValues({ ...values, subject: e.target.value })
              }
              className={fieldClassName}
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
            <label htmlFor="contact-message" className="sr-only">
              {t("contact.form.messageLabel")}
            </label>
            <textarea
              id="contact-message"
              placeholder={t("contact.form.messagePlaceholder")}
              rows={4}
              value={values.message}
              onChange={(e) =>
                setValues({ ...values, message: e.target.value })
              }
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? "contact-message-error" : undefined
              }
              className={fieldClassName}
            />
            {messageErrorText && (
              <p
                id="contact-message-error"
                className="mt-1 text-xs text-red-500"
              >
                {messageErrorText}
              </p>
            )}
          </div>
          <Button type="submit" variant="primary-blue" disabled={status === "sending"}>
            {status === "sending" ? t("contact.form.sending") : t("contact.form.submit")}
          </Button>
          {status === "success" && (
            <p className="text-sm text-accent" role="status">
              {t("contact.form.successMessage")}
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-500" role="alert">
              {t("contact.form.errors.sendFailed")}
            </p>
          )}
          {status === "rateLimited" && (
            <p className="text-sm text-red-500" role="alert">
              {t("contact.form.errors.rateLimited")}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
