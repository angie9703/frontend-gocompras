import { Percent, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const PROMOS = [
  {
    icon: Percent,
    title: "Descuentos por cantidad",
    description: "Comprá en volumen para tu obra y accedé a precios especiales por rollo o caja cerrada.",
  },
  {
    icon: Users,
    title: "Precio gremio",
    description: "Electricistas y matriculados acceden a condiciones preferenciales presentando su credencial.",
  },
  {
    icon: ShieldCheck,
    title: "Envío gratis en Puntos Seguros",
    description: "Retirá sin cargo en estaciones y supermercados adheridos dentro del área de cobertura.",
  },
];

export interface PromoStripContent {
  etiqueta: string;
  titulo: string;
  ctaLabel: string;
  ctaHref: string;
  imagenUrl?: string | null;
  tarjeta1Visible?: boolean;
  tarjeta2Visible?: boolean;
  tarjeta3Visible?: boolean;
}

export const PROMO_STRIP_DEFAULTS: PromoStripContent = {
  etiqueta: "PROMOCIONES & OFERTAS DEL MES",
  titulo: "Ahorrá más en cada pedido",
  ctaLabel: "Ver productos en oferta",
  ctaHref: "/productos?ofertas=true",
  imagenUrl: null,
};

export function PromoStrip({
  content,
  preview = false,
}: {
  content: PromoStripContent;
  preview?: boolean;
}) {
  const href = content.ctaHref.trim() || "/productos";
  const externo = href.startsWith("http");
  const etiqueta = content.etiqueta.trim() || PROMO_STRIP_DEFAULTS.etiqueta;
  const titulo = content.titulo.trim() || PROMO_STRIP_DEFAULTS.titulo;
  const ctaLabel = content.ctaLabel.trim() || PROMO_STRIP_DEFAULTS.ctaLabel;
  const tarjetaVisible = [content.tarjeta1Visible !== false, content.tarjeta2Visible !== false, content.tarjeta3Visible !== false];
  const tarjetas = PROMOS.filter((_, index) => tarjetaVisible[index]);
  const buttonClass =
    "btn-touch inline-flex items-center justify-center self-start bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover sm:self-auto";

  return (
    <section className="relative w-full min-w-0 overflow-hidden bg-gradient-to-r from-primary via-primary-dark to-[#0e1c45]">
      {content.imagenUrl?.trim() ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${content.imagenUrl.trim()})` }}
          aria-hidden
        />
      ) : null}
      <div className="relative mx-auto max-w-7xl min-w-0 px-4 py-10 md:py-12">
        <div className={`flex min-w-0 flex-col gap-2 ${preview ? "" : "sm:flex-row sm:items-end sm:justify-between"}`}>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-secondary uppercase">{etiqueta}</p>
            <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{titulo}</h2>
          </div>
          {preview ? (
            <span className={buttonClass}>{ctaLabel}</span>
          ) : (
            <Link
              href={href}
              className={buttonClass}
              target={externo ? "_blank" : undefined}
              rel={externo ? "noopener noreferrer" : undefined}
            >
              {ctaLabel}
            </Link>
          )}
        </div>

        {tarjetas.length > 0 ? (
          <div
            className={`mt-6 grid min-w-0 gap-4 ${
              preview || tarjetas.length === 1 ? "" : tarjetas.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
            }`}
          >
            {tarjetas.map((promo) => (
              <article
                key={promo.title}
                className="flex min-w-0 gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary-dark">
                  <promo.icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{promo.title}</h3>
                  <p className="mt-1 text-sm text-white/80">{promo.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
