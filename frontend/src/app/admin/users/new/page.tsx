"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { useApiAction } from "@/components/admin/shared";
import { UserForm, type UserFormValues } from "@/components/admin/people/UserForm";
import { TemporaryPasswordDialog } from "@/components/admin/people/TemporaryPasswordDialog";
import { assignableRoles, usersApi } from "@/lib/api/admin/users";
import { getFieldErrors } from "@/lib/api/errorMessages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function AdminUserCreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [temporary, setTemporary] = useState<{ password: string; name: string } | null>(null);

  const action = useApiAction({
    onError: (error) => setServerErrors(getFieldErrors(error)),
  });

  const canCreate = !!user?.permissions.includes(PERMISSIONS.USER_CREATE);
  const roles = assignableRoles(user?.role);

  async function handleSubmit(values: UserFormValues) {
    setServerErrors({});
    const created = await action.run(
      () =>
        usersApi.create({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          role: values.role,
          password: values.passwordMode === "manual" ? values.password : undefined,
        }),
      { successMessage: "Đã tạo tài khoản." },
    );
    if (!created) return;
    if (created.temporaryPassword) {
      setTemporary({ password: created.temporaryPassword, name: created.fullName });
      return;
    }
    router.push("/admin/users");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/users"
          className="mb-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-accent"
        >
          <ArrowLeft size={15} />
          Danh sách tài khoản
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Thêm tài khoản nội bộ</h1>
      </div>

      {!canCreate ? (
        <Panel>
          <p className="text-sm text-slate-500">Bạn không có quyền tạo tài khoản nội bộ.</p>
        </Panel>
      ) : (
        <UserForm
          mode="create"
          roles={roles}
          pending={action.pending}
          serverErrors={serverErrors}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => router.push("/admin/users")}
        />
      )}

      <TemporaryPasswordDialog
        open={temporary !== null}
        password={temporary?.password ?? ""}
        userName={temporary?.name ?? ""}
        onClose={() => {
          setTemporary(null);
          router.push("/admin/users");
        }}
      />
    </div>
  );
}
