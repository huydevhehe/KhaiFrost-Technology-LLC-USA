"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/admin/shared";
import type { SectionTypeDefinition } from "@/lib/api/admin/pages";
import { ActionButton } from "./controls";

export interface AddSectionDialogProps {
  open: boolean;
  onClose: () => void;
  types: SectionTypeDefinition[];
  pending: boolean;
  onAdd: (type: string) => void;
}

/** Picks a section type from the registry returned by GET admin/pages/section-types. */
export function AddSectionDialog({ open, onClose, types, pending, onAdd }: AddSectionDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm section"
      description="Chọn loại nội dung muốn thêm vào cuối trang."
      size="lg"
      footer={
        <>
          <ActionButton onClick={onClose}>Huỷ</ActionButton>
          <ActionButton
            tone="primary"
            icon={<Plus size={15} />}
            pending={pending}
            disabled={!selected}
            onClick={() => selected && onAdd(selected)}
          >
            Thêm section
          </ActionButton>
        </>
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {types.map((type) => {
          const active = selected === type.type;
          return (
            <li key={type.type}>
              <button
                type="button"
                onClick={() => setSelected(type.type)}
                aria-pressed={active}
                className={`flex h-full w-full flex-col gap-1 rounded-lg border px-3.5 py-3 text-left transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${
                  active ? "border-accent bg-accent/5" : "border-slate-200 hover:border-accent/60"
                }`}
              >
                <span className="text-sm font-medium text-slate-900">{type.label.vi}</span>
                <span className="text-xs text-slate-500">{type.description.vi}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
