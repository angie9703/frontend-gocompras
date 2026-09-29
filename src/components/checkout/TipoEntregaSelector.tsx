"use client";

import { MapPin, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TipoEntrega } from "@/types";

const OPCIONES: Array<{
  tipo: TipoEntrega;
  titulo: string;
  descripcion: string;
  icon: ReactNode;
}> = [
  {
    tipo: "ENVIO_DOMICILIO",
    titulo: "Envío a Domicilio",
    descripcion: "Coordinamos la dirección exacta y el costo de flete por WhatsApp.",
    icon: <MapPin className="size-5" aria-hidden />,
  },
  {
    tipo: "PUNTO_SEGURO",
    titulo: "Punto Seguro de Encuentro",
    descripcion: "Acordamos el punto de encuentro por WhatsApp.",
    icon: <ShieldCheck className="size-5" aria-hidden />,
  },
];

export interface TipoEntregaSelectorProps {
  value: TipoEntrega | "";
  onChange: (tipo: TipoEntrega) => void;
  error?: string;
}

export function TipoEntregaSelector({ value, onChange, error }: TipoEntregaSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-main">
        Modalidad de entrega <span className="font-normal text-muted">(opcional)</span>
      </legend>
      <p className="mt-1 text-xs text-muted">
        Si no elegís una opción, lo coordinamos después por WhatsApp.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modalidad de entrega">
        {OPCIONES.map((opcion) => {
          const selected = value === opcion.tipo;

          return (
            <label
              key={opcion.tipo}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border bg-white p-3 transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-slate-200 hover:border-primary/40",
              )}
            >
              <input
                type="radio"
                name="tipoEntrega"
                value={opcion.tipo}
                checked={selected}
                onChange={() => onChange(opcion.tipo)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-main">
                  <span className="text-primary">{opcion.icon}</span>
                  {opcion.titulo}
                </span>
                <span className="mt-1 block text-xs text-muted">{opcion.descripcion}</span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
