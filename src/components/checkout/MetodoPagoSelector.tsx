"use client";

import { Banknote, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MetodoPagoCheckout } from "@/types";

const OPCIONES: Array<{
  id: MetodoPagoCheckout;
  label: string;
  labelCorto: string;
  descripcion: string;
  icon: ReactNode;
}> = [
  {
    id: "EFECTIVO",
    label: "Efectivo contra entrega",
    labelCorto: "Efectivo",
    descripcion: "Pagás al retirar o al recibir el pedido.",
    icon: <Banknote className="size-4 lg:size-5" aria-hidden />,
  },
  {
    id: "TRANSFERENCIA",
    label: "Transferencia bancaria",
    labelCorto: "Transferencia",
    descripcion: "Te enviamos los datos bancarios por WhatsApp.",
    icon: <Landmark className="size-4 lg:size-5" aria-hidden />,
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
      <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-3 lg:gap-3" role="radiogroup" aria-label="Método de pago">
        {OPCIONES.map((metodo) => {
          const selected = value === metodo.id;

          return (
            <label
              key={metodo.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border bg-white p-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary lg:gap-3 lg:p-3",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-slate-200 hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg lg:size-10",
                  selected ? "bg-primary text-white" : "bg-primary/10 text-primary",
                )}
              >
                {metodo.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-tight text-main sm:text-sm">
                  <span className="lg:hidden">{metodo.labelCorto}</span>
                  <span className="hidden lg:inline">{metodo.label}</span>
                </span>
                <span className="mt-0.5 hidden text-xs leading-snug text-muted lg:block">{metodo.descripcion}</span>
              </span>
              <input
                type="radio"
                name="metodoPago"
                value={metodo.id}
                checked={selected}
                onChange={() => onChange(metodo.id)}
                className="sr-only size-4 shrink-0 accent-primary lg:not-sr-only"
              />
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
