"use client";

import { Ban, EllipsisVertical, Eye, MessageCircle, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { ClienteFichaModal } from "@/components/admin/ClienteFichaModal";
import {
  PedidoDetalleModal,
  PedidoEstadoBadge,
  pedidoWhatsAppHref,
  puedeCancelarPedido,
  puedeEliminarPedido,
} from "@/components/admin/PedidoDetalleModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminTableHeadClass,
  adminTableRowClass,
  esPedidoConcretado,
  esPresupuestoAdmin,
  labelAccionEstado,
  SIGUIENTE_ESTADO,
  tabClass,
} from "@/lib/adminUi";
import { cn } from "@/lib/cn";
import { formatWhatsAppDisplay } from "@/lib/comercio";
import { formatARS } from "@/lib/money";
import {
  deleteAdminPedido,
  getAdminCliente,
  listAdminClientes,
  listAdminPedidos,
  updateAdminPedidoEstado,
} from "@/services/admin";
import type { AdminCliente, EstadoPedido, Pedido } from "@/types";

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

function tipoMovimiento(pedido: Pedido): string {
  return pedido.estado === "PENDIENTE_PAGO" ? "presupuesto" : "pedido";
}

type MenuAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

const MENU_WIDTH = 208;
const MENU_ITEM_HEIGHT = 40;

