"use client";

import { useState } from "react";
import { useApiAction, useApiResource } from "@/components/admin/shared";
import { isApiError } from "@/lib/api/client";
import { getFieldErrors } from "@/lib/api/errorMessages";
import { settingsApi, type SettingGroup, type SettingResponse } from "@/lib/api/admin/settings";

export interface SettingGroupState<T> {
  data: SettingResponse<T> | null;
  loading: boolean;
  error: unknown;
  /** True after a 409 VERSION_CONFLICT; the user must reload. */
  conflict: boolean;
  pending: boolean;
  /** Per-field messages from VALIDATION_FAILED. */
  serverErrors: Record<string, string>;
  save: (value: T) => Promise<SettingResponse<T> | undefined>;
  reload: () => void;
}

/** Load + save one settings group with optimistic locking. */
export function useSettingGroup<T>(group: SettingGroup, enabled = true): SettingGroupState<T> {
  const resource = useApiResource<SettingResponse<T>>(`/admin/settings/${group}`, { enabled });
  const [conflict, setConflict] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const action = useApiAction({
    onError: (error) => {
      setServerErrors(getFieldErrors(error));
      setConflict(isApiError(error) && error.code === "VERSION_CONFLICT");
    },
  });

  async function save(value: T) {
    setConflict(false);
    setServerErrors({});
    const saved = await action.run(
      () => settingsApi.update<T>(group, { version: resource.data?.version ?? 0, value }),
      { successMessage: "Đã lưu cài đặt." },
    );
    if (saved) resource.setData(saved);
    return saved;
  }

  function reload() {
    setConflict(false);
    setServerErrors({});
    resource.refetch();
  }

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    conflict,
    pending: action.pending,
    serverErrors,
    save,
    reload,
  };
}
