"use client";

import { useEffect, useState } from "react";
import { initializeStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeStore();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading QA Dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
