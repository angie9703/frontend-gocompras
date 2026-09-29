"use client";

import { FileText, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { WhatsAppIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/cn";
import { useAjustes } from "@/store/useAjustesStore";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-[#2b4aa3] text-white">
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 md:py-20">
        <p className="text-sm font-semibold tracking-wide text-secondary uppercase">Go Compras</p>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
          Materiales Eléctricos para Tu Proyecto y Hogar
        </h1>
        <p className="max-w-2xl text-base text-white/85 md:text-lg">
          Venta directa con retiro en Puntos Seguros o envíos a convenir.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/productos"
            className="btn-touch inline-flex items-center justify-center bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Explorar Catálogo
          </Link>
          <Link
            href="/productos"
            className="btn-touch inline-flex items-center justify-center border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            Ver Ofertas
          </Link>
        </div>
      </div>
    </section>
  );
}

const benefitCardClass =
  "flex h-full cursor-pointer gap-3 rounded-xl border border-slate-100 bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function BenefitCardContent({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-main">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </>
  );
}

export function BenefitsBar() {
  const ajustes = useAjustes();
  const cleanPhone = ajustes?.whatsapp ? ajustes.whatsapp.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";
  const whatsappVisible = ajustes?.whatsapp?.trim()
    ? ajustes.whatsapp.trim().startsWith("+")
      ? ajustes.whatsapp.trim()
      : `+${ajustes.whatsapp.trim()}`
    : "";
  const atencionDescripcion = whatsappVisible
    ? `Asesoramiento por WhatsApp al ${whatsappVisible} para armar tu pedido o resolver dudas.`
    : "Asesoramiento por WhatsApp para armar tu pedido o resolver dudas.";
  const [infoOpen, setInfoOpen] = useState(false);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!infoOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [infoOpen]);

  return (
    <section id="puntos-seguros" className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-3">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            className={benefitCardClass}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribir por WhatsApp al ${whatsappVisible}`}
          >
            <BenefitCardContent
              icon={<WhatsAppIcon className="size-5" aria-hidden />}
              title="Atención Directa"
              description={atencionDescripcion}
            />
          </a>
        ) : (
          <div className={benefitCardClass}>
            <BenefitCardContent
              icon={<WhatsAppIcon className="size-5" aria-hidden />}
              title="Atención Directa"
              description={atencionDescripcion}
            />
          </div>
        )}

        <Link href="/productos" className={benefitCardClass} aria-label="Ir al catálogo para armar un presupuesto">
          <BenefitCardContent
            icon={<FileText className="size-5" aria-hidden />}
            title="Presupuesto Inmediato"
            description="Descargá el presupuesto en PDF y compartilo con tu cliente o tu obra."
          />
        </Link>

        <button
          type="button"
          className={cn(benefitCardClass, "w-full cursor-pointer")}
          onClick={() => setInfoOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={infoOpen}
          aria-label="Ver cómo funcionan los envíos y puntos seguros"
        >
          <BenefitCardContent
            icon={<MapPin className="size-5" aria-hidden />}
            title="Envíos y Puntos Seguros"
            description="Coordiná el envío a domicilio o retirá en estaciones y supermercados. No pedimos tu dirección exacta al comprar."
          />
        </button>
      </div>

      {infoOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Cerrar información de envíos"
            onClick={() => setInfoOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={dialogTitleId} className="text-lg font-semibold text-main">
                Envíos y Puntos Seguros
              </h2>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                aria-label="Cerrar"
                onClick={() => setInfoOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-muted">
              <p>
                No pedimos tu dirección exacta al comprar. La entrega se coordina después por WhatsApp,
                según la modalidad que elijas en el pedido.
              </p>
              <p>
                <span className="font-semibold text-main">Envío a Domicilio:</span> acordamos la
                dirección y el costo de flete con un vendedor.
              </p>
              <p>
                <span className="font-semibold text-main">Punto Seguro de Encuentro:</span> te
                esperamos en un lugar público, como una estación o un supermercado.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
