"use client";

import { Banknote, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MetodoPagoCheckout } from "@/types";

const OPCIONES: Array<{
  id: MetodoPagoCheckout;
  label: string;
  descripcion: string;
  icon: ReactNode;
}> = [
  {
    id: "EFECTIVO",
    label: "Efectivo contra entrega",
    descripcion: "Pagás al retirar o al recibir el pedido.",
    icon: <Banknote className="size-5" aria-hidden />,
  },
  {
    id: "TRANSFERENCIA",
    label: "Transferencia bancaria",
    descripcion: "Te enviamos los datos bancarios por WhatsApp.",
    icon: <Landmark className="size-5" aria-hidden />,
  },
];

export interface MetodoPagoSelectorProps {
  value: MetodoPagoCheckout | "";
  onChange: (metodo: MetodoPagoCheckout) => void;
}

export function MetodoPagoSelector({ value, onChange }: MetodoPagoSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-main">
        Método de pago <span className="font-normal text-muted">(opcional)</span>
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Método de pago">
        {OPCIONES.map((metodo) => {
          const selected = value === metodo.id;

          return (
            <label
              key={metodo.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border bg-white p-3 transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-slate-200 hover:border-primary/40",
              )}
            >
              <input
                type="radio"
                name="metodoPago"
                value={metodo.id}
                checked={selected}
                onChange={() => onChange(metodo.id)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-main">
                  <span className="text-primary">{metodo.icon}</span>
                  {metodo.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{metodo.descripcion}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function labelMetodoPago(metodo: MetodoPagoCheckout): string {
  return OPCIONES.find((opcion) => opcion.id === metodo)?.label ?? metodo;
}
