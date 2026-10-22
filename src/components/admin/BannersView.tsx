"use client";

import { ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, adminTableHeadClass, adminTableRowClass } from "@/lib/adminUi";
import { cn } from "@/lib/cn";
import { getCloudinaryUploadConfig, uploadCloudinaryImage } from "@/lib/cloudinary";
import {
  createAdminBanner,
  deleteAdminBanner,
  listAdminBanners,
  updateAdminBanner,
} from "@/services/admin";
import type { Banner } from "@/types";

function bannerHref(banner: Banner): string {
  return banner.link_url?.trim() || banner.linkUrl?.trim() || banner.linkDestino?.trim() || banner.ctaHref?.trim() || "";
}

function bannerDesktop(banner: Banner): string | null {
  return banner.imagenUrl?.trim() || banner.imagen_url?.trim() || null;
}

function bannerMobile(banner: Banner): string | null {
  return banner.imagenMobileUrl?.trim() || banner.imagen_mobile_url?.trim() || null;
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
      // JPEG no tiene canal alfa: las zonas transparentes de un PNG/WebP quedarían negras.
      const formato = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
      resolve(canvas.toDataURL(formato, 0.85));
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

function enlaceValido(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  return href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
}

type ImagenOrigen = "upload" | "url";

function urlImagenManualValida(value: string): boolean {
  const href = value.trim();
  if (!href || href.length > 500) return false;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function BannerImagenCampo({
  nombre,
  hint,
  origen,
  imageUrl,
  uploading,
  disabled,
  onOrigenChange,
  onImageUrlChange,
  onFile,
}: {
  nombre: string;
  hint: string;
  origen: ImagenOrigen;
  imageUrl: string;
  uploading: boolean;
  disabled: boolean;
  onOrigenChange: (origen: ImagenOrigen) => void;
  onImageUrlChange: (value: string) => void;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = imageUrl.trim();
  const urlInvalida = origen === "url" && preview.length > 0 && !urlImagenManualValida(preview);
  const bloqueado = disabled || uploading;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">{nombre}</p>
      <div role="tablist" aria-label={`Imagen de ${nombre}`} className="inline-flex rounded-lg bg-slate-100 p-0.5">
        <button
          type="button"
          role="tab"
          aria-selected={origen === "upload"}
          disabled={bloqueado}
          onClick={() => onOrigenChange("upload")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            origen === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          Subir archivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={origen === "url"}
          disabled={bloqueado}
          onClick={() => onOrigenChange("url")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            origen === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          Pegar URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />

      {origen === "upload" ? (
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (bloqueado) return;
            const file = event.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {uploading ? <Loader2 className="mb-1 size-4 animate-spin" aria-hidden /> : <ImagePlus className="mb-1 size-4" aria-hidden />}
          {uploading ? "Subiendo imagen..." : "Arrastrá una imagen o hacé clic para subirla"}
        </button>
      ) : (
        <div>
          <Input
            type="text"
            value={imageUrl}
            disabled={bloqueado}
            placeholder="https://res.cloudinary.com/..."
            aria-label={`URL de ${nombre}`}
            aria-invalid={urlInvalida}
            className="min-h-9"
            onChange={(event) => onImageUrlChange(event.target.value)}
          />
          {urlInvalida ? (
            <p className="mt-1 text-xs font-medium text-accent">
              {preview.length > 500 ? "La URL no puede superar los 500 caracteres." : "Ingresá una URL http(s) válida."}
            </p>
          ) : null}
        </div>
      )}

      {preview ? (
        <img src={preview} alt="" className="h-24 w-full rounded-lg bg-slate-100 object-cover" />
      ) : (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function BannersView() {
  const formRef = useRef<HTMLElement>(null);
  const editingIdRef = useRef<number | null>(null);
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [orden, setOrden] = useState("0");
  const [activo, setActivo] = useState(true);
  const [imagenUrl, setImagenUrl] = useState("");
  const [imagenMobileUrl, setImagenMobileUrl] = useState("");
  const [imagenOrigen, setImagenOrigen] = useState<ImagenOrigen>("upload");
  const [imagenMobileOrigen, setImagenMobileOrigen] = useState<ImagenOrigen>("upload");
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [ordenDraft, setOrdenDraft] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);
  editingIdRef.current = editingId;

  const load = async () => {
    const next = await listAdminBanners();
    setItems([...next].sort((a, b) => a.orden - b.orden || a.id - b.id));
  };

  useEffect(() => {
    setLoading(true);
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los banners."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const upload = async (file: File, target: "desktop" | "mobile") => {
    setUploading(target);
    setError(null);
    const cloudinary = getCloudinaryUploadConfig();
    if (!cloudinary) {
      setUploading(null);
      setError(
        "Cloudinary no está configurado. Definí NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
      return;
    }
    try {
      const dataUrl = await fileToUploadDataUrl(file);
      const secureUrl = await uploadCloudinaryImage(dataUrl, cloudinary);
      if (target === "desktop") setImagenUrl(secureUrl);
      else setImagenMobileUrl(secureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitulo("");
    setLink("");
    setOrden("0");
    setActivo(true);
    setImagenUrl("");
    setImagenMobileUrl("");
    setImagenOrigen("upload");
    setImagenMobileOrigen("upload");
    setError(null);
  };

  const startEdit = (banner: Banner) => {
    setError(null);
    setEditingId(banner.id);
    setTitulo(banner.titulo || "");
    setLink(bannerHref(banner));
    setOrden(String(banner.orden ?? 0));
    setActivo(banner.activo);
    setImagenUrl(bannerDesktop(banner) ?? "");
    setImagenMobileUrl(bannerMobile(banner) ?? "");
    setImagenOrigen("upload");
    setImagenMobileOrigen("upload");
    setOrdenDraft((current) => {
      if (!(banner.id in current)) return current;
      const copy = { ...current };
      delete copy[banner.id];
      return copy;
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = async () => {
    const href = link.trim();
    const ordenNumero = Number(orden);
    const editing = editingId != null;
    const desktop = imagenUrl.trim();
    const mobile = imagenMobileUrl.trim();
    if (!desktop) {
      setError(editing ? "El banner necesita una imagen." : "Subí la imagen del banner antes de crearlo.");
      return;
    }
    if (!urlImagenManualValida(desktop)) {
      setError("La imagen de PC tiene que ser una URL http(s).");
      return;
    }
    if (mobile && !urlImagenManualValida(mobile)) {
      setError("La imagen de celular tiene que ser una URL http(s).");
      return;
    }
    if (!enlaceValido(href)) {
      setError("El enlace tiene que empezar con / o ser una URL http(s).");
      return;
    }
    if (!Number.isInteger(ordenNumero) || ordenNumero < 0 || ordenNumero > 9999) {
      setError("El orden tiene que ser un número entero entre 0 y 9999.");
      return;
    }

    const payload = {
      titulo: titulo.trim() || "Banner",
      imagenUrl: desktop,
      imagenMobileUrl: mobile || null,
      link_url: href || null,
      orden: ordenNumero,
      activo,
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId == null) {
        await createAdminBanner(payload);
        await load();
        resetForm();
        setToast("El banner se creó correctamente.");
      } else {
        const updated = await updateAdminBanner(editingId, payload);
        setItems((current) =>
          current
            .map((item) => {
              if (item.id !== editingId) return item;
              return {
                ...item,
                ...updated,
                titulo: updated.titulo || payload.titulo,
                imagenUrl: updated.imagenUrl ?? payload.imagenUrl,
                imagen_url: updated.imagen_url ?? updated.imagenUrl ?? payload.imagenUrl,
                imagenMobileUrl: updated.imagenMobileUrl ?? payload.imagenMobileUrl,
                imagen_mobile_url:
                  updated.imagen_mobile_url ?? updated.imagenMobileUrl ?? payload.imagenMobileUrl,
                link_url: updated.link_url ?? payload.link_url,
                linkUrl: updated.linkUrl ?? payload.link_url,
                linkDestino: updated.linkDestino ?? payload.link_url,
                ctaHref: updated.ctaHref ?? payload.link_url,
                orden: typeof updated.orden === "number" ? updated.orden : payload.orden,
                activo: typeof updated.activo === "boolean" ? updated.activo : payload.activo,
              };
            })
            .sort((a, b) => a.orden - b.orden || a.id - b.id),
        );
        resetForm();
        setToast("El banner se actualizó correctamente.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : editing ? "No se pudo guardar el banner." : "No se pudo crear el banner.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = (banner: Banner) => {
    const next = !banner.activo;
    if (editingId === banner.id) setActivo(next);
    setItems((current) => current.map((item) => (item.id === banner.id ? { ...item, activo: next } : item)));
    setSavingId(banner.id);
    setError(null);
    void updateAdminBanner(banner.id, { activo: next })
      .then((updated) => {
        setItems((current) => current.map((item) => (item.id === banner.id ? { ...item, ...updated, activo: updated.activo } : item)));
        setToast("El banner se actualizó correctamente.");
      })
      .catch((err) => {
        setItems((current) => current.map((item) => (item.id === banner.id ? banner : item)));
        if (editingIdRef.current === banner.id) setActivo(banner.activo);
        setError(err instanceof Error ? err.message : "No se pudo actualizar el banner.");
      })
      .finally(() => setSavingId(null));
  };

  const commitOrden = (banner: Banner, raw: string) => {
    const next = Number(raw);
    if (!Number.isInteger(next) || next < 0 || next > 9999) {
      setError("El orden tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    if (next === banner.orden) return;
    if (editingId === banner.id) setOrden(String(next));
    setItems((current) =>
      current
        .map((item) => (item.id === banner.id ? { ...item, orden: next } : item))
        .sort((a, b) => a.orden - b.orden || a.id - b.id),
    );
    setSavingId(banner.id);
    setError(null);
    void updateAdminBanner(banner.id, { orden: next })
      .then(() => {
        setOrdenDraft((current) => {
          const copy = { ...current };
          delete copy[banner.id];
          return copy;
        });
        setToast("El banner se actualizó correctamente.");
      })
      .catch((err) => {
        setItems((current) =>
          current
            .map((item) => (item.id === banner.id ? banner : item))
            .sort((a, b) => a.orden - b.orden || a.id - b.id),
        );
        if (editingIdRef.current === banner.id) setOrden(String(banner.orden));
        setError(err instanceof Error ? err.message : "No se pudo actualizar el orden.");
      })
      .finally(() => setSavingId(null));
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAdminBanner(pending.id);
      setItems((current) => current.filter((item) => item.id !== pending.id));
      if (editingId === pending.id) resetForm();
      setPending(null);
      setToast("El banner se eliminó correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el banner.");
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Banners Promocionales</h2>
        <p className="mt-1 text-sm text-slate-500">
          Subí las imágenes del carrusel de la portada, definí a dónde llevan y el orden en que aparecen.
        </p>
      </div>

      <section ref={formRef} className={`${adminCardClass} scroll-mt-4 space-y-4 p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{editingId == null ? "Nuevo banner" : "Editar banner"}</h3>
          {editingId != null ? (
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Cancelar edición"
              disabled={saving}
              onClick={resetForm}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={adminFieldClass}>
            Título
            <Input className="mt-1" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Oferta de cables" />
          </label>
          <label className={adminFieldClass}>
            Enlace de redirección
            <Input
              className="mt-1"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="/productos o https://…"
            />
          </label>
          <label className={adminFieldClass}>
            Orden
            <Input
              className="mt-1"
              type="number"
              min={0}
              max={9999}
              value={orden}
              onChange={(event) => setOrden(event.target.value)}
            />
          </label>
          <div className="flex items-center justify-between gap-3 self-end rounded-xl border border-slate-200 px-3 py-3">
            <span className="text-sm font-semibold text-slate-800">Activo</span>
            <AdminSwitch checked={activo} onChange={setActivo} label="Activar banner" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BannerImagenCampo
            nombre="Imagen"
            hint="La imagen se sube a Cloudinary, o podés pegar una URL, y se usa en el carrusel."
            origen={imagenOrigen}
            imageUrl={imagenUrl}
            uploading={uploading === "desktop"}
            disabled={saving || uploading != null}
            onOrigenChange={setImagenOrigen}
            onImageUrlChange={setImagenUrl}
            onFile={(file) => void upload(file, "desktop")}
          />
          <BannerImagenCampo
            nombre="Imagen para celular"
            hint="Opcional. Si no hay, el celular usa la imagen principal."
            origen={imagenMobileOrigen}
            imageUrl={imagenMobileUrl}
            uploading={uploading === "mobile"}
            disabled={saving || uploading != null}
            onOrigenChange={setImagenMobileOrigen}
            onImageUrlChange={setImagenMobileUrl}
            onFile={(file) => void upload(file, "mobile")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="dark"
            loading={saving}
            disabled={saving || uploading != null || !imagenUrl.trim()}
            onClick={() => void save()}
          >
            {editingId == null ? "Crear banner" : "Guardar cambios"}
          </Button>
          {editingId != null ? (
            <Button variant="subtle" disabled={saving} onClick={resetForm}>
              <X className="size-4" aria-hidden />
              Cancelar
            </Button>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-4 py-3">Imagen</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Enlace</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  Cargando banners...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  Todavía no hay banners.
                </td>
              </tr>
            ) : (
              items.map((banner) => {
                const preview = bannerDesktop(banner) || bannerMobile(banner);
                const ordenValue = ordenDraft[banner.id] ?? String(banner.orden);
                return (
                  <tr key={banner.id} className={cn(adminTableRowClass, editingId === banner.id && "bg-primary/5")}>
                    <td className="px-4 py-2.5">
                      {preview ? (
                        <img src={preview} alt="" className="h-14 w-24 rounded-md bg-slate-100 object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">Sin imagen</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{banner.titulo || "Banner"}</td>
                    <td className="max-w-48 truncate px-4 py-2.5 text-slate-600">{bannerHref(banner) || "—"}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={ordenValue}
                        disabled={savingId === banner.id}
                        aria-label={`Orden de ${banner.titulo || "banner"}`}
                        className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
                        onChange={(event) =>
                          setOrdenDraft((current) => ({ ...current, [banner.id]: event.target.value }))
                        }
                        onBlur={(event) => commitOrden(banner, event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitOrden(banner, ordenValue);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminSwitch
                        checked={banner.activo}
                        disabled={savingId === banner.id}
                        label={`Activar ${banner.titulo || "banner"}`}
                        onChange={() => toggleActivo(banner)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100",
                            editingId === banner.id ? "bg-primary/10 text-primary" : "text-slate-500",
                          )}
                          aria-label={`Editar ${banner.titulo || "banner"}`}
                          aria-pressed={editingId === banner.id}
                          onClick={() => startEdit(banner)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                          aria-label={`Eliminar ${banner.titulo || "banner"}`}
                          onClick={() => {
                            setError(null);
                            setPending(banner);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pending ? (
        <AlertDialog
          title="Eliminar banner"
          description={`¿Estás seguro de que querés eliminar "${pending.titulo || "este banner"}"?`}
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
