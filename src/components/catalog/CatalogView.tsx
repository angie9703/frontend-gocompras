"use client";

import axios from "axios";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CatalogFiltersPanel } from "@/components/catalog/CatalogFiltersPanel";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/ui/Button";
import {
  getActiveVariantes,
  marcasDesdeProductos,
  productoCoincideCategoria,
  productoCoincideMarca,
  productoCoincideSubcategoria,
  productoEnRangoPrecio,
  productoTieneStock,
} from "@/lib/catalog";
import { tienePrecioOferta } from "@/lib/pricing";
import {
  CATALOG_ORDEN_OPTIONS,
  type CatalogQueryState,
  buildCatalogPath,
  catalogStateToPath,
  clearCatalogFiltersPath,
  countActiveCatalogFilters,
  hasActiveCatalogFilters,
  readCatalogQuery,
} from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/lib/useHasMounted";
import { getCategorias } from "@/services/categorias";
import { getMarcas } from "@/services/marcas";
import { getProductos } from "@/services/productos";
import type { ApiErrorResponse, Categoria, Marca, Producto } from "@/types";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data && data.success === false) return data.error.message;
    if (error.code === "ERR_NETWORK") {
      return "No pudimos conectar con el servidor. Verificá que el backend esté en marcha.";
    }
  }
  return "Ocurrió un error al cargar el catálogo.";
}

function applyClientFilters(productos: Producto[], query: CatalogQueryState): Producto[] {
  return productos.filter((producto) => {
    if (!productoCoincideCategoria(producto, query.categoria, query.categoriaId)) return false;
    if (!productoCoincideSubcategoria(producto, query.subcategoria)) return false;
    if (!productoCoincideMarca(producto, query.marcaId)) return false;
    if (query.enStock && !productoTieneStock(producto)) return false;
    if (query.ofertas && !getActiveVariantes(producto).some((variante) => tienePrecioOferta(variante))) return false;
    if (!productoEnRangoPrecio(producto, query.precioMin, query.precioMax)) return false;
    return true;
  });
}

const PAGE_SIZE = 12;

function useMarcasCatalogo(categoria: string, categoriaId: string, enabled = true) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    const tieneCategoria = Boolean(categoria.trim() || categoriaId.trim());

    const marcasRequest = getMarcas(
      tieneCategoria
        ? {
            categoria: categoria || undefined,
            categoriaId: categoriaId || undefined,
          }
        : undefined,
    );

    const productosRequest = tieneCategoria
      ? getProductos({
          categoria: categoria || undefined,
          categoriaId: categoriaId || undefined,
          pageSize: 100,
        }).catch(() => null)
      : Promise.resolve(null);

    void Promise.all([marcasRequest, productosRequest])
      .then(([apiMarcas, productosResp]) => {
        if (cancelled) return;
        if (!tieneCategoria || !productosResp) {
          setMarcas(apiMarcas);
          return;
        }

        const enCategoria = productosResp.data.filter((producto) =>
          productoCoincideCategoria(producto, categoria, categoriaId),
        );
        const derivadas = marcasDesdeProductos(enCategoria);
        setMarcas(derivadas.length > 0 ? derivadas : apiMarcas);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoria, categoriaId, enabled]);

  return { marcas, loading };
}

export function CatalogFallback() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden h-80 animate-pulse rounded-xl bg-white lg:block" />
        <ProductGrid productos={[]} loading />
      </div>
    </section>
  );
}

