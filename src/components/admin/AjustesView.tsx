"use client";

import { Pencil } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminCardClass, adminFieldClass, textareaClass } from "@/lib/adminUi";
import { emptyToNull } from "@/lib/comercio";
import { getAjustes, updateAjustes } from "@/services/configuracion";
import { useAjustesStore } from "@/store/useAjustesStore";
import type { AjustesTienda } from "@/types";

interface AjustesFormData {
  nombreTienda: string;
  textoFooter: string;
  whatsapp: string;
  emailContacto: string;
  direccion: string;
  instagram: string;
  facebook: string;
}

const EMPTY_FORM: AjustesFormData = {
  nombreTienda: "",
  textoFooter: "",
  whatsapp: "",
  emailContacto: "",
  direccion: "",
  instagram: "",
  facebook: "",
};

const editInputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-main shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const readInputClass =
  "w-full cursor-default border-0 bg-transparent px-0 py-1 text-sm text-slate-900 shadow-none outline-none focus:ring-0";

function toFormData(ajustes: AjustesTienda): AjustesFormData {
  return {
    nombreTienda: ajustes.nombreTienda ?? "",
    textoFooter: ajustes.textoFooter ?? "",
    whatsapp: ajustes.whatsapp ?? "",
    emailContacto: ajustes.emailContacto ?? "",
    direccion: ajustes.direccion ?? "",
    instagram: ajustes.instagram ?? "",
    facebook: ajustes.facebook ?? "",
  };
}

export function AjustesView() {
  const [formData, setFormData] = useState<AjustesFormData>(EMPTY_FORM);
  const [savedData, setSavedData] = useState<AjustesFormData>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const setAjustes = useAjustesStore((state) => state.setAjustes);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getAjustes()
      .then((ajustes) => {
        if (cancelled) return;
        const loaded = toFormData(ajustes);
        setFormData(loaded);
        setSavedData(loaded);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los ajustes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const setField = (field: keyof AjustesFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const cancelEditing = () => {
    setFormData(savedData);
    setIsEditing(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditing) return;
    setSaving(true);
    setToast(null);
    try {
      const saved = await updateAjustes({
        nombreTienda: emptyToNull(formData.nombreTienda),
        textoFooter: emptyToNull(formData.textoFooter),
        whatsapp: emptyToNull(formData.whatsapp),
        emailContacto: emptyToNull(formData.emailContacto),
        direccion: emptyToNull(formData.direccion),
        instagram: emptyToNull(formData.instagram),
        facebook: emptyToNull(formData.facebook),
      });
      const next = toFormData(saved);
      setFormData(next);
      setSavedData(next);
      setAjustes(saved);
      setIsEditing(false);
      setToast({ kind: "success", message: "Los ajustes se guardaron correctamente." });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudieron guardar los ajustes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = isEditing ? editInputClass : readInputClass;
  const textAreaClass = isEditing ? `${textareaClass} mt-1` : `${readInputClass} mt-1 min-h-16 resize-none`;

  return (
    <form className="mx-auto max-w-3xl space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Ajustes de la Tienda</h2>
          <p className="mt-1 text-sm text-slate-500">
            Nombre, contacto y redes que se muestran en la tienda.
          </p>
        </div>
        {isEditing ? null : (
          <Button type="button" variant="dark" disabled={loading} onClick={() => setIsEditing(true)}>
            <Pencil className="size-4" aria-hidden />
            Editar Ajustes
          </Button>
        )}
      </div>

      {loadError ? <p className="text-sm font-medium text-accent">{loadError}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando ajustes...</p> : null}

      <section className={`${adminCardClass} space-y-4 p-5`}>
        <div>
          <h3 className="font-semibold text-slate-900">Información general</h3>
          <p className="mt-1 text-xs text-slate-500">Nombre visible y el texto que aparece en el pie de la tienda.</p>
        </div>
        <label className={adminFieldClass}>
          Nombre de la tienda
          <input
            className={`${fieldClass} mt-1`}
            value={formData.nombreTienda || ""}
            onChange={(event) => setField("nombreTienda", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            maxLength={150}
          />
        </label>
        <label className={adminFieldClass}>
          Texto del Footer
          <textarea
            className={textAreaClass}
            value={formData.textoFooter || ""}
            onChange={(event) => setField("textoFooter", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            rows={3}
          />
        </label>
      </section>

      <section className={`${adminCardClass} space-y-4 p-5`}>
        <div>
          <h3 className="font-semibold text-slate-900">Contacto</h3>
          <p className="mt-1 text-xs text-slate-500">Datos para que los clientes te escriban o visiten el local.</p>
        </div>
        <label className={adminFieldClass}>
          WhatsApp
          <input
            className={`${fieldClass} mt-1`}
            value={formData.whatsapp || ""}
            onChange={(event) => setField("whatsapp", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            inputMode="tel"
            placeholder={isEditing ? "54911..." : undefined}
            maxLength={30}
          />
        </label>
        <label className={adminFieldClass}>
          Email de soporte
          <input
            className={`${fieldClass} mt-1`}
            type="email"
            value={formData.emailContacto || ""}
            onChange={(event) => setField("emailContacto", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            maxLength={150}
            placeholder={isEditing ? "soporte@gocompras.com" : undefined}
          />
        </label>
        <label className={adminFieldClass}>
          Dirección
          <input
            className={`${fieldClass} mt-1`}
            value={formData.direccion || ""}
            onChange={(event) => setField("direccion", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            maxLength={255}
          />
        </label>
      </section>

      <section className={`${adminCardClass} space-y-4 p-5`}>
        <div>
          <h3 className="font-semibold text-slate-900">Redes sociales</h3>
          <p className="mt-1 text-xs text-slate-500">Enlaces completos, con https://.</p>
        </div>
        <label className={adminFieldClass}>
          Instagram
          <input
            className={`${fieldClass} mt-1`}
            type="url"
            value={formData.instagram || ""}
            onChange={(event) => setField("instagram", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            maxLength={255}
            placeholder={isEditing ? "https://instagram.com/tu-tienda" : undefined}
          />
        </label>
        <label className={adminFieldClass}>
          Facebook
          <input
            className={`${fieldClass} mt-1`}
            type="url"
            value={formData.facebook || ""}
            onChange={(event) => setField("facebook", event.target.value)}
            readOnly={!isEditing}
            disabled={loading || saving}
            maxLength={255}
            placeholder={isEditing ? "https://facebook.com/tu-tienda" : undefined}
          />
        </label>
      </section>

      {isEditing ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="subtle" disabled={saving} onClick={cancelEditing}>
            Cancelar
          </Button>
          <Button type="submit" variant="dark" loading={saving}>
            Guardar Cambios
          </Button>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-[70] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "error" ? "bg-red-700" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </form>
  );
}
