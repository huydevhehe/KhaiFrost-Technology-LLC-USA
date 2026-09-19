"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/admin/shared";

export interface TemporaryPasswordDialogProps {
  open: boolean;
  /** The generated password; it is returned by the API exactly once. */
  password: string;
  /** Who the password belongs to. */
  userName: string;
  onClose: () => void;
}

/**
 * Shows a temporary password once. The dialog can only be dismissed through the
 * acknowledge button so the password is not lost by an accidental click outside.
 */
export function TemporaryPasswordDialog({ open, password, userName, onClose }: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableDismiss
      hideCloseButton
      size="sm"
      title="Mật khẩu tạm thời"
      description={`Chỉ hiển thị một lần cho tài khoản ${userName}.`}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none"
        >
          Tôi đã lưu mật khẩu
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <KeyRound size={18} className="mt-0.5 shrink-0" />
          <p>
            Hãy sao chép và gửi mật khẩu này cho người dùng qua kênh an toàn. Sau khi đóng hộp thoại,
            mật khẩu không thể xem lại; khi đó bạn phải đặt lại mật khẩu mới.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-900 select-all">
            {password}
          </code>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Người dùng bắt buộc phải đổi mật khẩu trong lần đăng nhập đầu tiên.
        </p>
      </div>
    </Modal>
  );
}
