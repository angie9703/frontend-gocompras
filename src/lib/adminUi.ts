import { cn } from "@/lib/cn";
import type { EstadoPedido } from "@/types";

export const ESTADOS_PEDIDO_CONCRETADO = new Set<string>([
  "PAGADO",
  "EN_PREPARACION",
  "ENVIADO",
  "ENTREGADO",
]);

export function esPresupuestoAdmin(estado: string): boolean {
  return estado === "PENDIENTE_PAGO";
}

export function esPedidoConcretado(estado: string): boolean {
  return ESTADOS_PEDIDO_CONCRETADO.has(estado);
}

export const ESTADO_ADMIN_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: "Presupuesto",
  PAGADO: "Pagado",
  EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  BORRADOR: "Borrador",
  CONVERTIDO: "Convertido",
  EXPIRADO: "Expirado",
};

export function badgeEstadoClass(estado: string): string {
  if (estado === "PAGADO" || estado === "ENTREGADO" || estado === "CONVERTIDO") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (estado === "CANCELADO" || estado === "EXPIRADO") {
    return "bg-rose-100 text-rose-800";
  }
  if (estado === "PENDIENTE_PAGO" || estado === "BORRADOR") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-amber-100 text-amber-800";
}

export function stockCellClass(stock: number): string {
  if (stock === 0) return "bg-rose-50 font-semibold text-rose-700";
  if (stock < 5) return "bg-orange-50 font-semibold text-orange-700";
  return "text-main";
}

export function stockBadge(stock: number): { label: string; className: string } {
  if (stock === 0) {
    return { label: "0 u.", className: "bg-red-100 text-red-700" };
  }
  if (stock >= 1 && stock <= 4) {
    return { label: `${stock} u.`, className: "bg-yellow-100 text-yellow-800" };
  }
  return { label: `${stock} u.`, className: "bg-emerald-100 text-emerald-800" };
}

// Línea visual shadcn/tremor adoptada en todo el panel admin.
export const adminPageBgClass = "bg-slate-50/60";

export const adminCardClass = "rounded-xl border border-slate-200/80 bg-white shadow-sm";

export const adminFieldClass = "block text-sm font-semibold text-slate-800";

export const adminTableHeadClass =
  "bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200";

export const adminTableRowClass = "border-t border-slate-100 transition-colors hover:bg-slate-50/50";

export const selectClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-main shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export const textareaClass =
  "min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-main shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export const TIPO_ENTREGA_ADMIN: Record<string, string> = {
  ENVIO_DOMICILIO: "Envío a domicilio",
  PUNTO_SEGURO: "Punto seguro",
  A_COORDINAR: "A coordinar por WhatsApp",
};

export function tabClass(active: boolean): string {
  return cn(
    "min-h-10 rounded-lg px-3 text-sm font-medium transition-colors",
    active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
  );
}

export const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  PENDIENTE_PAGO: "EN_PREPARACION",
  PAGADO: "EN_PREPARACION",
  EN_PREPARACION: "ENVIADO",
  ENVIADO: "ENTREGADO",
};

export function labelAccionEstado(estado: string): string | null {
  if (estado === "PENDIENTE_PAGO") return "Confirmar como Pedido";
  const next = SIGUIENTE_ESTADO[estado as EstadoPedido];
  if (!next) return null;
  return `Pasar a ${ESTADO_ADMIN_LABEL[next]}`;
}

export const VIP_GASTO_MINIMO = 150_000;
export const FRECUENTE_PEDIDOS_MINIMO = 2;
export const FRECUENTE_GASTO_MINIMO = 50_000;

export type CategoriaCrm = "VIP" | "Frecuente" | "Regular";

export function categoriaCrm(cliente: { totalGastado?: string | number | null; totalPedidos: number }): CategoriaCrm {
  const gastado = Number(cliente.totalGastado ?? 0);
  if (gastado >= VIP_GASTO_MINIMO || cliente.totalPedidos >= 5) return "VIP";
  if (cliente.totalPedidos >= FRECUENTE_PEDIDOS_MINIMO || gastado >= FRECUENTE_GASTO_MINIMO) return "Frecuente";
  return "Regular";
}

export function categoriaCrmBadgeClass(categoria: CategoriaCrm): string {
  if (categoria === "VIP") return "bg-amber-100 text-amber-900 ring-1 ring-amber-200";
  if (categoria === "Frecuente") return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function initialsFromName(nombre: string | null | undefined, fallback = "CL"): string {
  const parts = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function avatarToneClass(seed: string): string {
  const tones = [
    "bg-violet-100 text-violet-800",
    "bg-sky-100 text-sky-800",
    "bg-emerald-100 text-emerald-800",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-800",
    "bg-indigo-100 text-indigo-800",
  ];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % tones.length;
  }
  return tones[hash] ?? tones[0];
}

export type EstadoOferta = "Activa" | "Programada" | "Vencida" | "Inactiva";

export function estadoOferta(promo: { activo: boolean; fechaInicio: string; fechaFin: string }, now = new Date()): EstadoOferta {
  if (!promo.activo) return "Inactiva";
  const start = new Date(promo.fechaInicio).getTime();
  const end = new Date(promo.fechaFin).getTime();
  const current = now.getTime();
  if (Number.isFinite(start) && current < start) return "Programada";
  if (Number.isFinite(end) && current > end) return "Vencida";
  return "Activa";
}

export function estadoOfertaBadgeClass(estado: EstadoOferta): string {
  if (estado === "Activa") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (estado === "Programada") return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
  if (estado === "Vencida") return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}
