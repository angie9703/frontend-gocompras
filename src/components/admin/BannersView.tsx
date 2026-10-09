"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, adminTableHeadClass, adminTableRowClass } from "@/lib/adminUi";
import {
  createAdminBanner,
  deleteAdminBanner,
  listAdminBanners,
  updateAdminBanner,
  uploadAdminImage,
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

function enlaceValido(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  return href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
}

export function BannersView() {
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [orden, setOrden] = useState("0");
  const [activo, setActivo] = useState(true);
  const [imagenUrl, setImagenUrl] = useState("");
  const [imagenMobileUrl, setImagenMobileUrl] = useState("");
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [ordenDraft, setOrdenDraft] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    try {
      const dataUrl = await fileToUploadDataUrl(file);
      const imagen = await uploadAdminImage({ file: dataUrl });
      if (target === "desktop") setImagenUrl(imagen.secure_url);
      else setImagenMobileUrl(imagen.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(null);
    }
  };

  const create = async () => {
    const href = link.trim();
    const ordenNumero = Number(orden);
    if (!imagenUrl) {
      setError("Subí la imagen del banner antes de crearlo.");
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
    setSaving(true);
    setError(null);
    try {
      await createAdminBanner({
        titulo: titulo.trim() || "Banner",
        imagenUrl,
        imagenMobileUrl: imagenMobileUrl || null,
        link_url: href || null,
        orden: ordenNumero,
        activo,
      });
      setTitulo("");
      setLink("");
      setOrden("0");
      setActivo(true);
      setImagenUrl("");
      setImagenMobileUrl("");
      await load();
      setToast("El banner se creó correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el banner.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = (banner: Banner) => {
    const next = !banner.activo;
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

      <section className={`${adminCardClass} space-y-4 p-5`}>
        <h3 className="font-semibold text-slate-900">Nuevo banner</h3>
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Imagen</p>
            <input
              ref={desktopInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file, "desktop");
              }}
            />
            <Button
              type="button"
              variant="subtle"
              loading={uploading === "desktop"}
              disabled={uploading != null}
              onClick={() => desktopInput.current?.click()}
            >
              Subir imagen
            </Button>
            {imagenUrl ? (
              <img src={imagenUrl} alt="" className="h-24 w-full rounded-lg bg-slate-100 object-cover" />
            ) : (
              <p className="text-xs text-slate-500">La imagen se sube a Cloudinary y se usa en el carrusel.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Imagen para celular</p>
            <input
              ref={mobileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file, "mobile");
              }}
            />
            <Button
              type="button"
              variant="subtle"
              loading={uploading === "mobile"}
              disabled={uploading != null}
              onClick={() => mobileInput.current?.click()}
            >
              Subir imagen mobile
            </Button>
            {imagenMobileUrl ? (
              <img src={imagenMobileUrl} alt="" className="h-24 w-full rounded-lg bg-slate-100 object-cover" />
            ) : (
              <p className="text-xs text-slate-500">Opcional. Si no hay, el celular usa la imagen principal.</p>
            )}
          </div>
        </div>

        <Button variant="dark" loading={saving} disabled={saving || uploading != null || !imagenUrl} onClick={() => void create()}>
          Crear banner
        </Button>
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
                  <tr key={banner.id} className={adminTableRowClass}>
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
