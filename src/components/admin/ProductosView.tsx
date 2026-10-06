"use client";

import { Boxes, ImageOff, MoreVertical, Package, PackagePlus, Pencil, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { CargaMasivaView } from "@/components/admin/CargaMasivaView";
import { ProductoEditorDrawer } from "@/components/admin/ProductoEditorDrawer";
import { AdminDropdownItem, AdminDropdownMenu, AdminIconButton, AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminFieldClass,
  adminTableHeadClass,
  adminTableRowClass,
  selectClass,
  stockBadge,
} from "@/lib/adminUi";
import { formatARS } from "@/lib/money";
import {
  bulkInlineUpdateAdminProductos,
  bulkUpdateAdminProductos,
  deleteAdminProducto,
  deleteAdminProductosMasivo,
  getAdminCategorias,
  listAdminInventario,
  listAdminMarcas,
  listMarcasCatalogo,
  toggleDestacadoAdminProducto,
  updateAdminVariante,
  type InlinePendingChange,
  type InventarioFila,
  type InventarioListMeta,
} from "@/services/admin";
import { getProductoById } from "@/services/productos";
import type { Categoria, Marca, Producto } from "@/types";

type StockFilter = "todos" | "sin_stock" | "poco_stock" | "activos";
type SortKey = "nombre_asc" | "precio_desc" | "precio_asc" | "stock_desc" | "stock_asc";
type EditingMode = "none" | "precio" | "stock";
type PendingChanges = Record<number, InlinePendingChange>;

function sameNumber(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}

function cellInputClass(dirty: boolean): string {
  return `h-9 w-28 rounded-md border px-2 text-sm text-slate-900 outline-none ${
    dirty ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"
  }`;
}

function MasterCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 rounded border-slate-300 text-slate-900 accent-slate-900"
      checked={checked}
      aria-label={label}
      onChange={onChange}
    />
  );
}

const MEDIDA_RE = /\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*mm|\d+(?:[.,]\d+)?\s*mm/gi;

function compacto(value: string): string {
  return value.toLowerCase().replace(/[\s._-]+/g, "");
}

function medidaCanonica(value: string): string | null {
  const match = value.match(/\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*mm|\d+(?:[.,]\d+)?\s*mm/i);
  if (!match) return null;
  return compacto(match[0]);
}

function medidaDesdeSku(sku: string): string | null {
  const compuesto = sku.toUpperCase().match(/(\d+(?:[.,]\d+)?)X(\d+(?:[.,]\d+)?)MM/);
  if (compuesto) return `${compuesto[1].replace(",", ".")}x${compuesto[2].replace(",", ".")}mm`;
  const simple = sku.toUpperCase().match(/(?:^|[^0-9])(\d+(?:[.,]\d+)?)MM/);
  if (simple) return `${simple[1].replace(",", ".")}mm`;
  return null;
}

function tituloConMedida(titulo: string, medida: string): string {
  const re = new RegExp(MEDIDA_RE.source, "gi");
  let reemplazo = false;
  const ajustado = titulo.replace(re, (encontrada) => {
    if (compacto(encontrada) === compacto(medida)) return encontrada;
    if (reemplazo) return encontrada;
    reemplazo = true;
    return medida;
  });
  if (compacto(ajustado).includes(compacto(medida))) return ajustado.replace(/\s{2,}/g, " ").trim();
  const metro = ajustado.match(/\s+x\s+metro\b/i);
  if (metro?.index != null) {
    return `${ajustado.slice(0, metro.index)} ${medida}${ajustado.slice(metro.index)}`.replace(/\s{2,}/g, " ").trim();
  }
  return `${ajustado} ${medida}`.replace(/\s{2,}/g, " ").trim();
}

