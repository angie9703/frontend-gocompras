"use client";

import { ImageOff, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ManageSubcategoriesModal } from "@/components/admin/ManageSubcategoriesModal";
import { GrupoVariantesCombobox } from "@/components/admin/GrupoVariantesCombobox";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, selectClass, tabClass, textareaClass } from "@/lib/adminUi";
import {
  createAdminProducto,
  getAdminProductoPorSku,
  updateAdminProducto,
  updateAdminVariante,
  uploadAdminImage,
} from "@/services/admin";
import type { Categoria, Marca, Producto, Variante } from "@/types";

type EditorTab = "general" | "precios" | "imagenes" | "specs";

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "precios", label: "Precios y Stock" },
  { id: "imagenes", label: "Imágenes" },
  { id: "specs", label: "Especificaciones" },
];

function varianteDelSku(producto: Producto | null, sku?: string | null): Variante | undefined {
  if (!producto) return undefined;
  const buscado = sku?.trim();
  if (buscado) {
    const encontrada = producto.variantes.find((item) => item.sku === buscado);
    if (encontrada) return encontrada;
  }
  return producto.variantes[0];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer la imagen."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo preparar la imagen."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = objectUrl;
  });
}

async function fileToUploadDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen.");
  }
  if (file.size <= 1_500_000) return readFileAsDataUrl(file);
  return compressImageFile(file);
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
  sku: skuEdicion = null,
  categorias,
  marcas,
  onClose,
  onSaved,
  onSubcategoriasSync,
  confirmingDelete = false,
  onRequestDelete,
}: {
  producto: Producto | null;
  sku?: string | null;
  categorias: Categoria[];
  marcas: Marca[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreate = producto == null;
  const variante = varianteDelSku(producto, skuEdicion);
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
  const [portada, setPortada] = useState("");
  const [urlBorrador, setUrlBorrador] = useState("");
  const [portadaLista, setPortadaLista] = useState(isCreate);
  const [imagenLoading, setImagenLoading] = useState(!isCreate && Boolean(skuEdicion?.trim() || variante?.sku));
  const [uploading, setUploading] = useState(false);
  const [specs, setSpecs] = useState(toAttrRows(variante?.atributos));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
      if (gestionSub || confirmingDelete) return;
      onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, gestionSub, confirmingDelete]);

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

  useEffect(() => {
    const skuConsulta = (skuEdicion ?? variante?.sku ?? "").trim();
    if (isCreate || !skuConsulta) {
      setImagenLoading(false);
      return;
    }

    let cancelled = false;
    setImagenLoading(true);
    setPortada("");
    void getAdminProductoPorSku(skuConsulta)
      .then((data) => {
        if (cancelled) return;
        setPortada(data.imagenUrl?.trim() ?? "");
        setPortadaLista(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPortada("");
        setPortadaLista(false);
        setError(err instanceof Error ? err.message : "No se pudo cargar la imagen de este SKU.");
      })
      .finally(() => {
        if (!cancelled) setImagenLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCreate, skuEdicion, variante?.sku]);

  const aplicarUrl = () => {
    const clean = urlBorrador.trim();
    if (!isHttpUrl(clean)) {
      setError("La imagen tiene que ser una URL http o https.");
      return;
    }
    setError(null);
    setPortada(clean);
    setPortadaLista(true);
    setUrlBorrador("");
  };

  const subirArchivo = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fileData = await fileToUploadDataUrl(file);
      const imagen = await uploadAdminImage({
        file: fileData,
        sku: sku.trim() || undefined,
      });
      setPortada(imagen.secure_url);
      setPortadaLista(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (imagenLoading || uploading) return;
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

    const portadaUrl = portada.trim() || null;
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
      ...(isCreate
        ? {
            imagenUrl: portadaUrl,
            imagenes: portadaUrl ? [portadaUrl] : [],
          }
        : {}),
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
              imagenUrl: portadaUrl,
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
            ...(portadaLista ? { imagenUrl: portadaUrl } : {}),
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
              {isCreate ? "Completá las solapas y publicá el ítem en el catálogo." : `SKU ${skuEdicion ?? variante?.sku ?? "—"}`}
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
                  <Link
                    href="/admin/productos/categorias"
                    className="inline-flex h-11 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gestionar
                  </Link>
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
                  <Link
                    href="/admin/productos/marcas"
                    className="inline-flex h-11 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gestionar
                  </Link>
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
              <p className="text-sm text-slate-500">
                Portada de este SKU{sku.trim() ? ` (${sku.trim()})` : ""}. La foto no se comparte con las otras variantes.
              </p>

              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {imagenLoading || uploading ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-sm">{uploading ? "Subiendo imagen…" : "Cargando la foto del SKU…"}</p>
                  </div>
                ) : portada ? (
                  <>
                    <img src={portada} alt="" className="h-64 w-full object-contain" />
                    <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                      Portada
                    </span>
                  </>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-slate-500">
                    <ImageOff className="size-8" />
                    <p className="mt-2 text-sm">Este SKU todavía no tiene foto de portada.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                  disabled={imagenLoading}
                >
                  <Upload className="size-4" />
                  {portada ? "Reemplazar foto" : "Subir Imagen"}
                </Button>
                {portada && !uploading ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPortada("");
                      setPortadaLista(true);
                    }}
                    disabled={imagenLoading}
                  >
                    Quitar
                  </Button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    void subirArchivo(file);
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={urlBorrador}
                  onChange={(event) => setUrlBorrador(event.target.value)}
                  placeholder="O pegá una URL https://…"
                  aria-label="URL de imagen"
                  disabled={imagenLoading || uploading}
                />
                <Button
                  variant="subtle"
                  onClick={aplicarUrl}
                  disabled={imagenLoading || uploading || !urlBorrador.trim()}
                >
                  Usar URL
                </Button>
              </div>
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
            <Button
              variant="dark"
              onClick={() => void save()}
              loading={saving}
              disabled={imagenLoading || uploading}
            >
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

    </div>
  );
}
