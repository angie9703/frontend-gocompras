"use client";

import { Clock3, ShoppingBag, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { PedidoDetalleModal } from "@/components/admin/PedidoDetalleModal";
import {
  adminCardClass,
  adminTableHeadClass,
  adminTableRowClass,
  badgeEstadoClass,
  esPedidoConcretado,
  esPresupuestoAdmin,
  ESTADO_ADMIN_LABEL,
  SIGUIENTE_ESTADO,
  tabClass,
} from "@/lib/adminUi";
import { formatARS } from "@/lib/money";
import { listAdminPedidos, listAdminProductos, updateAdminPedidoEstado } from "@/services/admin";
import type { Pedido, Producto } from "@/types";

function stockDe(producto: Producto): number {
  if (!Array.isArray(producto.variantes)) {
    return Number((producto as Producto & { stock?: number }).stock ?? 0);
  }
  return producto.variantes.reduce((sum, variante) => sum + (variante.stockDisponible ?? variante.stock ?? 0), 0);
}

type DatePreset = "hoy" | "7d" | "mes" | "custom";

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function rangeForPreset(preset: DatePreset, customFrom: string, customTo: string): { from: Date; to: Date } {
  const to = endOfToday();
  if (preset === "hoy") return { from: startOfDay(new Date()), to };
  if (preset === "7d") {
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (preset === "mes") {
    return { from: new Date(to.getFullYear(), to.getMonth(), 1, 0, 0, 0, 0), to };
  }
  const from = customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : startOfDay(new Date());
  const customEnd = customTo ? new Date(`${customTo}T23:59:59`) : to;
  return { from, to: customEnd };
}

export function DashboardView() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [alertas, setAlertas] = useState<Array<{ producto: Producto; stock: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [preset, setPreset] = useState<DatePreset>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [updating, setUpdating] = useState(false);

  const range = useMemo(() => rangeForPreset(preset, customFrom, customTo), [customFrom, customTo, preset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      listAdminPedidos({
        pageSize: 100,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }),
      listAdminProductos({ pageSize: 100 }),
    ])
      .then(([nextPedidos, nextProductos]) => {
        if (cancelled) return;
        setPedidos(nextPedidos.items);
        setAlertas(
          nextProductos.items
            .map((producto) => ({ producto, stock: stockDe(producto) }))
            .filter((item) => item.stock <= 4)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 8),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const concretados = pedidos.filter((pedido) => esPedidoConcretado(pedido.estado));
  const ventasTotales = concretados.reduce((sum, pedido) => sum + Number(pedido.total), 0);
  const presupuestosPendientes = pedidos.filter((pedido) => esPresupuestoAdmin(pedido.estado)).length;
  const clientesActivos = new Set(concretados.map((pedido) => pedido.cliente.id ?? pedido.cliente.telefonoWhatsapp)).size;
  const recientes = pedidos.slice(0, 12);

  const avanzar = async (pedido: Pedido) => {
    setUpdating(true);
    setError(null);
    try {
      const next = SIGUIENTE_ESTADO[pedido.estado];
      if (!next) return;
      await updateAdminPedidoEstado(pedido.id, next);
      const refreshed = await listAdminPedidos({
        pageSize: 100,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      setPedidos(refreshed.items);
      setSelected((current) => (current ? (refreshed.items.find((item) => item.id === current.id) ?? current) : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard / Resumen</h2>
          <p className="mt-1 text-sm text-slate-500">Indicadores del período seleccionado: ventas, pedidos y stock.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {(
            [
              ["hoy", "Hoy"],
              ["7d", "Últimos 7 días"],
              ["mes", "Este mes"],
              ["custom", "Personalizado"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={tabClass(preset === id)} onClick={() => setPreset(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Desde
            <input
              type="date"
              className="mt-1 block min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Hasta
            <input
              type="date"
              className="mt-1 block min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas totales"
          value={loading ? "…" : formatARS(ventasTotales)}
          hint={loading ? "Cargando..." : `${concretados.length} pedidos confirmados`}
          icon={<Wallet className="size-4" aria-hidden />}
          tone="emerald"
        />
        <KpiCard
          label="Pedidos totales"
          value={loading ? "…" : String(concretados.length)}
          hint={loading ? "Cargando..." : `${presupuestosPendientes} por confirmar`}
          icon={<ShoppingBag className="size-4" aria-hidden />}
          tone="blue"
        />
        <KpiCard
          label="Clientes activos"
          value={loading ? "…" : String(clientesActivos)}
          hint="Con compras en el período"
          icon={<Users className="size-4" aria-hidden />}
          tone="violet"
        />
        <KpiCard
          label="Presupuestos pendientes"
          value={loading ? "…" : String(presupuestosPendientes)}
          hint={loading ? "Cargando..." : `${alertas.length} productos con stock igual o menor a 4`}
          icon={<Clock3 className="size-4" aria-hidden />}
          tone="amber"
        />
      </div>

      <section className={`${adminCardClass} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Últimos pedidos recibidos</h3>
          <Link href="/admin/pedidos" className="text-xs font-semibold text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className="px-5 py-2.5">Código</th>
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">Total</th>
                <th className="px-5 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={4}>
                    Cargando...
                  </td>
                </tr>
              ) : recientes.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={4}>
                    No hay pedidos en este período.
                  </td>
                </tr>
              ) : (
                recientes.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className={`${adminTableRowClass} cursor-pointer`}
                    onClick={() => setSelected(pedido)}
                  >
                    <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-700">{pedido.codigo}</td>
                    <td className="px-5 py-2.5 text-slate-800">{pedido.cliente.nombre ?? "Sin nombre"}</td>
                    <td className="px-5 py-2.5 text-slate-800">{formatARS(Number(pedido.total))}</td>
                    <td className="px-5 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeEstadoClass(pedido.estado)}`}>
                        {ESTADO_ADMIN_LABEL[pedido.estado] ?? pedido.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${adminCardClass} p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900">Alertas de stock bajo</h3>
          <Link href="/admin/productos" className="text-xs font-semibold text-primary hover:underline">
            Ir a inventario
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {loading ? (
            <li className="py-6 text-sm text-slate-500">Cargando...</li>
          ) : alertas.length === 0 ? (
            <li className="py-6 text-sm text-slate-500">No hay productos con stock igual o menor a 4.</li>
          ) : (
            alertas.map(({ producto, stock }) => (
              <li key={producto.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{producto.nombre}</p>
                  <p className="text-xs text-slate-500">{producto.variantes[0]?.sku ?? "Sin SKU"}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    stock === 0 ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {stock === 0 ? "Sin stock" : `${stock} u.`}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {selected ? (
        <PedidoDetalleModal
          pedido={selected}
          onClose={() => setSelected(null)}
          onAvanzar={() => void avanzar(selected)}
          avanzando={updating}
        />
      ) : null}
    </div>
  );
}

type KpiTone = "emerald" | "blue" | "violet" | "amber";

const KPI_TONE_CLASSES: Record<KpiTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
};

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: KpiTone;
}) {
  return (
    <article className={`${adminCardClass} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${KPI_TONE_CLASSES[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}