function partesTitulo(titulo: string, medida: string | null): Array<{ text: string; bold: boolean }> {
  if (!medida) return [{ text: titulo, bold: false }];
  const numeros = medida.match(/^(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)mm$/i);
  const simple = medida.match(/^(\d+(?:[.,]\d+)?)mm$/i);
  const re = numeros
    ? new RegExp(`(${numeros[1]}\\s*x\\s*${numeros[2]}\\s*mm)`, "i")
    : simple
      ? new RegExp(`(${simple[1]}\\s*mm)`, "i")
      : null;
  const match = re ? titulo.match(re) : null;
  if (!match || match.index == null) return [{ text: titulo, bold: false }];
  const inicio = match.index;
  const fin = inicio + match[0].length;
  return [
    { text: titulo.slice(0, inicio), bold: false },
    { text: titulo.slice(inicio, fin), bold: true },
    { text: titulo.slice(fin), bold: false },
  ].filter((parte) => parte.text.length > 0);
}

function tituloInventario(fila: Pick<InventarioFila, "nombre" | "nombreCompleto" | "variante_nombre" | "sku">): {
  partes: Array<{ text: string; bold: boolean }>;
  subtitulo: string | null;
} {
  const variante = fila.variante_nombre?.trim() ?? "";
  const medida = medidaCanonica(variante) || medidaDesdeSku(fila.sku);
  const base = fila.nombreCompleto?.trim() || fila.nombre.trim();
  const titulo = medida ? tituloConMedida(base, medida) : base;
  const plano = compacto(titulo);
  const subtitulo = variante && !plano.includes(compacto(variante)) ? variante : null;
  return { partes: partesTitulo(titulo, medida), subtitulo };
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 6));
  return Array.from({ length: 7 }, (_, index) => start + index);
}

