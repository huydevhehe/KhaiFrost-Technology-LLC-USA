export interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(
  values: ContactFormValues
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Vui lòng nhập tên của bạn";
  }

  if (!values.email.trim()) {
    errors.email = "Vui lòng nhập email";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Email không hợp lệ";
  }

  if (!values.message.trim()) {
    errors.message = "Vui lòng nhập nội dung";
  }

  return errors;
}
