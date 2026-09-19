"use client";

import { useEffect, useRef, useState } from "react";
import { MediaPicker, type MediaSelection } from "@/components/admin/shared";
import { isApiError } from "@/lib/api/client";
import { mediaApi } from "@/lib/api/admin/media";

export interface MediaFieldProps {
  /** The stored media asset id (what the API keeps). */
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string | null;
  required?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  folder?: string;
  className?: string;
}

/**
 * MediaPicker bound to a media asset id: the thumbnail of an already stored id
 * is looked up once, later picks come straight from the dialog.
 */
export function MediaField({
  value,
  onChange,
  label = "Ảnh",
  required = false,
  hint,
  error,
  disabled = false,
  folder,
  className,
}: MediaFieldProps) {
  const [selection, setSelection] = useState<MediaSelection | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!value) {
      loadedId.current = null;
      return;
    }
    if (loadedId.current === value) return;
    loadedId.current = value;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const asset = await mediaApi.get(value, controller.signal);
        if (cancelled) return;
        setSelection({
          id: asset.id,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          name: asset.displayName ?? asset.name,
        });
        setLookupFailed(false);
      } catch (caught) {
        if (cancelled || (isApiError(caught) && caught.code === "ABORTED")) return;
        setSelection({ id: value, url: "", thumbnailUrl: "", name: "Ảnh không còn tồn tại" });
        setLookupFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [value]);

  const current = value ? (selection?.id === value ? selection : null) : null;

  return (
    <MediaPicker
      value={current}
      onChange={(next) => {
        setSelection(next);
        setLookupFailed(false);
        loadedId.current = next?.id ?? null;
        onChange(next?.id ?? null);
      }}
      label={label}
      required={required}
      hint={hint}
      error={error ?? (lookupFailed ? "Không tìm thấy ảnh này trong thư viện." : undefined)}
      disabled={disabled}
      folder={folder}
      className={className}
    />
  );
}
