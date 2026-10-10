"use client";

import axios from "axios";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CatalogFiltersPanel } from "@/components/catalog/CatalogFiltersPanel";
import { CatalogRubrosSlider } from "@/components/catalog/CatalogRubrosSlider";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/ui/Button";
import {
  getActiveVariantes,
  getProductoImagen,
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
  parseMarcaIds,
  readCatalogQuery,
} from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/lib/useHasMounted";
import { getCategorias, getCategoriasDestacadas } from "@/services/categorias";
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

function imagenesPorSubcategoria(productos: Producto[]): Record<string, string> {
  const imagenes: Record<string, string> = {};
  for (const producto of productos) {
    const clave = producto.subcategoria?.trim().toLowerCase();
    if (!clave || imagenes[clave]) continue;
    const imagen = getProductoImagen(producto, getActiveVariantes(producto)[0]);
    if (imagen) imagenes[clave] = imagen;
  }
  return imagenes;
}

function useMarcasCatalogo(categoria: string, categoriaId: string, enabled = true) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [imagenesSubcategoria, setImagenesSubcategoria] = useState<Record<string, string>>({});
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
          pageSize: 50,
        }).catch(() => null)
      : Promise.resolve(null);

    void Promise.all([marcasRequest, productosRequest])
      .then(([apiMarcas, productosResp]) => {
        if (cancelled) return;
        if (!tieneCategoria || !productosResp) {
          setMarcas(apiMarcas);
          setImagenesSubcategoria({});
          return;
        }

        const enCategoria = productosResp.data.filter((producto) =>
          productoCoincideCategoria(producto, categoria, categoriaId),
        );
        const derivadas = marcasDesdeProductos(enCategoria);
        setMarcas(derivadas.length > 0 ? derivadas : apiMarcas);
        setImagenesSubcategoria(imagenesPorSubcategoria(enCategoria));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoria, categoriaId, enabled]);

  return { marcas, imagenesSubcategoria, loading };
}

