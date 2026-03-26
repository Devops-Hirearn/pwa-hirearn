"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function ProfilePlaceholderPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-[50vh] bg-slate-50 px-4 py-8">
      <Link href="/settings" className="text-sm font-medium text-[#2563EB]">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Edit profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        Profile editing with photo upload will match the mobile flow. Current name on account:{" "}
        <strong>{String(user?.fullName || user?.name || "—")}</strong>
      </p>
    </div>
  );
}
