"use client";

// StoreProvider is no longer needed since we moved from localStorage to Supabase.
// This file is kept as a no-op wrapper for backwards compatibility.

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
