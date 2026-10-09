"use client";

import { FileText, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { WhatsAppIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/cn";
import { useAjustes } from "@/store/useAjustesStore";

const benefitCardClass =
  "flex w-[82%] min-w-0 flex-[0_0_82%] snap-start items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:w-full md:flex-1 md:basis-auto";

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
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-main">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-muted">{description}</p>
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeBenefit, setActiveBenefit] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateActive = () => {
      const count = scroller.children.length;
      if (count <= 1) {
        setActiveBenefit(0);
        return;
      }
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const next =
        maxScroll <= 1 ? 0 : Math.round((scroller.scrollLeft / maxScroll) * (count - 1));
      setActiveBenefit((current) => (current === next ? current : next));
    };

    updateActive();
    scroller.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      scroller.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  const scrollToBenefit = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const count = scroller.children.length;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const left = count <= 1 ? 0 : (maxScroll * index) / (count - 1);
    scroller.scrollTo({ left, behavior: "smooth" });
  };

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
    <section id="puntos-seguros" className="pb-20 md:pb-0">
      <div className="border-y border-slate-100 bg-slate-50 py-6">
        <div
          ref={scrollerRef}
          className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible md:px-4"
        >
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            className={benefitCardClass}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribir por WhatsApp al ${whatsappVisible}`}
          >
            <BenefitCardContent
              icon={<WhatsAppIcon className="size-4" aria-hidden />}
              title="Atención Directa"
              description="Asesoramiento personalizado por WhatsApp para armar tu pedido."
            />
          </a>
        ) : (
          <div className={benefitCardClass}>
            <BenefitCardContent
              icon={<WhatsAppIcon className="size-4" aria-hidden />}
              title="Atención Directa"
              description="Asesoramiento personalizado por WhatsApp para armar tu pedido."
            />
          </div>
        )}

        <Link href="/productos" className={benefitCardClass} aria-label="Ir al catálogo para armar un presupuesto">
          <BenefitCardContent
            icon={<FileText className="size-4" aria-hidden />}
            title="Presupuesto Inmediato"
            description="Recibí tu cotización en PDF lista para presentar o guardar."
          />
        </Link>

        <button
          type="button"
          className={cn(benefitCardClass, "cursor-pointer")}
          onClick={() => setInfoOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={infoOpen}
          aria-label="Ver cómo funcionan los envíos y retiros"
        >
          <BenefitCardContent
            icon={<MapPin className="size-4" aria-hidden />}
            title="Envíos y Retiros"
            description="Retirá en Puntos Seguros o coordinamos el envío a tu obra."
          />
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-2 md:hidden" role="tablist" aria-label="Beneficios">
          {["Atención Directa", "Presupuesto Inmediato", "Envíos y Retiros"].map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={activeBenefit === index}
              aria-label={label}
              className={cn(
                "size-2 rounded-full transition-colors",
                activeBenefit === index ? "bg-primary" : "bg-slate-300",
              )}
              onClick={() => scrollToBenefit(index)}
            />
          ))}
        </div>
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