export function CatalogFallback() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 pb-20 md:pt-6 md:pb-10">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-slate-200" />
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
  const [imagenesCategoria, setImagenesCategoria] = useState<Record<number, string>>({});
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
    void getCategoriasDestacadas()
      .then((items) => {
        if (cancelled) return;
        const imagenes: Record<number, string> = {};
        for (const item of items) {
          if (item.imagenUrl) imagenes[item.id] = item.imagenUrl;
        }
        setImagenesCategoria(imagenes);
      })
      .catch(() => undefined);
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

    const marcaIds = parseMarcaIds(query.marcaId);

    getProductos({
      busqueda: query.q || undefined,
      categoria: query.categoria || undefined,
      categoriaId: query.categoriaId || undefined,
      subcategoria: query.subcategoria || undefined,
      marcaId: marcaIds.length === 1 ? marcaIds[0] : undefined,
      orden: query.orden,
      enStock: query.enStock || undefined,
      ofertas: query.ofertas || undefined,
      pageSize: 48,
    })
      .then((response) => {
        if (cancelled) return;
        const items = query.q.trim()
          ? response.data.filter((producto) => productoCoincideMarca(producto, query.marcaId))
          : applyClientFilters(response.data, query);
        setProductos(items);
        const metaTotal = response.meta?.total;
        const apiTotal = typeof metaTotal === "number" ? metaTotal : response.data.length;
        setTotal(query.q.trim() && items.length === response.data.length ? apiTotal : items.length);
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
    const marcaIds = parseMarcaIds(query.marcaId);
    if (marcaIds.length === 0) return;
    const hayMarcasReales = marcas.some((marca) => marca.id > 0);
    if (!hayMarcasReales) return;
    const validas = marcaIds.filter((id) => marcas.some((marca) => String(marca.id) === id));
    if (validas.length === marcaIds.length) return;
    router.replace(buildCatalogPath(searchParams, { marcaId: validas.join(",") }), { scroll: false });
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
  const marcasActivas = useMemo(() => {
    const ids = new Set(parseMarcaIds(query.marcaId));
    return marcas.filter((marca) => ids.has(String(marca.id)));
  }, [marcas, query.marcaId]);

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

  const filtrosActivos: { key: string; tipo: string; valor: string }[] = [];
  if (query.subcategoria) {
    filtrosActivos.push({ key: "subcategoria", tipo: "Subcategoría", valor: query.subcategoria });
  } else if (categoriaActiva) {
    filtrosActivos.push({ key: "categoria", tipo: "Categoría", valor: categoriaActiva.nombre });
  }
  if (marcasActivas.length > 0) {
    filtrosActivos.push({
      key: "marca",
      tipo: marcasActivas.length === 1 ? "Marca" : "Marcas",
      valor: marcasActivas.map((marca) => marca.nombre).join(", "),
    });
  }
  if (query.precioMin || query.precioMax) {
    filtrosActivos.push({
      key: "precio",
      tipo: "Precio",
      valor: `$${query.precioMin || "0"} - $${query.precioMax || "∞"}`,
    });
  }
  if (query.enStock) filtrosActivos.push({ key: "stock", tipo: "Stock", valor: "Solo en stock" });
  if (query.ofertas) filtrosActivos.push({ key: "ofertas", tipo: "Ofertas", valor: "En oferta" });

  const title = query.q ? `Resultados para "${query.q}"` : "Catálogo";

  if (!hasMounted) {
    return <CatalogFallback />;
  }

  const ordenSelect = (className: string) => (
    <select
      value={query.orden}
      onChange={(event) => patchUrl({ orden: event.target.value })}
      className={cn(
        "rounded-lg border border-slate-300 px-3 text-sm text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
        className,
      )}
      aria-label="Ordenar productos"
    >
      {CATALOG_ORDEN_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 pb-20 md:pt-6 md:pb-10">
      <header className="mb-2 flex items-end justify-between gap-3 lg:mb-4">
        <div className="flex min-w-0 items-end">
          <h1 className="truncate text-2xl font-bold text-main md:text-3xl">{title}</h1>
          {!loading && !error ? (
            <span className="mb-1 ml-3 shrink-0 self-end text-xs text-slate-500 sm:text-sm">
              {total} {total === 1 ? "producto encontrado" : "productos encontrados"}
            </span>
          ) : null}
        </div>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted">Ordenar</span>
            {ordenSelect("min-h-10 bg-slate-50")}
          </label>
        </div>
      </header>

      <CatalogRubrosSlider
        query={query}
        categorias={categorias}
        categoriaActiva={categoriaActiva}
        imagenesCategoria={imagenesCategoria}
        imagenesSubcategoria={marcasCatalogo.imagenesSubcategoria}
        loading={categoriasLoading}
        onChange={(patch) => patchUrl(patch)}
      />

      <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setDraft(query);
            setDrawerOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 touch-manipulation items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-main hover:bg-primary/5"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros
          {activeCount > 0 ? (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
        {ordenSelect("min-h-10 min-w-0 max-w-[60%] bg-white")}
      </div>

      {filtrosActivos.length > 0 ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs">
          <p className="min-w-0 truncate font-normal text-slate-600">
            {filtrosActivos.map((filtro, index) => (
              <span key={filtro.key}>
                {index > 0 ? <span className="mx-1.5 text-slate-300">·</span> : null}
                {filtro.tipo}: <span className="font-semibold text-slate-900">{filtro.valor}</span>
              </span>
            ))}
          </p>
          <button
            type="button"
            onClick={() => router.push(clearCatalogFiltersPath(), { scroll: false })}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-300"
          >
            <X className="size-3" aria-hidden />
            {filtrosActivos.length > 1 ? "Limpiar filtros" : "Limpiar filtro"}
          </button>
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
                className="lg:grid-cols-3 xl:grid-cols-4"
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
              Filtros
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
