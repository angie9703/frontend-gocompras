import type { Banner } from "@/types";

export function bannerLink(banner: Banner): string | null {
  const href =
    banner.link_url?.trim() ||
    banner.linkUrl?.trim() ||
    banner.linkDestino?.trim() ||
    banner.ctaHref?.trim() ||
    "";
  return href || null;
}

export function bannerImages(banner: Banner): { desktop: string | null; mobile: string | null } {
  const desktop = banner.imagenUrl?.trim() || banner.imagen_url?.trim() || null;
  const mobile = banner.imagenMobileUrl?.trim() || banner.imagen_mobile_url?.trim() || null;
  return { desktop, mobile };
}

function bannerOrden(banner: Banner): number {
  const orden = Number(banner.orden);
  return Number.isFinite(orden) ? orden : 0;
}

function bannerEstaActivo(banner: Banner, now = Date.now()): boolean {
  if (banner.activo === false || banner.publicado === false) return false;
  if (banner.fechaInicio) {
    const inicio = Date.parse(banner.fechaInicio);
    if (Number.isFinite(inicio) && inicio > now) return false;
  }
  if (banner.fechaFin) {
    const fin = Date.parse(banner.fechaFin);
    if (Number.isFinite(fin) && fin < now) return false;
  }
  const images = bannerImages(banner);
  return Boolean(images.desktop || images.mobile);
}

export function bannersVisibles(items: Banner[]): Banner[] {
  return items
    .filter((item) => bannerEstaActivo(item))
    .sort((a, b) => bannerOrden(a) - bannerOrden(b) || a.id - b.id);
}
