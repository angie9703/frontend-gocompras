"use client";

import { Check, ChevronDown, ChevronRight, ImageIcon, Pencil, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, adminTableHeadClass, adminTableRowClass } from "@/lib/adminUi";
import {
  createAdminCategoria,
  createAdminMarca,
  createSubcategoria,
  deleteAdminCategoria,
  deleteMarca,
  deleteSubcategoria,
  getAdminCategorias,
  listAdminMarcas,
  listSubcategorias,
  updateAdminCategoria,
  updateMarca,
  updateSubcategoria,
  uploadAdminImage,
  type SubcategoriaItem,
} from "@/services/admin";

type Kind = "categoria" | "marca";

type CatalogoItem = {
  id: number;
  nombre: string;
  esDestacada: boolean;
  ordenDestacada: number;
  imagenUrl: string | null;
};

function leerDestacada(value: { esDestacada?: boolean; es_destacada?: boolean }): boolean {
  return Boolean(value.esDestacada ?? value.es_destacada);
}

function leerOrden(value: { ordenDestacada?: number; orden_destacada?: number }): number {
  const orden = value.ordenDestacada ?? value.orden_destacada ?? 0;
  return Number.isInteger(orden) ? orden : 0;
}

function leerImagen(value: { imagenUrl?: string | null; imagen_url?: string | null }): string | null {
  const imagen = value.imagenUrl?.trim() || value.imagen_url?.trim() || "";
  return imagen || null;
}

function ordenValido(value: string): number | null {
  const orden = Number(value);
  if (!Number.isInteger(orden) || orden < 0 || orden > 9999) return null;
  return orden;
}

function enlaceImagenValido(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  return href.startsWith("http://") || href.startsWith("https://");
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
  if (!file.type.startsWith("image/")) throw new Error("El archivo tiene que ser una imagen.");
  if (file.size <= 1_500_000) return readFileAsDataUrl(file);
  return compressImageFile(file);
}

function CategoriaThumb({ src }: { src: string | null }) {
  const [rota, setRota] = useState(false);
  return (
    <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      {src && !rota ? (
        <img src={src} alt="" className="size-full object-contain" onError={() => setRota(true)} />
      ) : (
        <ImageIcon className="size-4 text-slate-400" aria-hidden />
      )}
    </span>
  );
}

