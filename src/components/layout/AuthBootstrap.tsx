"use client";

import { type ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    const run = () => {
      void checkAuth();
    };

    if (useAuthStore.persist.hasHydrated()) {
      run();
      return;
    }

    return useAuthStore.persist.onFinishHydration(run);
  }, [checkAuth]);

  return <>{children}</>;
}
