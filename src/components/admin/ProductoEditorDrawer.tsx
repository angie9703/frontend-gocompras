"use client";

import { ImageOff, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { CatalogoGestionModal } from "@/components/admin/CatalogoGestionModal";
import { ManageBrandsModal } from "@/components/admin/ManageBrandsModal";
import { ManageSubcategoriesModal } from "@/components/admin/ManageSubcategoriesModal";
import { GrupoVariantesCombobox } from "@/components/admin/GrupoVariantesCombobox";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, selectClass, tabClass, textareaClass } from "@/lib/adminUi";
import {
  createAdminCategoria,
  createAdminProducto,
  deleteAdminCategoria,
  updateAdminCategoria,
  updateAdminProducto,
  updateAdminVariante,
} from "@/services/admin";
import type { Categoria, Marca, Producto, Variante } from "@/types";

type EditorTab = "general" | "precios" | "imagenes" | "specs";

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "precios", label: "Precios y Stock" },
  { id: "imagenes", label: "Imágenes" },
  { id: "specs", label: "Especificaciones" },
];

function firstVariante(producto: Producto | null): Variante | undefined {
  return producto?.variantes[0];
}

function toAttrRows(atributos: Record<string, string> | null | undefined): Array<{ key: string; value: string }> {
  const entries = Object.entries(atributos ?? {});
  if (entries.length === 0) return [{ key: "", value: "" }];
  return entries.map(([key, value]) => ({ key, value }));
}

function rowsToAtributos(rows: Array<{ key: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key || !value) continue;
    result[key] = value;
  }
  return result;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueNombres(nombres: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const nombre of nombres) {
    const trimmed = nombre?.trim() ?? "";
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("es");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((a, b) => a.localeCompare(b, "es"));
}

function subcategoriasDeCategoria(categoriaId: string, categorias: Categoria[]): string[] {
  if (!categoriaId) return [];
  const fromApi = categorias.find((categoria) => String(categoria.id) === categoriaId)?.subcategorias ?? [];
  return uniqueNombres(fromApi);
}

