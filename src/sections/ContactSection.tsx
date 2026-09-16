"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/content/siteConfig";
import {
  validateContactForm,
  ContactFormValues,
  ContactFormErrors,
} from "@/lib/validateContactForm";
import { Button } from "@/components/ui/Button";

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactSection() {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setSubmitted(true);
      setValues(initialValues);
    }
  }

  return (
    <section className="bg-navy py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            Get In Touch
          </p>
          <h2 className="text-3xl font-bold">Let&apos;s Build Something Great</h2>
          <p className="mt-4 text-white/70">
            Have a project in mind? We&apos;d love to hear from you. Send us a
            message and we&apos;ll get back to you soon.
          </p>
          <div className="mt-6 space-y-2 text-sm text-white/80">
            <p>{siteConfig.email}</p>
            <p>{siteConfig.phone}</p>
            <p>{siteConfig.address}</p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white/5 p-6 backdrop-blur"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <input
                type="text"
                placeholder="Your name *"
                value={values.name}
                onChange={(e) =>
                  setValues({ ...values, name: e.target.value })
                }
                className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-white/50"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
              )}
            </div>
            <div>
              <input
                type="email"
                placeholder="Your email *"
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
                className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-white/50"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Subject"
            value={values.subject}
            onChange={(e) =>
              setValues({ ...values, subject: e.target.value })
            }
            className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-white/50"
          />
          <div>
            <textarea
              placeholder="Message *"
              rows={4}
              value={values.message}
              onChange={(e) =>
                setValues({ ...values, message: e.target.value })
              }
              className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-white/50"
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-400">{errors.message}</p>
            )}
          </div>
          <Button type="submit" variant="primary-blue">
            Send Message →
          </Button>
          {submitted && (
            <p className="text-sm text-accent">
              Đã gửi! Cảm ơn bạn đã liên hệ.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
