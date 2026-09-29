"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { slugify } from "@/lib/slug";
import { searchProductosGrupos } from "@/services/productos";
import type { ProductoGrupo } from "@/types";

const DEBOUNCE_MS = 250;

export function GrupoVariantesCombobox({
  value,
  nombreProducto,
  onChange,
}: {
  value: string;
  nombreProducto: string;
  onChange: (grupoId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState<ProductoGrupo[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");

  const previewSource = query.trim() || nombreProducto.trim();
  const previewSlug = slugify(previewSource);
  const selectedNombre = selectedLabel || value;
  const puedeCrear = Boolean(previewSlug) && !opciones.some((grupo) => grupo.grupo_id === previewSlug);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void searchProductosGrupos(debouncedQuery)
      .then((items) => {
        if (cancelled) return;
        setOpciones(items);
        if (value) {
          const match = items.find((item) => item.grupo_id === value);
          if (match) setSelectedLabel(match.nombre);
        }
      })
      .catch(() => {
        if (!cancelled) setOpciones([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  const selectGrupo = (grupo: ProductoGrupo) => {
    onChange(grupo.grupo_id);
    setSelectedLabel(grupo.nombre);
    setQuery(grupo.nombre);
    setOpen(false);
  };

  const crearGrupo = () => {
    if (!previewSlug) return;
    selectGrupo({ grupo_id: previewSlug, nombre: previewSource || previewSlug });
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 font-medium"
          value={open ? query : selectedNombre}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(query || selectedNombre);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Buscar grupo existente o crear uno nuevo"
          aria-label="Grupo de variantes"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>
      {value && !open ? (
        <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
          {value}
        </span>
      ) : null}
      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && opciones.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Buscando grupos...
            </li>
          ) : opciones.length === 0 && !puedeCrear ? (
            <li className="px-3 py-2 text-sm text-slate-500">No hay grupos que coincidan.</li>
          ) : (
            opciones.map((grupo) => (
              <li key={grupo.grupo_id} role="option" aria-selected={grupo.grupo_id === value}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectGrupo(grupo)}
                >
                  <span className="text-sm font-medium text-slate-900">{grupo.nombre}</span>
                  <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                    {grupo.grupo_id}
                  </span>
                </button>
              </li>
            ))
          )}
          {puedeCrear ? (
            <li className="border-t border-slate-100">
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-emerald-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={crearGrupo}
              >
                <Plus className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-primary">+ Crear nuevo grupo</span>
                  <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                    {previewSlug}
                  </span>
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
