"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { Producto } from "@/types";

export function ProductoCombobox({
  productos,
  value,
  onChange,
}: {
  productos: Producto[];
  value: string;
  onChange: (productoId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = productos.find((producto) => String(producto.id) === value) ?? null;
  const opciones = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? productos.filter(
          (producto) =>
            producto.nombre.toLowerCase().includes(q) ||
            (producto.variantes?.some((variante) => variante.sku.toLowerCase().includes(q)) ?? false) ||
            ((producto as Producto & { sku?: string }).sku?.toLowerCase().includes(q) ?? false),
        )
      : productos;
    return list.slice(0, 12);
  }, [productos, query]);

  return (
    <div className="relative">
      <Input
        value={open ? query : (selected?.nombre ?? query)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(selected?.nombre ?? query);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Buscar producto por nombre o SKU"
        aria-label="Buscar producto"
        autoComplete="off"
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {opciones.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No hay coincidencias.</li>
          ) : (
            opciones.map((producto) => (
              <li key={producto.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(String(producto.id));
                    setQuery(producto.nombre);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-medium text-slate-900">{producto.nombre}</span>
                  <span className="text-xs text-slate-500">
                    {producto.variantes?.[0]?.sku ?? (producto as Producto & { sku?: string }).sku ?? "Sin SKU"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
