"use client";

import { FileText } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  adminCardClass,
  badgeEstadoClass,
  ESTADO_ADMIN_LABEL,
  labelAccionEstado,
  TIPO_ENTREGA_ADMIN,
} from "@/lib/adminUi";
import { formatARS } from "@/lib/money";
import { descargarPdfPresupuesto } from "@/services/pedidos";
import type { Pedido } from "@/types";

export function PedidoDetalleModal({
  pedido,
  onClose,
  onAvanzar,
  avanzando,
  onSelectCliente,
}: {
  pedido: Pedido;
  onClose: () => void;
  onAvanzar?: () => void;
  avanzando?: boolean;
  onSelectCliente?: (clienteId: string | number) => void;
}) {
  const dialogTitleId = useId();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accion = labelAccionEstado(pedido.estado);

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className={`relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto ${adminCardClass} p-6`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id={dialogTitleId} className="text-lg font-semibold text-slate-900">
              Detalle del pedido {pedido.codigo}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{new Date(pedido.createdAt).toLocaleString("es-AR")}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeEstadoClass(pedido.estado)}`}>
            {ESTADO_ADMIN_LABEL[pedido.estado] ?? pedido.estado}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Cliente</p>
            {onSelectCliente ? (
              <button
                type="button"
                className="mt-1 cursor-pointer text-left font-medium text-primary hover:underline"
                aria-label={`Ver ficha de ${pedido.cliente.nombre ?? "cliente"}`}
                onClick={() => onSelectCliente(pedido.cliente.id ?? 0)}
              >
                {pedido.cliente.nombre ?? "Sin nombre"}
              </button>
            ) : (
              <p className="mt-1 font-medium text-slate-900">{pedido.cliente.nombre ?? "Sin nombre"}</p>
            )}
            <p className="text-sm text-slate-600">{pedido.cliente.telefonoWhatsapp}</p>
            {pedido.cliente.email ? <p className="text-sm text-slate-600">{pedido.cliente.email}</p> : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Entrega</p>
            <p className="mt-1 font-medium text-slate-900">
              {TIPO_ENTREGA_ADMIN[pedido.envio.tipoEntrega] ?? pedido.envio.tipoEntrega}
            </p>
            <p className="text-sm text-slate-600">{pedido.envio.barrioLocalidad ?? "Sin zona"}</p>
            <p className="text-sm text-slate-600">{pedido.envio.puntoReferencia ?? "Sin referencia"}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-900">Productos</p>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {pedido.items.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">Este movimiento no tiene ítems cargados.</li>
            ) : (
              pedido.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.productoNombre}</p>
                    <p className="text-xs text-slate-500">
                      {item.sku} · {item.cantidad} u.
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">{formatARS(Number(item.subtotal))}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatARS(Number(pedido.total))}</span>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-accent">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {onAvanzar && accion ? (
            <Button variant="subtle" onClick={onAvanzar} loading={avanzando}>
              {accion}
            </Button>
          ) : null}
          <Button variant="dark" onClick={() => void descargar()} loading={downloading}>
            <FileText className="size-4" aria-hidden />
            Descargar comprobante PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
