export interface PasswordRule {
  id: string;
  label: string;
  ok: boolean;
}

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export function checkPassword(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `Từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`,
      ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    { id: "lower", label: "Có chữ thường (a-z)", ok: /[a-z]/.test(password) },
    { id: "upper", label: "Có chữ hoa (A-Z)", ok: /[A-Z]/.test(password) },
    { id: "digit", label: "Có chữ số (0-9)", ok: /\d/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPassword(password).every((rule) => rule.ok);
}
