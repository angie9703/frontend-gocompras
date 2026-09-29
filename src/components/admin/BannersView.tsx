"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { bannerToPromoContent, pickPromoBanner } from "@/components/home/PromoBanner";
import { PromoStrip, PROMO_STRIP_DEFAULTS } from "@/components/home/PromoStrip";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass } from "@/lib/adminUi";
import { createAdminBanner, listAdminBanners, updateAdminBanner } from "@/services/admin";
import type { Banner } from "@/types";

export function BannersView() {
  const [bannerId, setBannerId] = useState<number | null>(null);
  const [subtitulo, setSubtitulo] = useState(PROMO_STRIP_DEFAULTS.etiqueta);
  const [titulo, setTitulo] = useState(PROMO_STRIP_DEFAULTS.titulo);
  const [ctaLabel, setCtaLabel] = useState(PROMO_STRIP_DEFAULTS.ctaLabel);
  const [ctaHref, setCtaHref] = useState(PROMO_STRIP_DEFAULTS.ctaHref);
  const [imagenUrl, setImagenUrl] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [tarjeta1Visible, setTarjeta1Visible] = useState(true);
  const [tarjeta2Visible, setTarjeta2Visible] = useState(true);
  const [tarjeta3Visible, setTarjeta3Visible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const applyBanner = (banner: Banner) => {
    const content = bannerToPromoContent(banner);
    setBannerId(banner.id);
    setSubtitulo(content.etiqueta);
    setTitulo(content.titulo);
    setCtaLabel(content.ctaLabel);
    setCtaHref(content.ctaHref);
    setImagenUrl(content.imagenUrl ?? "");
    setPublicado(banner.publicado ?? banner.activo);
    setTarjeta1Visible(banner.tarjeta1Visible !== false);
    setTarjeta2Visible(banner.tarjeta2Visible !== false);
    setTarjeta3Visible(banner.tarjeta3Visible !== false);
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    void listAdminBanners()
      .then((items) => {
        const banner = pickPromoBanner(items);
        if (banner) applyBanner(banner);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el banner."))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const imagen = imagenUrl.trim();
      const visible = Boolean(publicado);
      const payload = {
        titulo: titulo.trim() || PROMO_STRIP_DEFAULTS.titulo,
        subtitulo: subtitulo.trim() || PROMO_STRIP_DEFAULTS.etiqueta,
        ctaLabel: ctaLabel.trim() || PROMO_STRIP_DEFAULTS.ctaLabel,
        ctaHref: ctaHref.trim() || PROMO_STRIP_DEFAULTS.ctaHref,
        imagenUrl: imagen ? imagen : null,
        publicado: visible,
        activo: visible,
        orden: 0,
        tarjeta1Visible: Boolean(tarjeta1Visible),
        tarjeta2Visible: Boolean(tarjeta2Visible),
        tarjeta3Visible: Boolean(tarjeta3Visible),
      };

      if (bannerId) {
        applyBanner(await updateAdminBanner(bannerId, payload));
      } else {
        applyBanner(await createAdminBanner(payload));
      }
      setToast({ kind: "success", message: "Banner actualizado correctamente" });
    } catch (err) {
      const responseData = axios.isAxiosError(err) ? err.response?.data : undefined;
      console.error("Error al guardar banner:", responseData);
      const data = responseData as { message?: unknown; error?: { message?: unknown } } | undefined;
      const apiMessage =
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : typeof data?.error?.message === "string" && data.error.message.trim()
            ? data.error.message
            : null;
      const message = apiMessage ?? "No se pudo guardar el banner.";
      setError(message);
      setToast({ kind: "error", message });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Banner Promocional del Home</h2>
        <p className="mt-1 text-sm text-slate-500">
          Editá la placa azul de la portada y mirá el resultado en vivo antes de publicarla.
        </p>
      </div>

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <section className={`${adminCardClass} h-fit min-w-0 space-y-4 p-5`}>
          <div>
            <h3 className="font-semibold text-slate-900">Banner promocional de la portada</h3>
            <p className="mt-1 text-xs text-slate-500">Estos textos reemplazan la franja debajo de las categorías.</p>
          </div>

          <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 shadow-sm">
            <span className="text-sm font-semibold text-slate-800">Publicar en la tienda</span>
            <AdminSwitch checked={publicado} onChange={setPublicado} label="Publicar en la tienda" />
          </div>

          <label className={adminFieldClass}>
            Título
            <Input
              className="mt-1"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ahorrá más en cada pedido"
            />
          </label>
          <label className={adminFieldClass}>
            Subtítulo
            <Input
              className="mt-1"
              value={subtitulo}
              onChange={(event) => setSubtitulo(event.target.value)}
              placeholder="PROMOCIONES & OFERTAS DEL MES"
            />
          </label>
          <label className={adminFieldClass}>
            Texto del botón
            <Input
              className="mt-1"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              placeholder="Ver productos en oferta"
            />
          </label>
          <label className={adminFieldClass}>
            URL de destino
            <Input
              className="mt-1"
              value={ctaHref}
              onChange={(event) => setCtaHref(event.target.value)}
              placeholder="/productos?ofertas=true"
            />
          </label>
          <label className={adminFieldClass}>
            URL de imagen de fondo
            <Input
              className="mt-1"
              value={imagenUrl}
              onChange={(event) => setImagenUrl(event.target.value)}
              placeholder="https://… opcional"
            />
          </label>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Tarjetas informativas</p>
            <p className="text-xs text-slate-500">Desactivá las placas si querés un banner limpio, solo con imagen y textos.</p>
            {[
              ["Descuentos por cantidad", tarjeta1Visible, setTarjeta1Visible],
              ["Precio gremio", tarjeta2Visible, setTarjeta2Visible],
              ["Envío gratis en Puntos Seguros", tarjeta3Visible, setTarjeta3Visible],
            ].map(([label, checked, setter]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-slate-700">{label as string}</span>
                <AdminSwitch
                  checked={checked as boolean}
                  onChange={setter as (next: boolean) => void}
                  label={label as string}
                />
              </div>
            ))}
          </div>
          <Button
            variant="dark"
            className="w-full"
            type="button"
            disabled={isSaving}
            loading={isSaving}
            onClick={(event) => {
              event.preventDefault();
              void save(event);
            }}
          >
            Guardar cambios
          </Button>
        </section>

        <section className={`${adminCardClass} min-w-0 space-y-4 p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Previsualización en vivo</h3>
            <span
              className={
                publicado
                  ? "inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800 ring-1 ring-emerald-200"
                  : "inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold tracking-wide text-slate-600 ring-1 ring-slate-300"
              }
            >
              {publicado ? (
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              ) : (
                <span className="size-2 rounded-full bg-slate-500" aria-hidden />
              )}
              {publicado ? "EN VIVO" : "OCULTO EN TIENDA"}
            </span>
          </div>
          <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <PromoStrip
              preview
              content={{
                etiqueta: subtitulo,
                titulo,
                ctaLabel,
                ctaHref,
                imagenUrl: imagenUrl.trim() || null,
                tarjeta1Visible,
                tarjeta2Visible,
                tarjeta3Visible,
              }}
            />
          </div>
        </section>
      </div>

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
    </div>
  );
}
