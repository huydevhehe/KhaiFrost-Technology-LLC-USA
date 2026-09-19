import { AdminGate } from "@/components/admin/AdminGate";
import { ConfirmProvider, ToastProvider } from "@/components/admin/shared";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminGate>{children}</AdminGate>
      </ConfirmProvider>
    </ToastProvider>
  );
}
