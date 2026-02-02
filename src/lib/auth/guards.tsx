"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context";

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return <>{children}</>;
}

export function RequireProfile({ children }: { children: ReactNode }) {
  const { profileComplete, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profileComplete) {
      router.replace("/profile");
    }
  }, [profileComplete, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (!profileComplete) return null;

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (role !== "admin") return null;

  return <>{children}</>;
}