function SubcategoriasPanel({ categoriaId }: { categoriaId: number }) {
  const [items, setItems] = useState<SubcategoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pending, setPending] = useState<SubcategoriaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listSubcategorias(categoriaId)
      .then((rows) => {
        if (!active) return;
        setItems(
          rows
            .filter((item) => item.categoriaId === categoriaId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        );
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las subcategorías.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoriaId]);

  const create = async () => {
    const value = nombre.trim();
    if (value.length < 2) return;
    setSaving(true);
    setError(null);
    try {
      const creada = await createSubcategoria(categoriaId, value);
      setItems((current) =>
        [...current.filter((item) => item.id !== creada.id), creada].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
      setNombre("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la subcategoría.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (item: SubcategoriaItem) => {
    const value = editingName.trim();
    if (value.length < 2) return;
    setSavingEdit(true);
    setError(null);
    try {
      const actualizada = await updateSubcategoria(item.id, value);
      setItems((current) =>
        current
          .map((row) => (row.id === item.id ? actualizada : row))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      );
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la subcategoría.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSubcategoria(pending.id);
      setItems((current) => current.filter((item) => item.id !== pending.id));
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la subcategoría.");
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-l-2 border-slate-200 py-1 pl-4 sm:pl-6">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Subcategorías</p>
      {error ? <p className="mt-2 text-sm font-medium text-accent">{error}</p> : null}
      {loading ? (
        <p className="mt-2 text-sm text-slate-500">Cargando subcategorías...</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Todavía no hay subcategorías.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => {
            const editing = editingId === item.id;
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-white">
                {editing ? (
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label={`Nuevo nombre de ${item.nombre}`}
                    className="min-h-9"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveEdit(item);
                      }
                    }}
                  />
                ) : (
                  <span className="truncate text-sm font-medium text-slate-800">{item.nombre}</span>
                )}
                <div className="flex shrink-0 items-center">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        aria-label="Guardar subcategoría"
                        disabled={savingEdit || editingName.trim().length < 2}
                        onClick={() => void saveEdit(item)}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        aria-label="Cancelar"
                        disabled={savingEdit}
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        aria-label={`Editar ${item.nombre}`}
                        onClick={() => {
                          setError(null);
                          setEditingId(item.id);
                          setEditingName(item.nombre);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                        aria-label={`Eliminar ${item.nombre}`}
                        onClick={() => {
                          setError(null);
                          setPending(item);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex max-w-xl flex-wrap gap-2">
        <Input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Nueva subcategoría"
          aria-label="Nombre de la subcategoría"
          className="min-h-9"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void create();
            }
          }}
        />
        <Button
          variant="dark"
          className="shrink-0 px-3! py-2! text-xs!"
          onClick={() => void create()}
          loading={saving}
          disabled={nombre.trim().length < 2}
        >
          + Agregar subcategoría
        </Button>
      </div>
      {pending ? (
        <AlertDialog
          title="Eliminar subcategoría"
          description={`¿Estás seguro de que querés eliminar "${pending.nombre}"?`}
          loading={deleting}
          onCancel={() => {
            if (!deleting) setPending(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}

function CategoriaEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: CatalogoItem;
  onClose: () => void;
  onSaved: (next: CatalogoItem) => void;
}) {
  const titleId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(item.nombre);
  const [imagenUrl, setImagenUrl] = useState(item.imagenUrl ?? "");
  const [destacada, setDestacada] = useState(item.esDestacada);
  const [orden, setOrden] = useState(String(item.ordenDestacada));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving || uploading) return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, saving, uploading]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await fileToUploadDataUrl(file);
      const imagen = await uploadAdminImage({ file: dataUrl });
      setImagenUrl(imagen.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const save = async () => {
    const value = nombre.trim();
    const ordenNumero = ordenValido(orden);
    const imagen = imagenUrl.trim();
    if (value.length < 2) {
      setError("El nombre tiene que tener al menos 2 caracteres.");
      return;
    }
    if (ordenNumero == null) {
      setError("El orden en Home tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    if (!enlaceImagenValido(imagen)) {
      setError("La imagen tiene que ser una URL http(s).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const categoria = await updateAdminCategoria(item.id, {
        nombre: value,
        imagenUrl: imagen || null,
        esDestacada: destacada,
        ordenDestacada: ordenNumero,
      });
      onSaved({
        id: item.id,
        nombre: categoria.nombre || value,
        imagenUrl: leerImagen(categoria) ?? (imagen || null),
        esDestacada: leerDestacada(categoria),
        ordenDestacada: leerOrden(categoria),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la categoría.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Cerrar edición"
        onClick={() => {
          if (!saving && !uploading) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-lg ${adminCardClass} p-5`}
      >
        <h3 id={titleId} className="text-lg font-semibold text-slate-900">
          Editar categoría
        </h3>
        <div className="mt-4 space-y-4">
          <label className={adminFieldClass}>
            Nombre
            <Input value={nombre} onChange={(event) => setNombre(event.target.value)} className="mt-1" autoFocus />
          </label>
          <div className={adminFieldClass}>
            Imagen de portada
            <div className="mt-2 flex items-center gap-3">
              <CategoriaThumb key={imagenUrl || "vacia"} src={imagenUrl.trim() || null} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="subtle"
                  className="px-3! py-2! text-xs!"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  Subir imagen
                </Button>
                {imagenUrl.trim() ? (
                  <Button variant="ghost" className="px-3! py-2! text-xs!" disabled={uploading} onClick={() => setImagenUrl("")}>
                    Quitar
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
            <Input
              value={imagenUrl}
              onChange={(event) => setImagenUrl(event.target.value)}
              placeholder="https://..."
              aria-label="URL de la imagen de portada"
              className="mt-2"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">Destacar en Home</span>
            <AdminSwitch checked={destacada} label="Destacar en Home" onChange={setDestacada} />
          </div>
          <label className={adminFieldClass}>
            Orden en Home
            <input
              type="number"
              min={0}
              max={9999}
              inputMode="numeric"
              value={orden}
              onChange={(event) => setOrden(event.target.value)}
              className="mt-1 h-11 w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-accent">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="subtle" disabled={saving || uploading} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" loading={saving} disabled={uploading || nombre.trim().length < 2} onClick={() => void save()}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CatalogoGestionView({ kind }: { kind: Kind }) {
  const isCategoria = kind === "categoria";
  const label = isCategoria ? "categoría" : "marca";
  const titulo = isCategoria ? "Categorías" : "Marcas";
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pending, setPending] = useState<CatalogoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingHomeId, setSavingHomeId] = useState<number | null>(null);
  const [ordenDraft, setOrdenDraft] = useState<Record<number, string>>({});
  const [abiertas, setAbiertas] = useState<number[]>([]);
  const [categoriaEdit, setCategoriaEdit] = useState<CatalogoItem | null>(null);
  const columnas = isCategoria ? 5 : 2;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = isCategoria
      ? getAdminCategorias().then((categorias) =>
          categorias
            .filter((item) => item.id > 0)
            .map((item) => ({
              id: item.id,
              nombre: item.nombre,
              esDestacada: leerDestacada(item),
              ordenDestacada: leerOrden(item),
              imagenUrl: leerImagen(item),
            })),
        )
      : listAdminMarcas().then((marcas) =>
          marcas
            .filter((item) => item.id > 0)
            .map((item) => ({
              id: item.id,
              nombre: item.nombre,
              esDestacada: false,
              ordenDestacada: 0,
              imagenUrl: null,
            })),
        );

    void load
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : `No se pudieron cargar las ${titulo.toLowerCase()}.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCategoria, titulo]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibles = [...items].sort((a, b) => {
    if (isCategoria) {
      const orden = a.ordenDestacada - b.ordenDestacada;
      if (orden !== 0) return orden;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const create = async () => {
    const value = nombre.trim();
    if (value.length < 2) return;
    setSaving(true);
    setError(null);
    try {
      if (isCategoria) {
        const categoria = await createAdminCategoria(value);
        setItems((current) => [
          ...current,
          {
            id: categoria.id,
            nombre: categoria.nombre,
            esDestacada: leerDestacada(categoria),
            ordenDestacada: leerOrden(categoria),
            imagenUrl: leerImagen(categoria),
          },
        ]);
      } else {
        const marca = await createAdminMarca(value);
        setItems((current) => [
          ...current,
          { id: marca.id, nombre: marca.nombre, esDestacada: false, ordenDestacada: 0, imagenUrl: null },
        ]);
      }
      setNombre("");
      setToast(`La ${label} se creó correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo crear la ${label}.`);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (item: CatalogoItem) => {
    const value = editingName.trim();
    if (value.length < 2) return;
    setSavingEdit(true);
    setError(null);
    try {
      const marca = await updateMarca(item.id, value);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, nombre: marca.nombre } : row)));
      setEditingId(null);
      setEditingName("");
      setToast("La marca se actualizó correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la marca.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      if (isCategoria) await deleteAdminCategoria(pending.id);
      else await deleteMarca(pending.id);
      setItems((current) => current.filter((row) => row.id !== pending.id));
      setAbiertas((current) => current.filter((id) => id !== pending.id));
      setPending(null);
      setToast(`La ${label} se eliminó correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo eliminar la ${label}.`);
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  const saveHome = async (snapshot: CatalogoItem, destacada: boolean, orden: number) => {
    setSavingHomeId(snapshot.id);
    setError(null);
    try {
      const categoria = await updateAdminCategoria(snapshot.id, {
        esDestacada: destacada,
        ordenDestacada: orden,
      });
      setItems((current) =>
        current.map((row) =>
          row.id === snapshot.id
            ? {
                ...row,
                nombre: categoria.nombre || row.nombre,
                esDestacada: leerDestacada(categoria),
                ordenDestacada: leerOrden(categoria),
                imagenUrl: leerImagen(categoria) ?? row.imagenUrl,
              }
            : row,
        ),
      );
      setOrdenDraft((current) => {
        const next = { ...current };
        delete next[snapshot.id];
        return next;
      });
      setToast("La categoría se actualizó correctamente.");
    } catch (err) {
      setItems((current) => current.map((row) => (row.id === snapshot.id ? snapshot : row)));
      setError(err instanceof Error ? err.message : "No se pudo actualizar la categoría.");
    } finally {
      setSavingHomeId(null);
    }
  };

  const toggleDestacada = (item: CatalogoItem) => {
    const ordenRaw = ordenDraft[item.id] ?? String(item.ordenDestacada);
    const orden = ordenValido(ordenRaw);
    if (orden == null) {
      setError("El orden en Home tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    const next = !item.esDestacada;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, esDestacada: next } : row)));
    void saveHome(item, next, orden);
  };

  const commitOrden = (item: CatalogoItem, ordenRaw: string) => {
    const orden = ordenValido(ordenRaw);
    if (orden == null) {
      setError("El orden en Home tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    if (orden === item.ordenDestacada) return;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ordenDestacada: orden } : row)));
    void saveHome(item, item.esDestacada, orden);
  };

  const toggleAbierta = (id: number) => {
    setAbiertas((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isCategoria
            ? "Editá la imagen, el destacado y las subcategorías de cada rubro."
            : "Creá, renombrá o eliminá marcas del catálogo."}
        </p>
      </div>

      <div className={`${adminCardClass} p-4`}>
        <label className={adminFieldClass}>
          Nueva {label}
          <div className="mt-1 flex gap-2">
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder={isCategoria ? "Cables" : "Prysmian"}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void create();
                }
              }}
            />
            <Button variant="dark" onClick={() => void create()} loading={saving} disabled={nombre.trim().length < 2}>
              Crear
            </Button>
          </div>
        </label>
      </div>

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {isCategoria ? <th className="px-4 py-3">Imagen</th> : null}
              <th className="px-4 py-3">Nombre</th>
              {isCategoria ? <th className="px-4 py-3">Destacar en la Home</th> : null}
              {isCategoria ? <th className="px-4 py-3">Orden en Home</th> : null}
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={columnas}>
                  Cargando {titulo.toLowerCase()}...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={columnas}>
                  Todavía no hay {isCategoria ? "categorías" : "marcas"}.
                </td>
              </tr>
            ) : (
              visibles.map((item) => {
                const editing = !isCategoria && editingId === item.id;
                const abierta = isCategoria && abiertas.includes(item.id);
                const ordenValue = ordenDraft[item.id] ?? String(item.ordenDestacada);
                return (
                  <Fragment key={item.id}>
                    <tr className={adminTableRowClass}>
                      {isCategoria ? (
                        <td className="px-4 py-2.5">
                          <CategoriaThumb key={`${item.id}-${item.imagenUrl ?? ""}`} src={item.imagenUrl} />
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5">
                        {editing ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            aria-label={`Nuevo nombre de ${item.nombre}`}
                            className="min-h-9"
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void saveEdit(item);
                              }
                            }}
                          />
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {isCategoria ? (
                              <button
                                type="button"
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                aria-expanded={abierta}
                                aria-label={`${abierta ? "Ocultar" : "Ver"} subcategorías de ${item.nombre}`}
                                onClick={() => toggleAbierta(item.id)}
                              >
                                {abierta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </button>
                            ) : null}
                            <span className="font-medium text-slate-800">{item.nombre}</span>
                          </span>
                        )}
                      </td>
                      {isCategoria ? (
                        <td className="px-4 py-2.5">
                          <AdminSwitch
                            checked={item.esDestacada}
                            disabled={savingHomeId === item.id}
                            label={`Destacar ${item.nombre} en la Home`}
                            onChange={() => toggleDestacada(item)}
                          />
                        </td>
                      ) : null}
                      {isCategoria ? (
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min={0}
                            max={9999}
                            inputMode="numeric"
                            value={ordenValue}
                            disabled={savingHomeId === item.id}
                            aria-label={`Orden en Home de ${item.nombre}`}
                            className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
                            onChange={(event) =>
                              setOrdenDraft((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            onBlur={(event) => commitOrden(item, event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitOrden(item, ordenValue);
                              }
                            }}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                aria-label="Guardar"
                                disabled={savingEdit || editingName.trim().length < 2}
                                onClick={() => void saveEdit(item)}
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                                aria-label="Cancelar"
                                disabled={savingEdit}
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                                aria-label={`Editar ${item.nombre}`}
                                onClick={() => {
                                  setError(null);
                                  if (isCategoria) {
                                    setCategoriaEdit(item);
                                    return;
                                  }
                                  setEditingId(item.id);
                                  setEditingName(item.nombre);
                                }}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                                aria-label={`Eliminar ${item.nombre}`}
                                onClick={() => {
                                  setError(null);
                                  setPending(item);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {abierta ? (
                      <tr className="border-t border-slate-100 bg-slate-50/80">
                        <td colSpan={columnas} className="px-4 py-3">
                          <SubcategoriasPanel categoriaId={item.id} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {categoriaEdit ? (
        <CategoriaEditModal
          item={categoriaEdit}
          onClose={() => setCategoriaEdit(null)}
          onSaved={(next) => {
            setItems((current) => current.map((row) => (row.id === next.id ? next : row)));
            setOrdenDraft((current) => {
              const draft = { ...current };
              delete draft[next.id];
              return draft;
            });
            setCategoriaEdit(null);
            setToast("La categoría se actualizó correctamente.");
          }}
        />
      ) : null}

      {pending ? (
        <AlertDialog
          title={`Eliminar ${label}`}
          description={`¿Estás seguro de que querés eliminar "${pending.nombre}"?`}
          loading={deleting}
          onCancel={() => {
            if (!deleting) setPending(null);
          }}
          onConfirm={() => void confirmDelete()}
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
    </div>
  );
}
