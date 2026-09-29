"use client";

import { create } from "zustand";
import { CONFIG_FALLBACK, normalizeConfig } from "@/lib/comercio";
import { useHasMounted } from "@/lib/useHasMounted";
import { getConfiguracion } from "@/services/configuracion";
import type { ConfiguracionComercio } from "@/types";

type ConfigStatus = "idle" | "loading" | "ready";

interface ConfigState {
  config: ConfiguracionComercio;
  status: ConfigStatus;
  error: string | null;
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: CONFIG_FALLBACK,
  status: "idle",
  error: null,

  loadConfig: async () => {
    if (get().status === "loading") return;
    if (get().status === "ready" && !get().error) return;

    set({ status: "loading" });

    try {
      const config = normalizeConfig(await getConfiguracion());
      set({ config, status: "ready", error: null });
    } catch {
      set({
        config: CONFIG_FALLBACK,
        status: "ready",
        error: "No se pudo cargar la configuración del comercio.",
      });
    }
  },
}));

export function useComercioConfig(): ConfiguracionComercio {
  const config = useConfigStore((state) => state.config);
  const hasMounted = useHasMounted();
  return hasMounted ? config : CONFIG_FALLBACK;
}
