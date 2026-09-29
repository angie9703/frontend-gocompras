"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ClienteFichaModal } from "@/components/admin/ClienteFichaModal";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminTableHeadClass,
  adminTableRowClass,
  avatarToneClass,
  categoriaCrm,
  categoriaCrmBadgeClass,
  initialsFromName,
} from "@/lib/adminUi";
import { getWhatsAppHref } from "@/lib/comercio";
import { formatARS } from "@/lib/money";
import { getAdminCliente, listAdminClientes } from "@/services/admin";
import type { AdminCliente } from "@/types";

export function ClientesView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminCliente | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void listAdminClientes({ q: query.trim() || undefined, pageSize: 30 })
        .then((result) => setItems(result.items))
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const openFicha = async (cliente: AdminCliente) => {
    setSelected(cliente);
    try {
      setSelected(await getAdminCliente(cliente.id));
    } catch {
      // Mantiene los datos de la fila si el detalle falla.
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Clientes / CRM</h2>
        <p className="mt-1 text-sm text-slate-500">
          Buscá por nombre o teléfono. Abrí la ficha para ver el perfil, la dirección y el historial de pedidos.
        </p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por teléfono, nombre o email"
        aria-label="Buscar clientes"
      />

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Teléfono</th>
              <th className="px-5 py-3">Categoría</th>
              <th className="px-5 py-3">Pedidos</th>
              <th className="px-5 py-3">Total gastado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={5}>
                  Cargando clientes...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={5}>
                  No hay clientes para esa búsqueda.
                </td>
              </tr>
            ) : (
              items.map((cliente) => {
                const categoria = categoriaCrm(cliente);
                const initials = initialsFromName(cliente.nombre, cliente.telefonoWhatsapp.slice(-2) || "CL");
                const whatsappHref = getWhatsAppHref(cliente.telefonoWhatsapp);
                return (
                  <tr
                    key={cliente.id}
                    className={`${adminTableRowClass} cursor-pointer`}
                    onClick={() => void openFicha(cliente)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarToneClass(String(cliente.id))}`}
                        >
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{cliente.nombre ?? "Sin nombre"}</p>
                          <p className="truncate text-xs text-slate-500">{cliente.email ?? "Sin email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MessageCircle className="size-3.5" aria-hidden />
                          {cliente.telefonoWhatsapp}
                        </a>
                      ) : (
                        <span className="text-slate-700">{cliente.telefonoWhatsapp}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoriaCrmBadgeClass(categoria)}`}>
                        {categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{cliente.totalPedidos}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {formatARS(Number(cliente.totalGastado ?? 0))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <ClienteFichaModal
          cliente={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(updated);
            setItems((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
          }}
        />
      ) : null}
    </div>
  );
}
