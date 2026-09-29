"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (varianteId: string) => void;
  updateQuantity: (varianteId: string, cantidad: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

function clampCantidad(cantidad: number, stockDisponible: number): number {
  if (stockDisponible <= 0 || cantidad <= 0) return 0;
  return Math.min(cantidad, stockDisponible);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      addItem: (item) => {
        const cantidadNueva = clampCantidad(item.cantidad, item.stockDisponible);
        if (cantidadNueva <= 0) return;

        set((state) => {
          const existente = state.items.find((current) => current.varianteId === item.varianteId);

          if (!existente) {
            return { items: [...state.items, { ...item, cantidad: cantidadNueva }] };
          }

          const cantidad = clampCantidad(
            existente.cantidad + item.cantidad,
            item.stockDisponible,
          );

          if (cantidad <= 0) {
            return {
              items: state.items.filter((current) => current.varianteId !== item.varianteId),
            };
          }

          return {
            items: state.items.map((current) =>
              current.varianteId === item.varianteId
                ? {
                    ...current,
                    ...item,
                    cantidad,
                  }
                : current,
            ),
          };
        });
      },

      removeItem: (varianteId) => {
        set((state) => ({
          items: state.items.filter((item) => item.varianteId !== varianteId),
        }));
      },

      updateQuantity: (varianteId, cantidad) => {
        set((state) => {
          const existente = state.items.find((item) => item.varianteId === varianteId);
          if (!existente) return state;

          const cantidadClamped = clampCantidad(cantidad, existente.stockDisponible);
          if (cantidadClamped <= 0) {
            return { items: state.items.filter((item) => item.varianteId !== varianteId) };
          }

          return {
            items: state.items.map((item) =>
              item.varianteId === varianteId ? { ...item, cantidad: cantidadClamped } : item,
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      getTotalItems: () => get().items.reduce((total, item) => total + item.cantidad, 0),

      getSubtotal: () =>
        get().items.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0),
    }),
    {
      name: "gocompras-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
