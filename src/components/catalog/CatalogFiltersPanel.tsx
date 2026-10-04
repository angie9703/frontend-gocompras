"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { CATALOG_ORDEN_OPTIONS, parseMarcaIds, type CatalogQueryState } from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import type { Categoria, Marca } from "@/types";

interface CatalogFiltersPanelProps {
  query: CatalogQueryState;
  categorias: Categoria[];
  categoriasLoading?: boolean;
  marcas: Marca[];
  marcasLoading?: boolean;
  showOrden?: boolean;
  onChange: (patch: Partial<CatalogQueryState>) => void;
}

export function CatalogFiltersPanel({
  query,
  categorias,
  categoriasLoading = false,
  marcas,
  marcasLoading = false,
  showOrden = false,
  onChange,
}: CatalogFiltersPanelProps) {
  const todosActive = !query.categoria && !query.categoriaId && !query.subcategoria;
  const marcaGroupName = useId();
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [marcasExpandidas, setMarcasExpandidas] = useState(false);
  const marcasSeleccionadas = parseMarcaIds(query.marcaId);
  const marcasVisibles = (() => {
    if (marcasExpandidas || marcas.length <= 6) return marcas;
    const iniciales = marcas.slice(0, 6);
    const visibles = new Set(iniciales.map((marca) => marca.id));
    const seleccionadasOcultas = marcas.filter(
      (marca) => marcasSeleccionadas.includes(String(marca.id)) && !visibles.has(marca.id),
    );
    return [...iniciales, ...seleccionadasOcultas];
  })();

  return (
    <div className="relative z-10 grid gap-6 pointer-events-auto">
      {showOrden ? (
        <fieldset className="relative z-10">
          <legend className="text-sm font-semibold text-main">Ordenar</legend>
          <select
            value={query.orden}
            onChange={(event) => onChange({ orden: event.target.value })}
            className={cn(
              "relative z-10 mt-2 min-h-11 w-full touch-manipulation rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-main",
              "pointer-events-auto focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
            )}
            aria-label="Ordenar productos"
          >
            {CATALOG_ORDEN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </fieldset>
      ) : null}

      <fieldset className="relative z-10">
        <legend className="text-sm font-semibold text-main">Categoría</legend>
        <div className="relative z-10 mt-2 grid gap-1">
          <FilterOption
            active={todosActive}
            onClick={() => onChange({ categoria: "", categoriaId: "", subcategoria: "" })}
          >
            Todas
          </FilterOption>
          {categoriasLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <span key={index} className="h-10 animate-pulse rounded-lg bg-slate-200" />
              ))
            : categorias.map((categoria) => {
                const categoryActive =
                  !query.subcategoria &&
                  (query.categoria === categoria.slug ||
                    (query.categoriaId !== "" && String(categoria.id) === query.categoriaId));
                const hijas = categoria.subcategorias ?? [];
                const tieneHijaActiva = hijas.some((nombre) => nombre === query.subcategoria);
                const expandida =
                  abiertas[categoria.slug] ?? (categoryActive || tieneHijaActiva);
                return (
                  <div key={`${categoria.id}-${categoria.slug}`}>
                    <div className="flex items-stretch gap-1">
                      <FilterOption
                        active={categoryActive}
                        onClick={() => {
                          const mismaCategoria =
                            query.categoria === categoria.slug ||
                            (categoria.id > 0 && query.categoriaId === String(categoria.id));
                          onChange({
                            categoria: categoria.slug,
                            categoriaId: categoria.id > 0 ? String(categoria.id) : "",
                            subcategoria: "",
                            ...(mismaCategoria ? {} : { marcaId: "" }),
                          });
                        }}
                      >
                        {categoria.nombre}
                      </FilterOption>
                      {hijas.length > 0 ? (
                        <button
                          type="button"
                          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-main hover:bg-primary/5"
                          aria-expanded={expandida}
                          aria-label={`${expandida ? "Ocultar" : "Ver"} subcategorías de ${categoria.nombre}`}
                          onClick={() =>
                            setAbiertas((current) => ({
                              ...current,
                              [categoria.slug]: !expandida,
                            }))
                          }
                        >
                          <ChevronDown
                            className={cn("size-4 transition-transform", expandida ? "rotate-180" : "")}
                          />
                        </button>
                      ) : null}
                    </div>
                    {expandida && hijas.length > 0 ? (
                      <div className="mt-1 ml-3 grid gap-1 border-l border-slate-200 pl-2">
                        {hijas.map((nombre) => {
                          const subActive = query.subcategoria === nombre;
                          return (
                            <FilterOption
                              key={nombre}
                              active={subActive}
                              onClick={() =>
                                onChange({
                                  categoria: categoria.slug,
                                  categoriaId: categoria.id > 0 ? String(categoria.id) : "",
                                  subcategoria: nombre,
                                })
                              }
                            >
                              {nombre}
                            </FilterOption>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-main">Marca</legend>
        <div className="mt-2 grid gap-1.5">
          {marcasLoading ? (
            Array.from({ length: 4 }, (_, index) => (
              <span key={index} className="h-9 animate-pulse rounded-lg bg-slate-200" />
            ))
          ) : (
            <>
              <label
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-main transition-colors",
                  marcasSeleccionadas.length === 0 ? "bg-primary/10 text-primary" : "hover:bg-primary/5",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={marcasSeleccionadas.length === 0}
                  onChange={() => onChange({ marcaId: "" })}
                />
                Todas las marcas
              </label>
              <div
                className={cn(
                  "grid gap-1.5",
                  marcasExpandidas && marcas.length > 6 && "max-h-64 overflow-y-auto pr-1",
                )}
              >
                {marcasVisibles.map((marca) => {
                  const value = String(marca.id);
                  const active = marca.id > 0 && marcasSeleccionadas.includes(value);
                  return (
                    <label
                      key={marca.id}
                      className={cn(
                        "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-main transition-colors",
                        active ? "bg-primary/10 text-primary" : "hover:bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={active}
                        onChange={() => {
                          if (marca.id <= 0) return;
                          const next = active
                            ? marcasSeleccionadas.filter((id) => id !== value)
                            : [...marcasSeleccionadas, value];
                          onChange({ marcaId: next.join(",") });
                        }}
                      />
                      {marca.nombre}
                    </label>
                  );
                })}
              </div>
              {marcas.length > 6 ? (
                <button
                  type="button"
                  className="min-h-9 px-2 text-left text-sm font-semibold text-primary hover:underline"
                  aria-expanded={marcasExpandidas}
                  onClick={() => setMarcasExpandidas((current) => !current)}
                >
                  {marcasExpandidas ? "Mostrar menos" : `Mostrar más (${marcas.length - 6})`}
                </button>
              ) : null}
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="relative z-10">
        <legend className="text-sm font-semibold text-main">Rango de precio</legend>
        <div className="relative z-10 mt-2 grid grid-cols-2 gap-2">
          <div className="flex w-full min-w-0 flex-col gap-1">
            <label htmlFor={`${marcaGroupName}-precio-min`} className="text-xs text-muted">
              Mínimo
            </label>
            <input
              id={`${marcaGroupName}-precio-min`}
              type="number"
              inputMode="numeric"
              min={0}
              value={query.precioMin}
              onChange={(event) => onChange({ precioMin: event.target.value })}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="$ 0"
              className="relative z-10 min-h-11 w-full min-w-0 touch-manipulation rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-main pointer-events-auto focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1">
            <label htmlFor={`${marcaGroupName}-precio-max`} className="text-xs text-muted">
              Máximo
            </label>
            <input
              id={`${marcaGroupName}-precio-max`}
              type="number"
              inputMode="numeric"
              min={0}
              value={query.precioMax}
              onChange={(event) => onChange({ precioMax: event.target.value })}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="$ —"
              className="relative z-10 min-h-11 w-full min-w-0 touch-manipulation rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-main pointer-events-auto focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </fieldset>

      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-main">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={query.enStock}
          onChange={(event) => onChange({ enStock: event.target.checked })}
        />
        Solo en Stock
      </label>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-main">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={query.ofertas}
          onChange={(event) => onChange({ ofertas: event.target.checked })}
        />
        Solo ofertas
      </label>
    </div>
  );
}

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative z-10 min-h-11 min-w-0 flex-1 touch-manipulation rounded-lg px-3 text-left text-sm font-medium transition-colors pointer-events-auto",
        active
          ? "bg-primary text-white"
          : "bg-white text-main hover:bg-primary/5 hover:text-primary",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
