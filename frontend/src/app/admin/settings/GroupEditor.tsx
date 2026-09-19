"use client";

import { useState, type ReactNode } from "react";
import { useToast } from "@/components/admin/shared";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import type { SettingGroup, SettingResponse } from "@/lib/api/admin/settings";
import { SettingsForm } from "./SettingsForm";
import { useSettingGroup } from "./useSettingGroup";

export interface GroupEditorProps<T, F extends object> {
  group: SettingGroup;
  title: string;
  description?: string;
  /** Builds the editable form state from the stored value. */
  toForm: (value: T, response: SettingResponse<T>) => F;
  /** Builds the exact value the API expects (the whole group is replaced). */
  toValue: (form: F) => T;
  /** Returns a Vietnamese message when the form cannot be saved yet. */
  validate?: (form: F) => string | null;
  /** Renders the inputs; `readOnly` disables them. */
  children: (args: { form: F; setForm: (patch: Partial<F>) => void; readOnly: boolean; errors: Record<string, string>; response: SettingResponse<T> }) => ReactNode;
}

/** One settings group: loads it, keeps a local draft, validates and saves it. */
export function GroupEditor<T, F extends object>(props: GroupEditorProps<T, F>) {
  const { group, title, description } = props;
  const state = useSettingGroup<T>(group);
  const { hasPermission } = useAuth();
  const readOnly = !hasPermission(PERMISSIONS.SETTING_UPDATE);

  if (!state.data) {
    return (
      <SettingsForm title={title} description={description} state={state} readOnly onSubmit={() => {}}>
        {null}
      </SettingsForm>
    );
  }

  return (
    <GroupDraft<T, F>
      key={`${group}:${state.data.version}`}
      {...props}
      state={state}
      response={state.data}
      readOnly={readOnly}
    />
  );
}

function GroupDraft<T, F extends object>({
  title,
  description,
  toForm,
  toValue,
  validate,
  children,
  state,
  response,
  readOnly,
}: GroupEditorProps<T, F> & {
  state: ReturnType<typeof useSettingGroup<T>>;
  response: SettingResponse<T>;
  readOnly: boolean;
}) {
  const toast = useToast();
  const [form, setFormState] = useState<F>(() => toForm(response.value, response));

  const setForm = (patch: Partial<F>) => setFormState((current) => ({ ...current, ...patch }));

  const onSubmit = () => {
    const problem = validate?.(form) ?? null;
    if (problem) {
      toast.error(problem);
      return;
    }
    void state.save(toValue(form));
  };

  const errors = Object.entries(state.serverErrors);

  return (
    <SettingsForm
      title={title}
      description={description}
      state={state}
      readOnly={readOnly}
      onSubmit={onSubmit}
    >
      {errors.length > 0 && (
        <ul role="alert" className="list-disc rounded-lg bg-red-50 py-2.5 pr-3.5 pl-7 text-sm text-red-700">
          {errors.map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        {children({ form, setForm, readOnly, errors: state.serverErrors, response })}
      </fieldset>
    </SettingsForm>
  );
}
