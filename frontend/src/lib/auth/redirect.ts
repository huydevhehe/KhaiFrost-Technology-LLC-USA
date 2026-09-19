/** Accepts only same-origin absolute paths ("/x"); rejects "//host", backslash tricks and full URLs. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.charAt(0) !== "/") return null;
  if (value.charAt(1) === "/" || value.charAt(1) === "\\") return null;
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 32) return null;
  }
  return value;
}

export function loginUrl(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

export const CHANGE_PASSWORD_REQUIRED_PATH = "/tai-khoan/doi-mat-khau?bat-buoc=1";

/** Set while the user is signing out on purpose so guards do not bounce them to /login. */
export const signOutIntent = { active: false };
