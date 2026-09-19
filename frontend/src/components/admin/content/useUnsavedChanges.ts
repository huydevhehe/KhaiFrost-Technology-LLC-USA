"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/shared";

/** Warns before a browser reload/close while the form has unsaved changes. */
export function useUnsavedChanges(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export interface LeaveGuard {
  /** Navigates after confirming when there are unsaved changes. */
  leave: (href: string) => Promise<void>;
  /** Runs `action` after confirming when there are unsaved changes. */
  confirmDiscard: () => Promise<boolean>;
}

/**
 * In-app guard for the editors: the browser guard is installed too, and any
 * in-app navigation goes through `leave()`.
 */
export function useLeaveGuard(dirty: boolean): LeaveGuard {
  const router = useRouter();
  const confirm = useConfirm();
  useUnsavedChanges(dirty);

  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    return confirm({
      title: "Rời khỏi trang khi chưa lưu?",
      message: "Các thay đổi chưa lưu sẽ bị mất.",
      confirmLabel: "Rời đi",
      cancelLabel: "Ở lại",
      danger: true,
    });
  }, [dirty, confirm]);

  const leave = useCallback(
    async (href: string) => {
      if (!(await confirmDiscard())) return;
      router.push(href);
    },
    [confirmDiscard, router],
  );

  return { leave, confirmDiscard };
}