export function CatalogView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useHasMounted();
  const query = readCatalogQuery(searchParams);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogQueryState>(query);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void getCategorias()
      .then((items) => {
        if (!cancelled) setCategorias(items);
      })
      .finally(() => {
        if (!cancelled) setCategoriasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const marcasCatalogo = useMarcasCatalogo(query.categoria, query.categoriaId);
  const marcas = marcasCatalogo.marcas;
  const marcasLoading = marcasCatalogo.loading;
  const categoriaDraftDistinta =
    drawerOpen &&
    (draft.categoria !== query.categoria || draft.categoriaId !== query.categoriaId);
  const marcasDrawer = useMarcasCatalogo(
    categoriaDraftDistinta ? draft.categoria : query.categoria,
    categoriaDraftDistinta ? draft.categoriaId : query.categoriaId,
    categoriaDraftDistinta,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);

    getProductos({
      busqueda: query.q || undefined,
      categoria: query.categoria || undefined,
      categoriaId: query.categoriaId || undefined,
      subcategoria: query.subcategoria || undefined,
      marcaId: query.marcaId || undefined,
      orden: query.orden,
      enStock: query.enStock || undefined,
      ofertas: query.ofertas || undefined,
      pageSize: 48,
    })
      .then((response) => {
        if (cancelled) return;
        const items = query.q.trim()
          ? response.data
          : applyClientFilters(response.data, query);
        setProductos(items);
        const metaTotal = response.meta?.total;
        const apiTotal = typeof metaTotal === "number" ? metaTotal : response.data.length;
        setTotal(query.q.trim() || items.length === response.data.length ? apiTotal : items.length);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProductos([]);
        setTotal(0);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    query.q,
    query.categoria,
    query.categoriaId,
    query.subcategoria,
    query.marcaId,
    query.orden,
    query.enStock,
    query.ofertas,
    query.precioMin,
    query.precioMax,
    reloadToken,
  ]);

  useEffect(() => {
    if (marcasLoading) return;
    if (!query.categoria && !query.categoriaId) return;
    if (!query.marcaId) return;
    const hayMarcasReales = marcas.some((marca) => marca.id > 0);
    if (!hayMarcasReales) return;
    if (marcas.some((marca) => String(marca.id) === query.marcaId)) return;
    router.replace(buildCatalogPath(searchParams, { marcaId: "" }), { scroll: false });
  }, [
    marcas,
    marcasLoading,
    query.categoria,
    query.categoriaId,
    query.marcaId,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const filtersActive = hasActiveCatalogFilters(query);
  const activeCount = countActiveCatalogFilters(query);
  const categoriaActiva = useMemo(
    () =>
      categorias.find(
        (item) =>
          item.slug === query.categoria ||
          (query.categoriaId && String(item.id) === query.categoriaId),
      ),
    [categorias, query.categoria, query.categoriaId],
  );
  const marcaActiva = useMemo(
    () => marcas.find((marca) => String(marca.id) === query.marcaId),
    [marcas, query.marcaId],
  );

  const pushQuery = (next: CatalogQueryState) => {
    router.push(catalogStateToPath(next), { scroll: false });
  };

  const patchUrl = (patch: Partial<CatalogQueryState>) => {
    router.push(buildCatalogPath(searchParams, patch), { scroll: false });
  };

  const totalPages = Math.max(Math.ceil(productos.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pagedProductos = useMemo(
    () => productos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [productos, currentPage],
  );
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  interface ActiveChip {
    key: string;
    label: string;
    onRemove: () => void;
  }

  const activeChips: ActiveChip[] = [];
  if (categoriaActiva) {
    activeChips.push({
      key: "categoria",
      label: `Categoría: ${categoriaActiva.nombre}`,
      onRemove: () => patchUrl({ categoria: "", categoriaId: "", subcategoria: "" }),
    });
  }
  if (query.subcategoria) {
    activeChips.push({
      key: "subcategoria",
      label: `Subcategoría: ${query.subcategoria}`,
      onRemove: () => patchUrl({ subcategoria: "" }),
    });
  }
  if (marcaActiva) {
    activeChips.push({
      key: "marca",
      label: `Marca: ${marcaActiva.nombre}`,
      onRemove: () => patchUrl({ marcaId: "" }),
    });
  }
  if (query.precioMin || query.precioMax) {
    const min = query.precioMin || "0";
    const max = query.precioMax || "∞";
    activeChips.push({
      key: "precio",
      label: `Precio: $${min} - $${max}`,
      onRemove: () => patchUrl({ precioMin: "", precioMax: "" }),
    });
  }
  if (query.enStock) {
    activeChips.push({
      key: "stock",
      label: "Solo en stock",
      onRemove: () => patchUrl({ enStock: false }),
    });
  }
  if (query.ofertas) {
    activeChips.push({
      key: "ofertas",
      label: "En oferta",
      onRemove: () => patchUrl({ ofertas: false }),
    });
  }

  const title = query.q ? "Resultados de búsqueda" : "Catálogo";
  const subtitle = query.q
    ? `Coincidencias para "${query.q}".`
    : query.subcategoria
      ? `Filtrado por ${query.subcategoria}.`
      : categoriaActiva
        ? `Filtrado por ${categoriaActiva.nombre}.`
        : "Filtrá por categoría, precio y stock para armar tu pedido.";

  if (!hasMounted) {
    return <CatalogFallback />;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 md:py-10">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          {!loading && !error ? (
            <p className="mt-2 text-sm font-medium text-muted">
              {total} {total === 1 ? "producto encontrado" : "productos encontrados"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => {
              setDraft(query);
              setDrawerOpen(true);
            }}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtrar y Ordenar
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-white">
                {activeCount}
              </span>
            ) : null}
          </Button>
          {filtersActive ? (
            <Link
              href={clearCatalogFiltersPath()}
              scroll={false}
              className="btn-touch hidden items-center px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 lg:inline-flex"
            >
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      </header>

      {activeChips.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              {chip.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="product-card hidden h-fit p-4 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-main uppercase">Filtros</h2>
            {filtersActive ? (
              <Link href={clearCatalogFiltersPath()} scroll={false} className="text-xs font-semibold text-primary hover:underline">
                Limpiar
              </Link>
            ) : null}
          </div>
          <CatalogFiltersPanel
            query={query}
            categorias={categorias}
            categoriasLoading={categoriasLoading}
            marcas={marcas}
            marcasLoading={marcasLoading}
            onChange={(patch) => patchUrl(patch)}
          />
        </aside>

        <div>
          <div className="mb-4 hidden items-center justify-end lg:flex">
            <label className="flex items-center gap-2 text-sm font-medium text-main">
              <span className="text-muted">Ordenar</span>
              <select
                value={query.orden}
                onChange={(event) => patchUrl({ orden: event.target.value })}
                className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Ordenar productos"
              >
                {CATALOG_ORDEN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
              <p className="font-semibold text-main">No se pudo cargar el catálogo</p>
              <p className="mt-2 text-sm text-muted">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <ProductGrid
                productos={pagedProductos}
                loading={loading}
                className="lg:grid-cols-3"
              />

              {!loading && totalPages > 1 ? (
                <nav
                  aria-label="Paginación de resultados"
                  className="mt-8 flex flex-wrap items-center justify-center gap-2"
                >
                  <Button
                    variant="outline"
                    className="min-w-11 px-3"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {pageNumbers.map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => setPage(number)}
                        aria-current={number === currentPage ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                          number === currentPage
                            ? "bg-primary text-white"
                            : "text-main hover:bg-primary/10",
                        )}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="min-w-11 px-3"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Página siguiente"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          tabIndex={drawerOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 z-0 bg-slate-950/40 transition-opacity",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Cerrar filtros"
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-filters-title"
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 flex max-h-[88vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-300",
            "pointer-events-auto touch-manipulation",
            drawerOpen ? "translate-y-0" : "translate-y-full",
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative z-10 flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 id="catalog-filters-title" className="text-base font-semibold text-main">
              Filtrar y Ordenar
            </h2>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-primary hover:bg-primary/5"
              aria-label="Cerrar"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <CatalogFiltersPanel
              query={draft}
              categorias={categorias}
              categoriasLoading={categoriasLoading}
              marcas={categoriaDraftDistinta ? marcasDrawer.marcas : marcas}
              marcasLoading={categoriaDraftDistinta ? marcasDrawer.loading : marcasLoading}
              showOrden
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            />
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3">
            <Button
              variant="outline"
              onClick={() => {
                setDraft(readCatalogQuery(new URLSearchParams()));
                router.push(clearCatalogFiltersPath(), { scroll: false });
                setDrawerOpen(false);
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                pushQuery(draft);
                setDrawerOpen(false);
              }}
            >
              Ver resultados
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
