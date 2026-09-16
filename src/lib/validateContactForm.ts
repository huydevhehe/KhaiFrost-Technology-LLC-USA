export interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: "required";
  email?: "required" | "invalid";
  message?: "required";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(
  values: ContactFormValues
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "required";
  }

  if (!values.email.trim()) {
    errors.email = "required";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "invalid";
  }

  if (!values.message.trim()) {
    errors.message = "required";
  }

  return errors;
}
