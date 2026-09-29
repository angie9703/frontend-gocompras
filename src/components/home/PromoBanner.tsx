"use client";

import { useEffect, useState } from "react";
import { PromoStrip, PROMO_STRIP_DEFAULTS, type PromoStripContent } from "@/components/home/PromoStrip";
import { getBannersActivos } from "@/services/banners";
import type { Banner } from "@/types";

export function bannerToPromoContent(banner: Banner): PromoStripContent {
  return {
    etiqueta: banner.subtitulo?.trim() || PROMO_STRIP_DEFAULTS.etiqueta,
    titulo: banner.titulo.trim() || PROMO_STRIP_DEFAULTS.titulo,
    ctaLabel: banner.ctaLabel?.trim() || PROMO_STRIP_DEFAULTS.ctaLabel,
    ctaHref: banner.ctaHref?.trim() || banner.linkDestino?.trim() || PROMO_STRIP_DEFAULTS.ctaHref,
    imagenUrl: banner.imagenUrl,
    tarjeta1Visible: banner.tarjeta1Visible !== false,
    tarjeta2Visible: banner.tarjeta2Visible !== false,
    tarjeta3Visible: banner.tarjeta3Visible !== false,
  };
}

export function pickPromoBanner(items: Banner[]): Banner | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => a.orden - b.orden || a.id - b.id)[0] ?? null;
}

export function PromoBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getBannersActivos().then((items) => {
      if (cancelled) return;
      setBanner(pickPromoBanner(items));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !banner || !banner.publicado || !banner.activo) return null;

  return <PromoStrip content={bannerToPromoContent(banner)} />;
}