function RowActionsMenu({ label, actions, disabled }: { label: string; actions: MenuAction[]; disabled?: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  const toggle = () => {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = actions.length * MENU_ITEM_HEIGHT + 12;
    const openUp = rect.bottom + height + 8 > window.innerHeight;
    setPosition({
      top: openUp ? rect.top - height - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();

    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
      >
        <EllipsisVertical className="size-4" aria-hidden />
      </button>
      {position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              className="fixed z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors focus:outline-none",
                    action.danger
                      ? "text-red-600 hover:bg-red-50 focus:bg-red-50"
                      : "text-slate-700 hover:bg-slate-100 focus:bg-slate-100",
                  )}
                  onClick={() => {
                    setPosition(null);
                    action.onSelect();
                  }}
                >
                  <action.icon className="size-4 shrink-0" aria-hidden />
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function WhatsAppQuickLink({ pedido }: { pedido: Pedido }) {
  const href = pedidoWhatsAppHref(pedido);
  if (!href) {
    return (
      <span
        className="inline-flex size-9 cursor-not-allowed items-center justify-center rounded-lg text-slate-300"
        title="El cliente no tiene un WhatsApp válido"
      >
        <MessageCircle className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 transition-colors ring-inset hover:bg-emerald-100 hover:text-emerald-700"
      aria-label={`Escribir por WhatsApp a ${pedido.cliente.nombre ?? "cliente"} (${pedido.codigo})`}
      title="Escribir por WhatsApp"
    >
      <MessageCircle className="size-4" aria-hidden />
    </a>
  );
}

export function PedidosView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PedidoTab>("todos");
  const [items, setItems] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [ficha, setFicha] = useState<AdminCliente | null>(null);
  const [busy, setBusy] = useState<{ id: number; action: "avanzar" | "cancelar" } | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async (search = query) => {
    const result = await listAdminPedidos({ q: search.trim() || undefined, pageSize: 100 });
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

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const visibles = useMemo(() => items.filter((pedido) => matchesTab(pedido, tab)), [items, tab]);

  const conteos = useMemo(() => {
    const result = {} as Record<PedidoTab, number>;
    for (const item of TABS) result[item.id] = items.filter((pedido) => matchesTab(pedido, item.id)).length;
    return result;
  }, [items]);

  const cambiarEstado = async (
    pedido: Pedido,
    estado: EstadoPedido,
    action: "avanzar" | "cancelar",
    mensajeOk: string,
  ) => {
    setBusy({ id: pedido.id, action });
    setError(null);
    try {
      await updateAdminPedidoEstado(pedido.id, estado);
      setItems((prev) => prev.map((item) => (item.id === pedido.id ? { ...item, estado } : item)));
      setSelected((current) => (current?.id === pedido.id ? { ...current, estado } : current));
      setNotice(mensajeOk);
      void reload().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setBusy(null);
    }
  };

  const avanzar = (pedido: Pedido) => {
    const next = SIGUIENTE_ESTADO[pedido.estado];
    if (!next) return;
    const mensaje =
      pedido.estado === "PENDIENTE_PAGO"
        ? `${pedido.codigo} confirmado como pedido.`
        : `${pedido.codigo} actualizado.`;
    void cambiarEstado(pedido, next, "avanzar", mensaje);
  };

  const cancelar = (pedido: Pedido) => {
    const mensaje = `${pedido.codigo} cancelado. Lo encontrás en la pestaña "Cancelados".`;
    void cambiarEstado(pedido, "CANCELADO", "cancelar", mensaje);
  };

  const pedirEliminar = (pedido: Pedido) => {
    setDeleteError(null);
    setToDelete(pedido);
  };

  const confirmarEliminar = async () => {
    if (!toDelete) return;
    const pedido = toDelete;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAdminPedido(pedido.id);
      setItems((prev) => prev.filter((item) => item.id !== pedido.id));
      setSelected((current) => (current?.id === pedido.id ? null : current));
      setToDelete(null);
      setNotice(`${pedido.codigo} eliminado.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar el presupuesto.");
    } finally {
      setDeleting(false);
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

  const menuActions = (pedido: Pedido): MenuAction[] => {
    const tipo = tipoMovimiento(pedido);
    const actions: MenuAction[] = [{ label: "Ver detalle", icon: Eye, onSelect: () => setSelected(pedido) }];
    if (puedeCancelarPedido(pedido.estado)) {
      actions.push({ label: `Cancelar ${tipo}`, icon: Ban, onSelect: () => cancelar(pedido) });
    }
    if (puedeEliminarPedido(pedido.estado)) {
      actions.push({ label: "Eliminar", icon: Trash2, onSelect: () => pedirEliminar(pedido), danger: true });
    }
    return actions;
  };

  const renderAcciones = (pedido: Pedido, compact = false) => {
    const accion = labelAccionEstado(pedido.estado);
    const rowBusy = busy?.id === pedido.id;
    return (
      <div className={cn("flex items-center gap-1.5", compact ? "w-full" : "justify-end")}>
        {accion ? (
          <Button
            variant="subtle"
            className={cn("min-h-9 px-3 text-xs", compact && "flex-1")}
            loading={rowBusy && busy?.action === "avanzar"}
            disabled={rowBusy}
            onClick={() => avanzar(pedido)}
          >
            {accion}
          </Button>
        ) : compact ? (
          <span className="flex-1" />
        ) : null}
        <WhatsAppQuickLink pedido={pedido} />
        <RowActionsMenu
          label={`Más acciones para ${pedido.codigo}`}
          actions={menuActions(pedido)}
          disabled={rowBusy}
        />
      </div>
    );
  };

  const fecha = (pedido: Pedido) => new Date(pedido.createdAt).toLocaleDateString("es-AR");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Pedidos y presupuestos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtrá por estado, contactá al cliente por WhatsApp y abrí el detalle para ver productos, entrega y PDF.
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filtro por estado">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(tabClass(tab === item.id), "inline-flex shrink-0 items-center gap-2")}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {!loading ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  tab === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {conteos[item.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por código, cliente o teléfono"
        aria-label="Buscar pedidos"
      />

      {error && !selected ? (
        <p className="text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={`${adminCardClass} px-4 py-6 text-sm text-slate-500`}>Cargando pedidos...</p>
      ) : visibles.length === 0 ? (
        <p className={`${adminCardClass} px-4 py-6 text-sm text-slate-500`}>No hay movimientos para este filtro.</p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {visibles.map((pedido) => (
              <li key={pedido.id} className={`${adminCardClass} p-4`}>
                <button type="button" className="block w-full text-left" onClick={() => setSelected(pedido)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-600">{pedido.codigo}</span>
                    <PedidoEstadoBadge estado={pedido.estado} />
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{pedido.cliente.nombre ?? "Sin nombre"}</p>
                      <p className="text-xs text-slate-500">
                        {formatWhatsAppDisplay(pedido.cliente.telefonoWhatsapp)} · {fecha(pedido)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-900">{formatARS(Number(pedido.total))}</span>
                  </div>
                </button>
                <div className="mt-3 border-t border-slate-100 pt-3">{renderAcciones(pedido, true)}</div>
              </li>
            ))}
          </ul>

          <div className={`${adminCardClass} hidden overflow-x-auto md:block`}>
            <table className="min-w-full text-left text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3 text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className={`${adminTableRowClass} cursor-pointer`}
                    onClick={() => setSelected(pedido)}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">{pedido.codigo}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{pedido.cliente.nombre ?? "Sin nombre"}</p>
                      <p className="text-xs text-slate-500">{formatWhatsAppDisplay(pedido.cliente.telefonoWhatsapp)}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 tabular-nums">
                      {formatARS(Number(pedido.total))}
                    </td>
                    <td className="px-3 py-2.5">
                      <PedidoEstadoBadge estado={pedido.estado} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{fecha(pedido)}</td>
                    <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                      {renderAcciones(pedido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected ? (
        <PedidoDetalleModal
          pedido={selected}
          onClose={() => {
            setSelected(null);
            setError(null);
          }}
          onAvanzar={() => avanzar(selected)}
          avanzando={busy?.id === selected.id && busy.action === "avanzar"}
          onCancelar={() => cancelar(selected)}
          cancelando={busy?.id === selected.id && busy.action === "cancelar"}
          onEliminar={() => pedirEliminar(selected)}
          onSelectCliente={(clienteId) => void openClienteFicha(clienteId)}
          actionError={error}
        />
      ) : null}

      {ficha ? (
        <ClienteFichaModal
          cliente={ficha}
          onClose={() => setFicha(null)}
          onUpdated={(updated) => setFicha(updated)}
        />
      ) : null}

      {toDelete ? (
        <AlertDialog
          title={`¿Eliminar este ${tipoMovimiento(toDelete)} permanentemente?`}
          description={`Se eliminará ${toDelete.codigo} de ${toDelete.cliente.nombre ?? "este cliente"}.${
            esPedidoConcretado(toDelete.estado) ? " El stock descontado vuelve al inventario." : ""
          } Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Volver"
          loading={deleting}
          error={deleteError}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmarEliminar()}
        />
      ) : null}

      {notice ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg sm:inset-x-auto sm:right-6"
        >
          {notice}
        </div>
      ) : null}
    </div>
  );
}
