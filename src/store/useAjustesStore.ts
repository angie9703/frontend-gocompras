"use client";

import { create } from "zustand";
import { buildPedidoWhatsAppUrl } from "@/lib/whatsapp";
import { useHasMounted } from "@/lib/useHasMounted";
import { getAjustes } from "@/services/configuracion";
import type { AjustesTienda } from "@/types";

interface AjustesState {
  ajustes: AjustesTienda | null;
  status: "idle" | "loading" | "ready";
  loadAjustes: () => Promise<void>;
  setAjustes: (ajustes: AjustesTienda) => void;
}

export const useAjustesStore = create<AjustesState>((set, get) => ({
  ajustes: null,
  status: "idle",

  loadAjustes: async () => {
    if (get().status === "loading") return;
    if (get().status === "ready") return;

    set({ status: "loading" });
    try {
      const ajustes = await getAjustes();
      set({ ajustes, status: "ready" });
    } catch {
      set({ ajustes: null, status: "ready" });
    }
  },

  setAjustes: (ajustes) => set({ ajustes, status: "ready" }),
}));

export function useAjustes(): AjustesTienda | null {
  const ajustes = useAjustesStore((state) => state.ajustes);
  const hasMounted = useHasMounted();
  return hasMounted ? ajustes : null;
}

export function whatsappUrlFromAjustes(
  ajustes: { whatsapp?: string | null } | null | undefined,
  text?: string,
): string | null {
  const cleanPhone = ajustes?.whatsapp ? ajustes.whatsapp.replace(/\D/g, "") : "";
  if (!cleanPhone) return null;
  if (!text) return `https://wa.me/${cleanPhone}`;
  return buildPedidoWhatsAppUrl(cleanPhone, text);
}
