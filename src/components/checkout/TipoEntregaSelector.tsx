"use client";

import { MapPin, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TipoEntrega } from "@/types";

const OPCIONES: Array<{
  tipo: TipoEntrega;
  titulo: string;
  tituloCorto: string;
  descripcion: string;
  icon: ReactNode;
}> = [
  {
    tipo: "ENVIO_DOMICILIO",
    titulo: "Envío a Domicilio",
    tituloCorto: "Envío Domicilio",
    descripcion: "Coordinamos la dirección exacta y el costo de flete por WhatsApp.",
    icon: <MapPin className="size-4 lg:size-5" aria-hidden />,
  },
  {
    tipo: "PUNTO_SEGURO",
    titulo: "Punto Seguro de Encuentro",
    tituloCorto: "Punto Seguro",
    descripcion: "Acordamos el punto de encuentro por WhatsApp.",
    icon: <ShieldCheck className="size-4 lg:size-5" aria-hidden />,
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
      <p className="mt-1 hidden text-xs text-muted lg:block">
        Si no elegís una opción, lo coordinamos después por WhatsApp.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-3 lg:gap-3" role="radiogroup" aria-label="Modalidad de entrega">
        {OPCIONES.map((opcion) => {
          const selected = value === opcion.tipo;

          return (
            <label
              key={opcion.tipo}
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
                {opcion.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-tight text-main sm:text-sm">
                  <span className="lg:hidden">{opcion.tituloCorto}</span>
                  <span className="hidden lg:inline">{opcion.titulo}</span>
                </span>
                <span className="mt-0.5 hidden text-xs leading-snug text-muted lg:block">{opcion.descripcion}</span>
              </span>
              <input
                type="radio"
                name="tipoEntrega"
                value={opcion.tipo}
                checked={selected}
                onChange={() => onChange(opcion.tipo)}
                className="sr-only size-4 shrink-0 accent-primary lg:not-sr-only"
              />
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
