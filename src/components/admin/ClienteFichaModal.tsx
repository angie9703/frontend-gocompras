"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { PedidoDetalleModal } from "@/components/admin/PedidoDetalleModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminFieldClass,
  adminTableHeadClass,
  adminTableRowClass,
  avatarToneClass,
  badgeEstadoClass,
  categoriaCrm,
  categoriaCrmBadgeClass,
  ESTADO_ADMIN_LABEL,
  esPedidoConcretado,
  initialsFromName,
  SIGUIENTE_ESTADO,
  textareaClass,
} from "@/lib/adminUi";
import { getWhatsAppHref } from "@/lib/comercio";
import {
  formatDireccionCliente,
  parseDireccionCliente,
  serializeDireccionCliente,
} from "@/lib/direccionCliente";
import { formatARS } from "@/lib/money";
import { updateAdminCliente, updateAdminPedidoEstado } from "@/services/admin";
import type { AdminCliente, Pedido } from "@/types";

function transaccionesDe(cliente: AdminCliente): Pedido[] {
  const pedidos = cliente.historial?.pedidos ?? [];
  const presupuestos = cliente.historial?.presupuestos ?? [];
  return [...pedidos, ...presupuestos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function ClienteFichaModal({
  cliente,
  onClose,
  onUpdated,
}: {
  cliente: AdminCliente;
  onClose: () => void;
  onUpdated: (cliente: AdminCliente) => void;
}) {
  const dialogTitleId = useId();
  const parsedDireccion = parseDireccionCliente(cliente.direccion);
  const [editing, setEditing] = useState(false);
  const [telefono, setTelefono] = useState(cliente.telefonoWhatsapp);
  const [direccion, setDireccion] = useState(parsedDireccion.direccion);
  const [localidad, setLocalidad] = useState(parsedDireccion.localidad);
  const [notas, setNotas] = useState(cliente.notasInternas ?? cliente.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [updatingPedido, setUpdatingPedido] = useState(false);

  useEffect(() => {
    const next = parseDireccionCliente(cliente.direccion);
    setTelefono(cliente.telefonoWhatsapp);
    setDireccion(next.direccion);
    setLocalidad(next.localidad);
    setNotas(cliente.notasInternas ?? cliente.notas ?? "");
  }, [cliente]);

  const resumen = useMemo(() => {
    const gastado = Number(cliente.totalGastado ?? 0);
    const concretados = (cliente.historial?.pedidos ?? []).filter((pedido) => esPedidoConcretado(pedido.estado));
    const cantidad = concretados.length || cliente.totalPedidos || 0;
    const promedio = cantidad > 0 ? gastado / cantidad : 0;
    return {
      categoria: categoriaCrm(cliente),
      gastado,
      promedio,
      cantidad,
      movimientos: transaccionesDe(cliente),
    };
  }, [cliente]);

  const initials = initialsFromName(cliente.nombre, cliente.telefonoWhatsapp.slice(-2) || "CL");
  const whatsappHref = getWhatsAppHref(cliente.telefonoWhatsapp);

  const startEdit = () => {
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    const next = parseDireccionCliente(cliente.direccion);
    setTelefono(cliente.telefonoWhatsapp);
    setDireccion(next.direccion);
    setLocalidad(next.localidad);
    setNotas(cliente.notasInternas ?? cliente.notas ?? "");
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminCliente(cliente.id, {
        telefonoWhatsapp: telefono.trim(),
        direccion: serializeDireccionCliente({
          direccion,
          localidad,
          codigoPostal: parsedDireccion.codigoPostal,
        }),
        notas,
        notasInternas: notas,
      });
      onUpdated({ ...cliente, ...updated, historial: cliente.historial });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  };

  const avanzar = async (pedido: Pedido) => {
    setUpdatingPedido(true);
    setError(null);
    try {
      const next = SIGUIENTE_ESTADO[pedido.estado];
      if (!next) return;
      const updated = await updateAdminPedidoEstado(pedido.id, next);
      setSelectedPedido(updated);
      const historial = cliente.historial;
      if (!historial) return;
      onUpdated({
        ...cliente,
        historial: {
          pedidos: historial.pedidos.map((item) => (item.id === updated.id ? updated : item)),
          presupuestos: historial.presupuestos?.map((item) => (item.id === updated.id ? updated : item)),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el pedido.");
    } finally {
      setUpdatingPedido(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Cerrar ficha" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className={`relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto ${adminCardClass} p-6`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={`inline-flex size-14 shrink-0 items-center justify-center rounded-full text-base font-bold ${avatarToneClass(String(cliente.id))}`}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={dialogTitleId} className="text-lg font-semibold text-slate-900">
                  {cliente.nombre ?? "Cliente"}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoriaCrmBadgeClass(resumen.categoria)}`}>
                  {resumen.categoria}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">{cliente.email ?? "Sin email"}</p>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                >
                  <MessageCircle className="size-3.5" aria-hidden />
                  {cliente.telefonoWhatsapp}
                </a>
              ) : (
                <p className="mt-1 text-sm text-slate-600">{cliente.telefonoWhatsapp}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Total gastado</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatARS(resumen.gastado)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ticket promedio</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatARS(resumen.promedio)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Cantidad de pedidos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.cantidad}</p>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-900">Datos personales y de envío</h4>
              <p className="mt-0.5 text-xs text-slate-500">Dirección, localidad, teléfono y notas internas del vendedor.</p>
            </div>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" className="min-h-9 px-3 text-xs" onClick={cancelEdit}>
                  Cancelar
                </Button>
                <Button variant="dark" className="min-h-9 px-3 text-xs" onClick={() => void save()} loading={saving}>
                  Guardar cambios
                </Button>
              </div>
            ) : (
              <Button variant="subtle" className="min-h-9 px-3 text-xs" onClick={startEdit}>
                Editar
              </Button>
            )}
          </div>

          {editing ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={adminFieldClass}>
                Teléfono / WhatsApp
                <Input className="mt-1" value={telefono} onChange={(event) => setTelefono(event.target.value)} />
              </label>
              <label className={adminFieldClass}>
                Localidad
                <Input
                  className="mt-1"
                  value={localidad}
                  onChange={(event) => setLocalidad(event.target.value)}
                  placeholder="Barrio o localidad"
                />
              </label>
              <label className={`${adminFieldClass} sm:col-span-2`}>
                Dirección de envío
                <Input
                  className="mt-1"
                  value={direccion}
                  onChange={(event) => setDireccion(event.target.value)}
                  placeholder="Calle y número"
                />
              </label>
              <label className={`${adminFieldClass} sm:col-span-2`}>
                Notas internas del vendedor
                <textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  rows={3}
                  placeholder="Preferencias, obra, forma de pago habitual..."
                  className={`${textareaClass} mt-1 min-h-24 bg-slate-50`}
                />
              </label>
            </div>
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Teléfono</dt>
                <dd className="mt-1 text-sm text-slate-900">{cliente.telefonoWhatsapp}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Localidad</dt>
                <dd className="mt-1 text-sm text-slate-900">{parsedDireccion.localidad || "Sin localidad"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Dirección de envío</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatDireccionCliente(cliente.direccion)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Notas internas</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-slate-700">
                  {(cliente.notasInternas ?? cliente.notas)?.trim() || "Sin notas internas."}
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section className="mt-6">
          <h4 className="font-semibold text-slate-900">Historial de transacciones</h4>
          <p className="mt-0.5 text-xs text-slate-500">Hacé clic en un pedido para abrir el detalle.</p>
          {resumen.movimientos.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.movimientos.map((pedido) => (
                    <tr
                      key={`${pedido.codigo}-${pedido.id}`}
                      className={`${adminTableRowClass} cursor-pointer`}
                      onClick={() => setSelectedPedido(pedido)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{pedido.codigo}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(pedido.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeEstadoClass(pedido.estado)}`}>
                          {ESTADO_ADMIN_LABEL[pedido.estado] ?? pedido.estado.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{formatARS(Number(pedido.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Todavía no hay transacciones registradas.
            </p>
          )}
        </section>

        {error ? <p className="mt-4 text-sm font-medium text-accent">{error}</p> : null}
      </div>

      {selectedPedido ? (
        <PedidoDetalleModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onAvanzar={() => void avanzar(selectedPedido)}
          avanzando={updatingPedido}
        />
      ) : null}
    </div>
  );
}
