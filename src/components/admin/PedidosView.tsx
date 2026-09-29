"use client";

import { useEffect, useMemo, useState } from "react";
import { ClienteFichaModal } from "@/components/admin/ClienteFichaModal";
import { PedidoDetalleModal } from "@/components/admin/PedidoDetalleModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminTableHeadClass,
  adminTableRowClass,
  badgeEstadoClass,
  esPedidoConcretado,
  esPresupuestoAdmin,
  ESTADO_ADMIN_LABEL,
  labelAccionEstado,
  SIGUIENTE_ESTADO,
  tabClass,
} from "@/lib/adminUi";
import { formatARS } from "@/lib/money";
import { getAdminCliente, listAdminClientes, listAdminPedidos, updateAdminPedidoEstado } from "@/services/admin";
import type { AdminCliente, Pedido } from "@/types";

type PedidoTab = "todos" | "pedidos" | "presupuestos" | "entregados" | "cancelados";

const TABS: Array<{ id: PedidoTab; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "pedidos", label: "Pedidos" },
  { id: "presupuestos", label: "Presupuestos" },
  { id: "entregados", label: "Entregados" },
  { id: "cancelados", label: "Cancelados" },
];

function matchesTab(pedido: Pedido, tab: PedidoTab): boolean {
  if (tab === "todos") return true;
  if (tab === "presupuestos") return esPresupuestoAdmin(pedido.estado);
  if (tab === "entregados") return pedido.estado === "ENTREGADO";
  if (tab === "cancelados") return pedido.estado === "CANCELADO";
  return esPedidoConcretado(pedido.estado);
}

export function PedidosView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PedidoTab>("todos");
  const [items, setItems] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [ficha, setFicha] = useState<AdminCliente | null>(null);

  const reload = async (search = query) => {
    const result = await listAdminPedidos({ q: search.trim() || undefined, pageSize: 50 });
    setItems(result.items);
    setSelected((current) => (current ? (result.items.find((item) => item.id === current.id) ?? current) : null));
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void reload(query)
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const visibles = useMemo(() => items.filter((pedido) => matchesTab(pedido, tab)), [items, tab]);

  const avanzar = async (pedido: Pedido) => {
    const next = SIGUIENTE_ESTADO[pedido.estado];
    if (!next) return;
    setError(null);
    try {
      await updateAdminPedidoEstado(pedido.id, next);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    }
  };

  const openClienteFicha = async (clienteId: string | number) => {
    const fromPedido = selected;
    const parsedId = Number(clienteId);
    setSelected(null);
    setError(null);
    try {
      if (Number.isFinite(parsedId) && parsedId > 0) {
        setFicha(await getAdminCliente(parsedId));
        return;
      }
      const queryCliente = fromPedido?.cliente.telefonoWhatsapp || fromPedido?.cliente.email || "";
      const result = await listAdminClientes({ q: queryCliente || undefined, pageSize: 10 });
      const match =
        result.items.find((item) => item.telefonoWhatsapp === fromPedido?.cliente.telefonoWhatsapp) ??
        result.items.find((item) => item.email && item.email === fromPedido?.cliente.email) ??
        result.items[0];
      if (!match) {
        setError("No se encontró la ficha de este cliente.");
        return;
      }
      setFicha(await getAdminCliente(match.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la ficha del cliente.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Pedidos y presupuestos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtrá por estado y abrí el detalle para ver productos, entrega y PDF.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro por estado">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tabClass(tab === item.id)}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por código, cliente o teléfono"
        aria-label="Buscar pedidos"
      />

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-3 py-3">Código</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={6}>
                  Cargando pedidos...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={6}>
                  No hay movimientos para este filtro.
                </td>
              </tr>
            ) : (
              visibles.map((pedido) => (
                <tr
                  key={pedido.id}
                  className={`${adminTableRowClass} cursor-pointer`}
                  onClick={() => setSelected(pedido)}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">{pedido.codigo}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-900">{pedido.cliente.nombre ?? "Sin nombre"}</p>
                    <p className="text-xs text-slate-500">{pedido.cliente.telefonoWhatsapp}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">{formatARS(Number(pedido.total))}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeEstadoClass(pedido.estado)}`}>
                      {ESTADO_ADMIN_LABEL[pedido.estado] ?? pedido.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {new Date(pedido.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-3 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                    {labelAccionEstado(pedido.estado) ? (
                      <Button variant="subtle" className="min-h-9 px-3 text-xs" onClick={() => void avanzar(pedido)}>
                        {labelAccionEstado(pedido.estado)}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <PedidoDetalleModal
          pedido={selected}
          onClose={() => setSelected(null)}
          onAvanzar={() => void avanzar(selected)}
          onSelectCliente={(clienteId) => void openClienteFicha(clienteId)}
        />
      ) : null}

      {ficha ? (
        <ClienteFichaModal
          cliente={ficha}
          onClose={() => setFicha(null)}
          onUpdated={(updated) => setFicha(updated)}
        />
      ) : null}
    </div>
  );
}
