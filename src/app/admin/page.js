"use client";

import { useSyncExternalStore } from "react";
import AdminPageClient from "@/components/admin-page-client";

export default function AdminPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xl">
          Đang tải trang quản trị...
        </div>
      </main>
    );
  }

  return <AdminPageClient />;
}
