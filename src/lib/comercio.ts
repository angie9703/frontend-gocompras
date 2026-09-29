import type { ConfiguracionComercio } from "@/types";

export const FALLBACK_DIRECCION_LOCAL =
  "Local Go Compras. Te confirmamos la dirección exacta y el horario de retiro por WhatsApp.";

export const CONFIG_FALLBACK: ConfiguracionComercio = {
  id: "fallback",
  nombreComercio: "Go Compras",
  whatsappVentas: "",
  instagramUrl: null,
  facebookUrl: null,
  emailContacto: null,
  direccionLocal: null,
  horariosAtencion: "Lunes a viernes: 9:00 a 18:00\nSábados: 9:00 a 13:00\nDomingos y feriados: cerrado",
  mensajeFlete: "Envío a coordinar o retiro en punto seguro",
  updatedAt: "",
};

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeConfig(
  data: Partial<ConfiguracionComercio> | null | undefined,
): ConfiguracionComercio {
  return {
    id: data?.id?.trim() || CONFIG_FALLBACK.id,
    nombreComercio: data?.nombreComercio?.trim() || CONFIG_FALLBACK.nombreComercio,
    whatsappVentas: data?.whatsappVentas?.trim() || "",
    instagramUrl: emptyToNull(data?.instagramUrl),
    facebookUrl: emptyToNull(data?.facebookUrl),
    emailContacto: emptyToNull(data?.emailContacto),
    direccionLocal: emptyToNull(data?.direccionLocal),
    horariosAtencion: emptyToNull(data?.horariosAtencion) ?? CONFIG_FALLBACK.horariosAtencion,
    mensajeFlete: emptyToNull(data?.mensajeFlete) ?? CONFIG_FALLBACK.mensajeFlete,
    updatedAt: data?.updatedAt ?? "",
  };
}

export function getWhatsAppDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function getWhatsAppHref(phone: string | null | undefined, text?: string): string | null {
  const digits = getWhatsAppDigits(phone);
  if (digits.length < 8) return null;
  const url = `https://wa.me/${digits}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

export function formatWhatsAppDisplay(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("549") && digits.length >= 12) {
    const national = digits.slice(3);
    const areaLen = national.startsWith("11") ? 2 : national.length === 10 ? 3 : Math.min(4, Math.max(national.length - 6, 2));
    const area = national.slice(0, areaLen);
    const local = national.slice(areaLen);
    const localFmt = local.length > 4 ? `${local.slice(0, -4)}-${local.slice(-4)}` : local;
    return `+54 9 ${area} ${localFmt}`;
  }

  return `+${digits}`;
}

export function getIgHandle(url: string | null | undefined): string {
  if (!url) return "Instagram";
  const raw = url.split("instagram.com/")[1]?.replace(/\/$/, "");
  const handle = raw?.split(/[/?#]/)[0];
  return handle ? `@${handle}` : "Instagram";
}

export function getFbHandle(url: string | null | undefined): string {
  if (!url) return "Facebook";
  const raw = url.split("facebook.com/")[1]?.replace(/\/$/, "");
  const page = raw?.split(/[/?#]/)[0];
  return page ? `/${page}` : "Facebook";
}

export function getInstagramHandle(url: string | null | undefined): string | null {
  const value = emptyToNull(url);
  if (!value) return null;

  try {
    const path = new URL(value).pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    return path ? `@${path}` : "Instagram";
  } catch {
    return "Instagram";
  }
}

export function splitHorarios(value: string | null | undefined): string[] {
  const text = emptyToNull(value);
  if (!text) return [];
  return text
    .split(/\n|;|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getDireccionLocal(config: ConfiguracionComercio): string {
  return config.direccionLocal ?? FALLBACK_DIRECCION_LOCAL;
}