export function ProductoEditorDrawer({
  producto,
  categorias,
  marcas,
  onClose,
  onSaved,
  onCreatedCategoria,
  onCreatedMarca,
  onUpdatedMarca,
  onUpdatedCategoria,
  onDeletedCategoria,
  onDeletedMarca,
  onSubcategoriasSync,
  confirmingDelete = false,
  onRequestDelete,
}: {
  producto: Producto | null;
  categorias: Categoria[];
  marcas: Marca[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onCreatedCategoria?: (categoria: Categoria) => void;
  onCreatedMarca?: (marca: Marca) => void;
  onUpdatedMarca?: (marca: Marca) => void;
  onUpdatedCategoria?: (categoria: Categoria) => void;
  onDeletedCategoria?: (id: number) => void;
  onDeletedMarca?: (id: number) => void;
  onSubcategoriasSync?: (
    categoriaId: number,
    nombres: string[],
    change:
      | { type: "create"; nombre: string }
      | { type: "rename"; from: string; to: string }
      | { type: "delete"; nombre: string },
  ) => void;
  confirmingDelete?: boolean;
  onRequestDelete?: () => void;
}) {
  const titleId = useId();
  const isCreate = producto == null;
  const variante = firstVariante(producto);
  const [tab, setTab] = useState<EditorTab>("general");
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [sku, setSku] = useState(variante?.sku ?? "");
  const [categoriaId, setCategoriaId] = useState(producto?.categoria?.id ? String(producto.categoria.id) : "");
  const [subcategoria, setSubcategoria] = useState(producto?.subcategoria ?? "");
  const [marcaId, setMarcaId] = useState(producto?.marca?.id ? String(producto.marca.id) : "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [precio, setPrecio] = useState(String(variante?.precioLista ?? variante?.precio ?? ""));
  const [oferta, setOferta] = useState(variante?.precioOferta ? String(variante.precioOferta) : "");
  const [stock, setStock] = useState(String(variante?.stock ?? variante?.stockDisponible ?? 0));
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [grupoId, setGrupoId] = useState(producto?.grupoId ?? "");
  const [orden, setOrden] = useState(producto?.orden != null ? String(producto.orden) : "");
  const [destacado, setDestacado] = useState(producto?.destacado ?? false);
  const [imagenes, setImagenes] = useState<string[]>(
    producto?.imagenes?.length ? producto.imagenes : producto?.imagenUrl ? [producto.imagenUrl] : [],
  );
  const [nuevaImagen, setNuevaImagen] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [specs, setSpecs] = useState(toAttrRows(variante?.atributos));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickCreate, setQuickCreate] = useState<null | "categoria" | "marca">(null);
  const [gestionSub, setGestionSub] = useState(false);

  const marcasReales = useMemo(() => marcas.filter((marca) => marca.id > 0), [marcas]);
  const subcategoriasDisponibles = useMemo(() => {
    const opciones = subcategoriasDeCategoria(categoriaId, categorias);
    const actual = subcategoria.trim();
    const mismaCategoria =
      producto?.categoria?.id != null && String(producto.categoria.id) === categoriaId;
    if (actual && mismaCategoria && !opciones.some((nombre) => nombre.toLocaleLowerCase("es") === actual.toLocaleLowerCase("es"))) {
      return uniqueNombres([...opciones, actual]);
    }
    return opciones;
  }, [categoriaId, categorias, producto?.categoria?.id, subcategoria]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (quickCreate || gestionSub || confirmingDelete) return;
      onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, quickCreate, gestionSub, confirmingDelete]);

  const handleCategoriaChange = (nextId: string) => {
    setCategoriaId(nextId);
    setGestionSub(false);
    const opciones = subcategoriasDeCategoria(nextId, categorias);
    setSubcategoria((current) => {
      const valor = current.trim();
      if (!valor) return "";
      return opciones.some((nombre) => nombre.toLocaleLowerCase("es") === valor.toLocaleLowerCase("es"))
        ? current
        : "";
    });
  };

  const addImagen = (url: string) => {
    const clean = url.trim();
    if (!isHttpUrl(clean)) {
      setError("La imagen tiene que ser una URL http o https.");
      return;
    }
    setError(null);
    setImagenes((current) => (current.includes(clean) ? current : [...current, clean]));
    setNuevaImagen("");
    setPreviewIndex(imagenes.length);
  };

  const save = async () => {
    if (!nombre.trim() || !sku.trim() || precio === "") {
      setError("Completá nombre, SKU y precio lista.");
      setTab("general");
      return;
    }
    const precioNumero = Number(precio);
    const stockNumero = Number(stock);
    if (!Number.isFinite(precioNumero) || precioNumero < 0 || !Number.isFinite(stockNumero) || stockNumero < 0) {
      setError("Precio y stock tienen que ser números válidos.");
      setTab("precios");
      return;
    }

    const ofertaNumero = oferta.trim() ? Number(oferta) : null;
    const grupoIdValor = grupoId.trim() || null;
    const ordenNumero = orden.trim() === "" ? 0 : Number(orden);
    if (!Number.isInteger(ordenNumero) || ordenNumero < 0 || ordenNumero > 9999) {
      setError("El orden de relevancia tiene que ser un número entero entre 0 y 9999.");
      setTab("general");
      return;
    }

    const payloadProducto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      activo,
      destacado,
      grupoId: grupoIdValor,
      grupo_id: grupoIdValor,
      orden: ordenNumero,
      categoriaId: categoriaId ? Number(categoriaId) : null,
      marcaId: marcaId ? Number(marcaId) : null,
      subcategoria: subcategoria.trim() || null,
      imagenUrl: imagenes[0] ?? null,
      imagenes,
    };
    const atributos = rowsToAtributos(specs);

    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await createAdminProducto({
          ...payloadProducto,
          variantes: [
            {
              sku: sku.trim(),
              precio: precioNumero,
              precioOferta: ofertaNumero != null && ofertaNumero > 0 ? ofertaNumero : null,
              stock: stockNumero,
              atributos,
              activo: true,
            },
          ],
        });
      } else {
        if (!variante?.id) {
          setError("Este producto no tiene una variante editable.");
          return;
        }
        await Promise.all([
          updateAdminProducto(producto.id, payloadProducto),
          updateAdminVariante(producto.id, variante.id, {
            sku: sku.trim(),
            precio: precioNumero,
            stock: stockNumero,
            precioOferta: ofertaNumero != null && ofertaNumero > 0 ? ofertaNumero : null,
            atributos,
          }),
        ]);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Cerrar editor" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 lg:px-8">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-slate-900">
              {isCreate ? "Nuevo producto" : "Editar producto"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isCreate ? "Completá las solapas y publicá el ítem en el catálogo." : `SKU ${variante?.sku ?? "—"}`}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-3 lg:px-8">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tabClass(tab === item.id)} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 lg:px-8">
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          {tab === "general" ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <label className={adminFieldClass}>
                Nombre
                <Input className="mt-1" value={nombre} onChange={(event) => setNombre(event.target.value)} />
              </label>
              <label className={adminFieldClass}>
                SKU
                <Input className="mt-1 font-mono" value={sku} onChange={(event) => setSku(event.target.value)} />
              </label>
              <div className={adminFieldClass}>
                Categoría
                <div className="mt-1 flex gap-2">
                  <select
                    className={`${selectClass} flex-1`}
                    value={categoriaId}
                    onChange={(event) => handleCategoriaChange(event.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Gestionar categorías"
                    onClick={() => setQuickCreate("categoria")}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className={adminFieldClass}>
                Subcategoría
                <div className="mt-1 flex gap-2">
                  <select
                    className={`${selectClass} flex-1`}
                    value={subcategoriasDisponibles.includes(subcategoria) ? subcategoria : ""}
                    disabled={!categoriaId}
                    onChange={(event) => setSubcategoria(event.target.value)}
                  >
                    <option value="">{categoriaId ? "Sin subcategoría" : "Elegí una categoría"}</option>
                    {subcategoriasDisponibles.map((nombreSub) => (
                      <option key={nombreSub} value={nombreSub}>
                        {nombreSub}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Gestionar subcategorías"
                    disabled={!categoriaId}
                    onClick={() => setGestionSub(true)}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className={adminFieldClass}>
                Marca
                <div className="mt-1 flex gap-2">
                  <select
                    className={`${selectClass} flex-1`}
                    value={marcaId}
                    onChange={(event) => setMarcaId(event.target.value)}
                  >
                    <option value="">Sin marca</option>
                    {marcasReales.map((marca) => (
                      <option key={marca.id} value={marca.id}>
                        {marca.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Gestionar marcas"
                    onClick={() => setQuickCreate("marca")}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <label className={`${adminFieldClass} md:col-span-2`}>
                Descripción
                <textarea
                  className={`${textareaClass} mt-1 min-h-24`}
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  placeholder="Detalle técnico, usos y presentación."
                />
              </label>

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:col-span-2 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-800">Visibilidad</p>
                </div>
                <div className={`${adminFieldClass} md:col-span-2`}>
                  Grupo de Variantes
                  <div className="mt-1 font-normal">
                    <GrupoVariantesCombobox
                      value={grupoId}
                      nombreProducto={nombre}
                      onChange={setGrupoId}
                    />
                  </div>
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Unificá distintas opciones en una sola tarjeta. Si no existe, creá un grupo a partir del nombre.
                  </p>
                </div>
                <label className={adminFieldClass}>
                  Orden de Relevancia
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={9999}
                    step={1}
                    value={orden}
                    onChange={(event) => setOrden(event.target.value)}
                    placeholder="1"
                    aria-describedby="ayuda-orden"
                  />
                  <p id="ayuda-orden" className="mt-1 text-xs font-normal text-slate-500">
                    Posición numérica dentro del catálogo general (1 = primero).
                  </p>
                </label>
                <div className="flex items-start justify-between gap-3 self-stretch rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Producto Destacado</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      Muestra este producto en la sección especial de la Portada / Home.
                    </p>
                  </div>
                  <AdminSwitch
                    checked={destacado}
                    onChange={setDestacado}
                    label="Producto Destacado"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "precios" ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <label className={adminFieldClass}>
                Precio lista
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={precio}
                  onChange={(event) => setPrecio(event.target.value)}
                />
              </label>
              <label className={adminFieldClass}>
                Precio oferta
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={oferta}
                  onChange={(event) => setOferta(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <label className={adminFieldClass}>
                Stock actual
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="1"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                />
              </label>
              <div className="flex items-center justify-between gap-3 self-end rounded-xl border border-slate-200 px-3 py-3 shadow-sm">
                <span className="text-sm font-semibold text-slate-800">{activo ? "Activo" : "Pausado"}</span>
                <AdminSwitch
                  checked={activo}
                  onChange={setActivo}
                  label={activo ? "Pausar producto" : "Activar producto"}
                />
              </div>
            </div>
          ) : null}

          {tab === "imagenes" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={nuevaImagen}
                  onChange={(event) => setNuevaImagen(event.target.value)}
                  placeholder="https://… URL de la foto"
                  aria-label="URL de imagen"
                />
                <Button variant="subtle" onClick={() => addImagen(nuevaImagen)} disabled={!nuevaImagen.trim()}>
                  Agregar
                </Button>
              </div>
              <label className="block text-sm text-slate-500">
                Carga local (vista previa). Para publicarla en la tienda, pegá después una URL pública.
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setError("El servidor no aloja archivos. Usá el campo de URL para guardar la foto en el catálogo.");
                  }}
                />
              </label>

              {imagenes.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                  <div className="text-center">
                    <ImageOff className="mx-auto size-8" />
                    <p className="mt-2 text-sm">Todavía no hay fotos en la galería.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={imagenes[previewIndex] ?? imagenes[0]} alt="" className="h-64 w-full object-contain" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                    {imagenes.map((url, index) => (
                      <div key={url} className="relative">
                        <button
                          type="button"
                          onClick={() => setPreviewIndex(index)}
                          className={`overflow-hidden rounded-lg border ${
                            previewIndex === index ? "border-primary ring-2 ring-primary/30" : "border-slate-200"
                          }`}
                        >
                          <img src={url} alt="" className="h-16 w-full object-cover" />
                        </button>
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            className="flex-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-700"
                            onClick={() => {
                              setImagenes((current) => [url, ...current.filter((item) => item !== url)]);
                              setPreviewIndex(0);
                            }}
                          >
                            Portada
                          </button>
                          <button
                            type="button"
                            className="rounded bg-rose-50 px-1 py-0.5 text-rose-700"
                            aria-label="Quitar imagen"
                            onClick={() => {
                              setImagenes((current) => current.filter((item) => item !== url));
                              setPreviewIndex(0);
                            }}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {tab === "specs" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Atributos clave-valor, por ejemplo Voltaje → 220V.</p>
              {specs.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    value={row.key}
                    placeholder="Atributo"
                    onChange={(event) =>
                      setSpecs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    value={row.value}
                    placeholder="Valor"
                    onChange={(event) =>
                      setSpecs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="inline-flex size-11 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    aria-label="Quitar atributo"
                    onClick={() => setSpecs((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <Button variant="subtle" onClick={() => setSpecs((current) => [...current, { key: "", value: "" }])}>
                <Plus className="size-4" />
                Agregar atributo
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-4 lg:px-8">
          {!isCreate && onRequestDelete ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={onRequestDelete}
            >
              <Trash2 className="size-4" aria-hidden />
              Eliminar producto
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="dark" onClick={() => void save()} loading={saving}>
              {isCreate ? "Crear producto" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </aside>

      {gestionSub && categoriaId ? (
        <ManageSubcategoriesModal
          categoriaId={Number(categoriaId)}
          categoriaNombre={categorias.find((categoria) => String(categoria.id) === categoriaId)?.nombre ?? "Categoría"}
          onClose={() => setGestionSub(false)}
          onSync={(nombres, change) => {
            onSubcategoriasSync?.(Number(categoriaId), nombres, change);
            if (change.type === "create") setSubcategoria(change.nombre);
            if (change.type === "rename" && subcategoria === change.from) setSubcategoria(change.to);
            if (change.type === "delete" && subcategoria === change.nombre) setSubcategoria("");
          }}
        />
      ) : null}

      {quickCreate === "categoria" ? (
        <CatalogoGestionModal
          kind="categoria"
          items={categorias}
          onClose={() => setQuickCreate(null)}
          onCreate={async (nombreNuevo) => {
            const categoria = await createAdminCategoria(nombreNuevo);
            onCreatedCategoria?.(categoria);
            handleCategoriaChange(String(categoria.id));
          }}
          onRename={async (item, nombreNuevo) => {
            const categoria = await updateAdminCategoria(item.id, nombreNuevo);
            onUpdatedCategoria?.(categoria);
          }}
          onDelete={async (item) => {
            await deleteAdminCategoria(item.id);
            onDeletedCategoria?.(item.id);
            if (categoriaId === String(item.id)) handleCategoriaChange("");
          }}
        />
      ) : null}

      {quickCreate === "marca" ? (
        <ManageBrandsModal
          items={marcasReales}
          onClose={() => setQuickCreate(null)}
          onCreated={(marca) => {
            onCreatedMarca?.({ id: marca.id, nombre: marca.nombre, activo: true });
            setMarcaId(String(marca.id));
          }}
          onUpdated={(marca) => {
            onUpdatedMarca?.({ id: marca.id, nombre: marca.nombre, activo: true });
          }}
          onDeleted={(id) => {
            onDeletedMarca?.(id);
            setMarcaId((current) => (current === String(id) ? "" : current));
          }}
        />
      ) : null}
    </div>
  );
}
