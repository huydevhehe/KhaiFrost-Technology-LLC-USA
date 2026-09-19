"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { CHANGE_PASSWORD_REQUIRED_PATH, safeNextPath } from "./redirect";

/**
 * For guest-only pages (login, register, forgot password): once a user is signed in,
 * send them to ?next= (same-origin path only), the forced password change, or /tai-khoan.
 */
export function useRedirectWhenAuthenticated(): void {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.mustChangePassword) {
      router.replace(CHANGE_PASSWORD_REQUIRED_PATH);
      return;
    }
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    router.replace(next ?? "/tai-khoan");
  }, [status, user, router]);
}
