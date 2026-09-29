"use client";

import { type ReactNode, useEffect } from "react";
import { useAjustesStore } from "@/store/useAjustesStore";
import { useConfigStore } from "@/store/useConfigStore";

export function ConfigBootstrap({ children }: { children: ReactNode }) {
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const loadAjustes = useAjustesStore((state) => state.loadAjustes);

  useEffect(() => {
    void loadConfig();
    void loadAjustes();
  }, [loadConfig, loadAjustes]);

  return <>{children}</>;
}