export function ProductosView() {
  const cargaTitleId = useId();
  const stockTitleId = useId();
  const [query, setQuery] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("nombre_asc");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [items, setItems] = useState<InventarioFila[]>([]);
  const [meta, setMeta] = useState<InventarioListMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [cargaOpen, setCargaOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<InventarioFila | null>(null);
  const [stockValue, setStockValue] = useState("");
  const [savingStock, setSavingStock] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ productoId: number; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [editingMode, setEditingMode] = useState<EditingMode>("none");
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingInline, setSavingInline] = useState(false);

  const reload = async (
    search = query,
    nextPage = page,
    nextPageSize = pageSize,
    sort = sortKey,
    categoria = categoriaId,
    marca = selectedMarca,
    subcategoria = selectedSubcategoria,
  ) => {
    const result = await listAdminInventario({
      q: search.trim() || undefined,
      page: nextPage,
      pageSize: nextPageSize,
      sort,
      categoriaId: categoria ? Number(categoria) : undefined,
      marcaId: marca ? Number(marca) : undefined,
      subcategoriaId: subcategoria || undefined,
    });
    setItems(result.items);
    setMeta(result.meta);
  };

  useEffect(() => {
    void getAdminCategorias().then(setCategorias);
    void Promise.all([listMarcasCatalogo().catch(() => []), listAdminMarcas().catch(() => [])]).then(
      ([catalogo, admin]) => {
        const byId = new Map<number, Marca>();
        for (const marca of [...catalogo, ...admin]) {
          byId.set(marca.id, { id: marca.id, nombre: marca.nombre, activo: true });
        }
        setMarcas([...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      },
    );
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, pageSize, categoriaId, selectedMarca, selectedSubcategoria, stockFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void reload(query, page, pageSize, sortKey, categoriaId, selectedMarca, selectedSubcategoria)
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los productos."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, pageSize, sortKey, categoriaId, selectedMarca, selectedSubcategoria]);

  const subcategoriasDisponibles = useMemo(() => {
    if (!categoriaId) return [];
    const nombres = categorias.find((categoria) => String(categoria.id) === categoriaId)?.subcategorias ?? [];
    return [...nombres].sort((a, b) => a.localeCompare(b, "es"));
  }, [categoriaId, categorias]);

  const visibles = useMemo(() => {
    return items.filter((fila) => {
      if (stockFilter === "sin_stock") return fila.stock === 0;
      if (stockFilter === "poco_stock") return fila.stock >= 1 && fila.stock <= 4;
      if (stockFilter === "activos") return fila.estado === "activo";
      return true;
    });
  }, [items, stockFilter]);

  const hayFiltro =
    Boolean(query.trim()) ||
    Boolean(categoriaId) ||
    Boolean(selectedMarca) ||
    Boolean(selectedSubcategoria) ||
    stockFilter !== "todos";
  const catalogoVacio = !loading && !error && meta.total === 0 && !hayFiltro;
  const visibleIds = visibles.map((producto) => producto.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const toggleSeleccion = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSeleccionVisible = () => {
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
  };

  const selectedProductIds = () => [
    ...new Set(
      items.filter((fila) => selectedIds.includes(fila.id)).map((fila) => fila.productoId),
    ),
  ];

  const confirmBulkDelete = async () => {
    const ids = selectedProductIds();
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      const result = await deleteAdminProductosMasivo(ids);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      setEditorOpen(false);
      setEditing(null);
      setToast(result.message?.trim() || `Se eliminaron ${result.eliminados} productos.`);
      await reload();
      void getAdminCategorias().then(setCategorias);
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : "No se pudieron eliminar los productos.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSeleccionEstado = async () => {
    const selected = items.filter((fila) => selectedIds.includes(fila.id));
    const allActive = selected.length > 0 && selected.every((fila) => fila.estado === "activo");
    setBulkSaving(true);
    setError(null);
    try {
      await bulkUpdateAdminProductos({
        action: "status",
        ids: selectedIds,
        active: !allActive,
      });
      setSelectedIds([]);
      setToast(allActive ? "Las variantes quedaron pausadas." : "Las variantes quedaron activas.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setBulkSaving(false);
    }
  };

  const modifiedCount = Object.keys(pendingChanges).length;

  const enterMode = (mode: Exclude<EditingMode, "none">) => {
    if (modifiedCount > 0) {
      setError(
        editingMode === mode
          ? "Guardá o cancelá los cambios antes de salir."
          : "Guardá o cancelá los cambios antes de cambiar de modo.",
      );
      return;
    }
    setError(null);
    setDrafts({});
    setEditingMode((current) => (current === mode ? "none" : mode));
  };

  const cancelInline = () => {
    setPendingChanges({});
    setDrafts({});
    setEditingMode("none");
    setError(null);
  };

  const draftKey = (id: number, field: "precio" | "precioOferta" | "stock") => `${id}:${field}`;

  const registerChange = (
    fila: InventarioFila,
    field: "precio" | "precioOferta" | "stock",
    raw: string,
  ) => {
    setDrafts((current) => ({ ...current, [draftKey(fila.id, field)]: raw }));
    setPendingChanges((current) => {
      const next: PendingChanges = { ...current, [fila.id]: { ...current[fila.id] } };
      const row = next[fila.id]!;
      const trimmed = raw.trim();

      if (field === "precioOferta") {
        if (trimmed === "") {
          if (fila.precioOferta == null) delete row.precioOferta;
          else row.precioOferta = null;
        } else {
          const value = Number(trimmed);
          if (!Number.isFinite(value) || value < 0) return current;
          if (fila.precioOferta != null && sameNumber(value, fila.precioOferta)) delete row.precioOferta;
          else row.precioOferta = value;
        }
      } else if (field === "stock") {
        if (!/^\d+$/.test(trimmed)) {
          delete row.stock;
          if (trimmed !== "") return current;
        } else {
          const value = Number(trimmed);
          if (value === fila.stock) delete row.stock;
          else row.stock = value;
        }
      } else if (trimmed === "") {
        delete row.precio;
      } else {
        const value = Number(trimmed);
        if (!Number.isFinite(value) || value < 0) return current;
        if (sameNumber(value, fila.precio)) delete row.precio;
        else row.precio = value;
      }

      if (row.precio === undefined && row.precioOferta === undefined && row.stock === undefined) {
        delete next[fila.id];
      }
      return next;
    });
  };

  const saveInline = async () => {
    if (modifiedCount === 0) return;
    for (const [id, change] of Object.entries(pendingChanges)) {
      const fila = items.find((item) => item.id === Number(id));
      const lista = change.precio ?? fila?.precio ?? 0;
      if (change.precioOferta != null && !(change.precioOferta < lista)) {
        setError("El precio de oferta tiene que ser menor al precio de lista.");
        return;
      }
    }
    setSavingInline(true);
    setError(null);
    try {
      const result = await bulkInlineUpdateAdminProductos(pendingChanges);
      setPendingChanges({});
      setDrafts({});
      setEditingMode("none");
      setToast(`Se guardaron los cambios de ${result.actualizados} productos.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setSavingInline(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setEditingSku(null);
    setEditorOpen(true);
  };

  const openEdit = async (fila: InventarioFila) => {
    setError(null);
    try {
      const response = await getProductoById(fila.productoId);
      setEditing(response.data);
      setEditingSku(fila.sku);
      setEditorOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el producto.");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const requestDelete = (productoId: number, nombre: string) => {
    setDeleteError(null);
    setDeleteTarget({ productoId, nombre });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteAdminProducto(deleteTarget.productoId);
      void getAdminCategorias().then(setCategorias);
      setEditorOpen(false);
      setEditing(null);
      setDeleteTarget(null);
      setToast(result.message?.trim() || "Producto eliminado del catálogo.");
      await reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar el producto.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleDestacado = async (fila: InventarioFila) => {
    const next = !fila.esDestacado;
    setItems((current) =>
      current.map((item) => (item.productoId === fila.productoId ? { ...item, esDestacado: next } : item)),
    );
    setError(null);
    try {
      await toggleDestacadoAdminProducto(fila.productoId);
      setToast(next ? "Producto añadido a destacados" : "Producto quitado de destacados");
    } catch (err) {
      setItems((current) =>
        current.map((item) => (item.productoId === fila.productoId ? { ...item, esDestacado: !next } : item)),
      );
      setError(err instanceof Error ? err.message : "No se pudo actualizar el destacado.");
    }
  };

  const toggleActivo = async (fila: InventarioFila) => {
    setError(null);
    try {
      await bulkUpdateAdminProductos({
        action: "status",
        ids: [fila.id],
        active: fila.estado !== "activo",
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    }
  };

  const saveStock = async () => {
    if (!stockTarget) return;
    const nextStock = Number(stockValue);
    if (!Number.isFinite(nextStock) || nextStock < 0) {
      setError("Ingresá un stock válido.");
      return;
    }
    setSavingStock(true);
    setError(null);
    try {
      await updateAdminVariante(stockTarget.productoId, stockTarget.id, { stock: nextStock });
      await reload();
      setStockTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el stock.");
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Productos e inventario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Alta, edición completa, stock rápido y pausa de publicación desde una sola tabla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => setCargaOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Carga Masiva (CSV)
          </Button>
          <Button variant="dark" onClick={openCreate}>
            <PackagePlus className="size-4" aria-hidden />
            + Nuevo Producto
          </Button>
        </div>
      </div>

      {!catalogoVacio ? (
      <div className={`${adminCardClass} grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6`}>
        <div className={`flex gap-2 ${hayFiltro ? "col-span-2" : ""}`}>
          <Input
            className="min-w-0 flex-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar productos"
          />
          {hayFiltro ? (
            <Button
              variant="subtle"
              className="shrink-0"
              onClick={() => {
                setQuery("");
                setCategoriaId("");
                setSelectedSubcategoria("");
                setSelectedMarca("");
                setStockFilter("todos");
              }}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
        <select
          value={categoriaId}
          onChange={(event) => {
            setCategoriaId(event.target.value);
            setSelectedSubcategoria("");
          }}
          className={selectClass}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
        <select
          value={categoriaId ? selectedSubcategoria : ""}
          onChange={(event) => setSelectedSubcategoria(event.target.value)}
          className={selectClass}
          aria-label="Filtrar por subcategoría"
          disabled={!categoriaId}
        >
          <option value="">Todas las subcategorías</option>
          {subcategoriasDisponibles.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
        <select
          value={selectedMarca}
          onChange={(event) => setSelectedMarca(event.target.value)}
          className={selectClass}
          aria-label="Filtrar por marca"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((marca) => (
            <option key={marca.id} value={marca.id}>
              {marca.nombre}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(event) => setStockFilter(event.target.value as StockFilter)}
          className={selectClass}
          aria-label="Filtrar por alerta de stock"
        >
          <option value="todos">Todas las alertas</option>
          <option value="sin_stock">Sin stock</option>
          <option value="poco_stock">Poco stock</option>
          <option value="activos">Activos</option>
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className={selectClass}
          aria-label="Ordenar productos"
        >
          <option value="nombre_asc">Nombre A-Z</option>
          <option value="precio_desc">Precio mayor a menor</option>
          <option value="precio_asc">Precio menor a mayor</option>
          <option value="stock_desc">Stock mayor a menor</option>
          <option value="stock_asc">Stock menor a mayor</option>
        </select>
      </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      {!catalogoVacio ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={editingMode === "precio" ? "dark" : "subtle"}
            onClick={() => enterMode("precio")}
          >
            ✏️ Editar Precios
          </Button>
          <Button
            variant={editingMode === "stock" ? "dark" : "subtle"}
            onClick={() => enterMode("stock")}
          >
            📦 Editar Stock
          </Button>
        </div>
      ) : null}

      {modifiedCount > 0 ? (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">{modifiedCount} productos modificados</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={cancelInline} disabled={savingInline}>
              ❌ Cancelar
            </Button>
            <Button variant="dark" onClick={() => void saveInline()} loading={savingInline}>
              💾 Guardar Cambios
            </Button>
          </div>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-900">{selectedIds.length} seleccionados</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" onClick={() => void toggleSeleccionEstado()} loading={bulkSaving}>
              Activar / Pausar
            </Button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              onClick={() => {
                setBulkDeleteError(null);
                setBulkDeleteOpen(true);
              }}
            >
              Eliminar seleccionados ({selectedIds.length})
            </button>
          </div>
        </div>
      ) : null}

      {catalogoVacio ? (
        <div className={`${adminCardClass} px-6 py-16 text-center`}>
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Package className="size-7" aria-hidden />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Aún no hay productos cargados</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Comenzá subiendo tu catálogo masivo a través de un archivo CSV o creá tu primer producto
            manualmente.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="subtle" onClick={() => setCargaOpen(true)}>
              <Upload className="size-4" aria-hidden />
              Cargar Masiva (CSV)
            </Button>
            <Button variant="dark" onClick={openCreate}>
              <PackagePlus className="size-4" aria-hidden />
              + Nuevo Producto
            </Button>
          </div>
        </div>
      ) : (
      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="w-10 px-3 py-3">
                <MasterCheckbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  label="Seleccionar todos los productos de esta página"
                  onChange={toggleSeleccionVisible}
                />
              </th>
              <th className="px-3 py-3">Foto</th>
              <th className="px-3 py-3">Destacado</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3">Precio lista</th>
              <th className="px-3 py-3">Precio oferta</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={10}>
                  Cargando productos...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={10}>
                  No hay productos para esos filtros.
                </td>
              </tr>
            ) : (
              visibles.map((fila) => {
                const badge = stockBadge(fila.stock);
                const activa = fila.estado === "activo";
                const change = pendingChanges[fila.id];
                const precioDirty = change?.precio !== undefined;
                const ofertaDirty = change?.precioOferta !== undefined;
                const stockDirty = change?.stock !== undefined;
                const precioValue = drafts[draftKey(fila.id, "precio")] ?? String(fila.precio);
                const ofertaValue =
                  drafts[draftKey(fila.id, "precioOferta")] ??
                  (fila.precioOferta != null ? String(fila.precioOferta) : "");
                const stockValueDraft = drafts[draftKey(fila.id, "stock")] ?? String(fila.stock);
                return (
                  <tr key={fila.id} className={adminTableRowClass}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300 text-slate-900 accent-slate-900"
                        checked={selectedIds.includes(fila.id)}
                        aria-label={`Seleccionar ${fila.nombre}`}
                        onChange={() => toggleSeleccion(fila.id)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="size-12 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                        {fila.imagenUrl ? (
                          <img src={fila.imagenUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-slate-400">
                            <ImageOff className="size-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-lg"
                        aria-label={fila.esDestacado ? "Quitar de destacados" : "Añadir a destacados"}
                        aria-pressed={fila.esDestacado}
                        onClick={() => void toggleDestacado(fila)}
                      >
                        <Star
                          className={
                            fila.esDestacado
                              ? "size-4 text-amber-400 fill-amber-400"
                              : "size-4 text-slate-300 hover:text-amber-400"
                          }
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{fila.sku || "—"}</td>
                    <td className="px-3 py-2.5">
                      {(() => {
                        const titulo = tituloInventario(fila);
                        return (
                          <>
                            <p className="font-medium text-slate-900">
                              {titulo.partes.map((parte, index) =>
                                parte.bold ? (
                                  <strong key={index} className="font-semibold">
                                    {parte.text}
                                  </strong>
                                ) : (
                                  <span key={index}>{parte.text}</span>
                                ),
                              )}
                            </p>
                            {titulo.subtitulo ? (
                              <p className="text-xs text-slate-500">{titulo.subtitulo}</p>
                            ) : null}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800">
                      {editingMode === "precio" ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={cellInputClass(precioDirty)}
                          value={precioValue}
                          aria-label={`Precio de lista de ${fila.nombre}`}
                          onChange={(event) => registerChange(fila, "precio", event.target.value)}
                        />
                      ) : (
                        formatARS(fila.precio)
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingMode === "precio" ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={cellInputClass(ofertaDirty)}
                          value={ofertaValue}
                          placeholder="Sin oferta"
                          aria-label={`Precio de oferta de ${fila.nombre}`}
                          onChange={(event) => registerChange(fila, "precioOferta", event.target.value)}
                        />
                      ) : fila.precioOferta != null ? (
                        <span className="font-semibold text-emerald-700">{formatARS(fila.precioOferta)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingMode === "stock" ? (
                        <input
                          type="number"
                          min={0}
                          step="1"
                          className={cellInputClass(stockDirty)}
                          value={stockValueDraft}
                          aria-label={`Stock de ${fila.nombre}`}
                          onChange={(event) => registerChange(fila, "stock", event.target.value)}
                        />
                      ) : (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <AdminSwitch
                          checked={activa}
                          onChange={() => void toggleActivo(fila)}
                          label={activa ? "Pausar variante" : "Activar variante"}
                        />
                        <span className="text-xs font-medium text-slate-600">{activa ? "Activo" : "Pausado"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <AdminIconButton
                          label="Editar producto"
                          icon={<Pencil className="size-4" aria-hidden />}
                          onClick={() => void openEdit(fila)}
                        />
                        <AdminDropdownMenu trigger={<MoreVertical className="size-4" aria-hidden />}>
                          <AdminDropdownItem onClick={() => void openEdit(fila)}>
                            <Pencil className="size-3.5" aria-hidden />
                            Editar producto
                          </AdminDropdownItem>
                          <AdminDropdownItem
                            onClick={() => {
                              setStockTarget(fila);
                              setStockValue(String(fila.stock));
                            }}
                          >
                            <Boxes className="size-3.5" aria-hidden />
                            Cambiar stock
                          </AdminDropdownItem>
                          <AdminDropdownItem
                            tone="danger"
                            onClick={() => requestDelete(fila.productoId, fila.nombre)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Eliminar
                          </AdminDropdownItem>
                        </AdminDropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3">
          <p className="text-sm text-slate-500">
            {meta.total === 0
              ? "Sin resultados"
              : `Mostrando ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} de ${meta.total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="min-h-9 px-3" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Página anterior
            </Button>
            {pageNumbers(page, meta.totalPages).map((number) => (
              <button
                key={number}
                type="button"
                className={`min-h-9 min-w-9 rounded-md px-2 text-sm font-medium ${
                  number === page ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <Button
              variant="ghost"
              className="min-h-9 px-3"
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            >
              Página siguiente
            </Button>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value === "50" ? 50 : 20)}
              className={selectClass}
              aria-label="Filas por página"
            >
              <option value="20">20 por página</option>
              <option value="50">50 por página</option>
            </select>
          </div>
        </div>
      </div>
      )}

      {editorOpen ? (
        <ProductoEditorDrawer
          key={`${editing?.id ?? "nuevo"}-${editingSku ?? ""}`}
          producto={editing}
          sku={editingSku}
          categorias={categorias}
          marcas={marcas}
          onClose={() => {
            setEditorOpen(false);
            setEditingSku(null);
          }}
          onCreatedCategoria={(categoria) => setCategorias((current) => [...current, categoria])}
          onUpdatedCategoria={(categoria) =>
            setCategorias((current) =>
              current.map((item) =>
                item.id === categoria.id ? { ...item, nombre: categoria.nombre, slug: categoria.slug } : item,
              ),
            )
          }
          onCreatedMarca={(marca) =>
            setMarcas((current) =>
              [...current.filter((item) => item.id > 0 && item.id !== marca.id), marca].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, "es"),
              ),
            )
          }
          onUpdatedMarca={(marca) =>
            setMarcas((current) =>
              current
                .map((item) => (item.id === marca.id ? { ...item, nombre: marca.nombre } : item))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
            )
          }
          onSubcategoriasSync={(id, nombres, change) => {
            setCategorias((current) =>
              current.map((item) => (item.id === id ? { ...item, subcategorias: nombres } : item)),
            );
            if (change.type === "rename") {
              setSelectedSubcategoria((current) => (current === change.from ? change.to : current));
            }
            if (change.type === "delete") {
              setSelectedSubcategoria((current) => (current === change.nombre ? "" : current));
            }
          }}
          onDeletedCategoria={(id) => {
            setCategorias((current) => current.filter((item) => item.id !== id));
            setCategoriaId((current) => (current === String(id) ? "" : current));
          }}
          onDeletedMarca={(id) => {
            setMarcas((current) => current.filter((item) => item.id !== id));
            setSelectedMarca((current) => (current === String(id) ? "" : current));
          }}
          onSaved={async () => {
            await reload();
            void getAdminCategorias().then(setCategorias);
            setEditorOpen(false);
          }}
          confirmingDelete={deleteTarget != null}
          onRequestDelete={editing ? () => requestDelete(editing.id, editing.nombre) : undefined}
        />
      ) : null}

      {deleteTarget ? (
        <AlertDialog
          title="¿Eliminar producto?"
          description={`Esta acción eliminará '${deleteTarget.nombre}' del catálogo. ¿Deseás continuar?`}
          confirmLabel="Eliminar"
          loading={deleting}
          error={deleteError}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {bulkDeleteOpen ? (
        <AlertDialog
          title="¿Eliminar productos?"
          description={`Esta acción eliminará ${selectedProductIds().length} productos del catálogo. ¿Deseás continuar?`}
          loading={bulkDeleting}
          error={bulkDeleteError}
          onCancel={() => {
            if (bulkDeleting) return;
            setBulkDeleteOpen(false);
            setBulkDeleteError(null);
          }}
          onConfirm={() => void confirmBulkDelete()}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {stockTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Cerrar stock rápido"
            onClick={() => setStockTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={stockTitleId}
            className={`relative z-10 w-full max-w-md ${adminCardClass} p-5`}
          >
            <h3 id={stockTitleId} className="text-lg font-semibold text-slate-900">
              Cambiar stock rápido
            </h3>
            <p className="mt-1 text-sm text-slate-500">{stockTarget.nombre}</p>
            <label className={`${adminFieldClass} mt-4`}>
              Unidades
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="1"
                value={stockValue}
                onChange={(event) => setStockValue(event.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStockTarget(null)}>
                Cancelar
              </Button>
              <Button variant="dark" onClick={() => void saveStock()} loading={savingStock}>
                Actualizar stock
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {cargaOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Cerrar carga masiva"
            onClick={() => setCargaOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={cargaTitleId}
            className={`relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto ${adminCardClass} p-5`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id={cargaTitleId} className="text-lg font-semibold text-slate-900">
                Carga masiva
              </h3>
              <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setCargaOpen(false)}>
                Cerrar
              </Button>
            </div>
            <CargaMasivaView
              compact
              onImported={async (resultado) => {
                setCargaOpen(false);
                setToast(`Se importaron ${resultado.total} productos correctamente`);
                await reload();
                void getAdminCategorias().then(setCategorias);
              }}
              onReverted={async () => {
                setToast("Importación deshecha.");
                await reload();
                void getAdminCategorias().then(setCategorias);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
