"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loginUrl, signOutIntent } from "./redirect";
import { useAuth } from "./AuthProvider";

/**
 * Redirects anonymous visitors to /login?next=<current path>.
 * Returns the auth context so pages can render a skeleton while `loading`
 * and only render content when `user` is set.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status !== "anonymous" || signOutIntent.active) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(loginUrl(`${pathname}${search}`));
  }, [auth.status, pathname, router]);

  return auth;
}
