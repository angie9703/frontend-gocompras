"use client";

import {
  Ban,
  Bot,
  CircleCheck,
  CreditCard,
  FileDown,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  StickyNote,
  Trash2,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { labelMetodoPago } from "@/components/checkout/MetodoPagoSelector";
import { ESTADO_ADMIN_LABEL, labelAccionEstado, TIPO_ENTREGA_ADMIN } from "@/lib/adminUi";
import { cn } from "@/lib/cn";
import { formatWhatsAppDisplay, getWhatsAppHref } from "@/lib/comercio";
import { formatARS } from "@/lib/money";
import { descargarPdfPresupuesto } from "@/services/pedidos";
import type { EstadoPedido, Pedido } from "@/types";

const ESTADO_BADGE: Record<EstadoPedido, { badge: string; dot: string }> = {
  PENDIENTE_PAGO: { badge: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-400" },
  PAGADO: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  EN_PREPARACION: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  ENVIADO: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  ENTREGADO: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  CANCELADO: { badge: "bg-slate-100 text-slate-500 ring-slate-200", dot: "bg-red-400" },
};

const ESTADOS_CANCELABLES = new Set<EstadoPedido>(["PENDIENTE_PAGO", "PAGADO", "EN_PREPARACION"]);

// El backend rechaza eliminar pedidos ya despachados (409 PEDIDO_NO_ELIMINABLE).
const ESTADOS_NO_ELIMINABLES = new Set<EstadoPedido>(["ENVIADO", "ENTREGADO"]);

export function puedeCancelarPedido(estado: EstadoPedido): boolean {
  return ESTADOS_CANCELABLES.has(estado);
}

export function puedeEliminarPedido(estado: EstadoPedido): boolean {
  return !ESTADOS_NO_ELIMINABLES.has(estado);
}

export function pedidoWhatsAppHref(pedido: Pedido): string | null {
  const nombre = pedido.cliente.nombre?.trim().split(/\s+/)[0];
  const tipo = pedido.estado === "PENDIENTE_PAGO" ? "presupuesto" : "pedido";
  const saludo = nombre ? `Hola ${nombre}` : "Hola";
  return getWhatsAppHref(
    pedido.cliente.telefonoWhatsapp,
    `${saludo}, te contacto por tu ${tipo} ${pedido.codigo} de Go Compras.`,
  );
}

export function PedidoEstadoBadge({ estado, className }: { estado: EstadoPedido; className?: string }) {
  const tone = ESTADO_BADGE[estado] ?? ESTADO_BADGE.PENDIENTE_PAGO;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
      {ESTADO_ADMIN_LABEL[estado] ?? estado}
    </span>
  );
}

const footerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const sectionTitleClass = "text-xs font-semibold tracking-wide text-slate-500 uppercase";

function envioResumen(pedido: Pedido): string {
  const { envio } = pedido;
  if (envio.montoAplicado === null) return "A confirmar";
  if (Number(envio.montoAplicado) === 0) return envio.bonificado ? "Bonificado" : "Sin cargo";
  return formatARS(Number(envio.montoAplicado));
}

function metodoPagoResumen(pedido: Pedido): string {
  const metodo = pedido.metodoPago ?? pedido.pago?.metodo;
  if (!metodo) return "A coordinar";
  const label = labelMetodoPago(metodo);
  return label === metodo ? "A coordinar" : label;
}

function iniciales(nombre: string | null): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function PedidoDetalleModal({
  pedido,
  onClose,
  onAvanzar,
  avanzando,
  onCancelar,
  cancelando,
  onEliminar,
  onSelectCliente,
  actionError,
}: {
  pedido: Pedido;
  onClose: () => void;
  onAvanzar?: () => void;
  avanzando?: boolean;
  onCancelar?: () => void;
  cancelando?: boolean;
  onEliminar?: () => void;
  onSelectCliente?: (clienteId: string | number) => void;
  actionError?: string | null;
}) {
  const dialogTitleId = useId();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accion = labelAccionEstado(pedido.estado);
  const esPresupuesto = pedido.estado === "PENDIENTE_PAGO";
  const whatsappHref = pedidoWhatsAppHref(pedido);
  const ocupado = Boolean(avanzando || cancelando);
  const totalFinal = Number(pedido.totalConEnvio ?? pedido.total);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const descargar = async () => {
    setDownloading(true);
    setError(null);
    try {
      await descargarPdfPresupuesto(pedido.codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={dialogTitleId} className="text-lg font-semibold text-slate-900">
                {esPresupuesto ? "Presupuesto" : "Pedido"} <span className="font-mono">{pedido.codigo}</span>
              </h3>
              <PedidoEstadoBadge estado={pedido.estado} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {new Date(pedido.createdAt).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto px-5 py-5 sm:px-6 md:grid-cols-2">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-4">
              <p className={sectionTitleClass}>Cliente</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {iniciales(pedido.cliente.nombre)}
                </span>
                <div className="min-w-0">
                  {onSelectCliente ? (
                    <button
                      type="button"
                      className="truncate text-left font-semibold text-primary hover:underline"
                      aria-label={`Ver ficha de ${pedido.cliente.nombre ?? "cliente"}`}
                      onClick={() => onSelectCliente(pedido.cliente.id ?? 0)}
                    >
                      {pedido.cliente.nombre ?? "Sin nombre"}
                    </button>
                  ) : (
                    <p className="truncate font-semibold text-slate-900">{pedido.cliente.nombre ?? "Sin nombre"}</p>
                  )}
                  <p className="text-sm text-slate-500">
                    {formatWhatsAppDisplay(pedido.cliente.telefonoWhatsapp) || "Sin teléfono"}
                  </p>
                </div>
              </div>
              {pedido.cliente.email ? (
                <a
                  href={`mailto:${pedido.cliente.email}`}
                  className="mt-3 flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{pedido.cliente.email}</span>
                </a>
              ) : null}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition-colors ring-inset hover:bg-emerald-100"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Escribir por WhatsApp
                </a>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <p className={sectionTitleClass}>Entrega y pago</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <Truck className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="font-medium text-slate-900">
                    {TIPO_ENTREGA_ADMIN[pedido.envio.tipoEntrega] ?? pedido.envio.tipoEntrega}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="text-slate-600">{pedido.envio.barrioLocalidad ?? "Zona sin especificar"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="text-slate-600">{metodoPagoResumen(pedido)}</span>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <p className={sectionTitleClass}>Notas y aclaraciones</p>
              <div className="mt-3 space-y-2.5 text-sm">
                {pedido.envio.puntoReferencia ? (
                  <p className="flex items-start gap-2 text-slate-700">
                    <StickyNote className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="whitespace-pre-line">{pedido.envio.puntoReferencia}</span>
                  </p>
                ) : (
                  <p className="text-slate-400">El comprador no dejó aclaraciones.</p>
                )}
                {pedido.envio.bonificado && pedido.envio.motivoBonificacion ? (
                  <p className="text-slate-600">Envío bonificado: {pedido.envio.motivoBonificacion}</p>
                ) : null}
                {pedido.requiereAtencionHumana ? (
                  <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 font-medium text-amber-800">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    Requiere atención de un vendedor
                  </p>
                ) : null}
                {pedido.creadoPorIa ? (
                  <p className="flex items-center gap-2 text-slate-500">
                    <Bot className="size-4 shrink-0" aria-hidden />
                    Creado por el asistente de WhatsApp
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <div className="flex min-h-0 flex-col">
            <p className={sectionTitleClass}>
              Productos <span className="text-slate-400">({pedido.items.length})</span>
            </p>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 md:max-h-[22rem] md:overflow-y-auto">
              {pedido.items.length === 0 ? (
                <li className="px-3 py-4 text-sm text-slate-500">Este movimiento no tiene ítems cargados.</li>
              ) : (
                pedido.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt="" className="size-full object-contain" loading="lazy" />
                      ) : (
                        <Package className="size-5 text-slate-300" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-snug font-medium text-slate-900">
                        {item.productoNombre}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{item.sku}</span> · {item.cantidad} ×{" "}
                        {formatARS(Number(item.precioUnitario))}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatARS(Number(item.subtotal))}
                    </span>
                  </li>
                ))
              )}
            </ul>

            <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Productos</dt>
                <dd className="font-medium text-slate-800">{formatARS(Number(pedido.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Envío</dt>
                <dd className="font-medium text-slate-800">{envioResumen(pedido)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="text-xl font-bold text-slate-900">{formatARS(totalFinal)}</dd>
              </div>
              {pedido.totalConEnvio === null ? (
                <p className="text-right text-xs text-slate-500">+ envío a confirmar</p>
              ) : null}
            </dl>
          </div>
        </div>

        <footer className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          {error || actionError ? (
            <p className="mb-3 text-sm font-medium text-accent" role="alert">
              {error ?? actionError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onEliminar && puedeEliminarPedido(pedido.estado) ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 sm:size-11 sm:px-0"
                aria-label={`Eliminar ${esPresupuesto ? "presupuesto" : "pedido"} ${pedido.codigo}`}
                title="Eliminar permanentemente"
                disabled={ocupado}
                onClick={onEliminar}
              >
                <Trash2 className="size-4" aria-hidden />
                <span className="sm:hidden">Eliminar</span>
              </button>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
              <button
                type="button"
                className={cn(
                  footerButtonClass,
                  "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
                )}
                disabled={downloading}
                onClick={() => void descargar()}
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="size-4" aria-hidden />
                )}
                Descargar PDF
              </button>

              {onCancelar && puedeCancelarPedido(pedido.estado) ? (
                <button
                  type="button"
                  className={cn(
                    footerButtonClass,
                    "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-400",
                  )}
                  disabled={ocupado}
                  onClick={onCancelar}
                >
                  {cancelando ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Ban className="size-4" aria-hidden />
                  )}
                  {esPresupuesto ? "Cancelar presupuesto" : "Cancelar pedido"}
                </button>
              ) : null}

              {onAvanzar && accion ? (
                <button
                  type="button"
                  className={cn(
                    footerButtonClass,
                    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500",
                  )}
                  disabled={ocupado}
                  onClick={onAvanzar}
                >
                  {avanzando ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CircleCheck className="size-4" aria-hidden />
                  )}
                  {accion}
                </button>
              ) : null}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
