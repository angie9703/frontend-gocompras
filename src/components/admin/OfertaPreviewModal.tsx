"use client";

import { ImageOff, X } from "lucide-react";
import { useEffect, useId } from "react";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { Button } from "@/components/ui/Button";
import { adminCardClass } from "@/lib/adminUi";
import { getDefaultVariante, getProductoImagen } from "@/lib/catalog";
import { formatARS } from "@/lib/money";
import { getPrecioLista } from "@/lib/pricing";
import type { Categoria, Producto, Promocion } from "@/types";

function precioConDescuento(lista: number, porcentaje: number): number {
  return Math.round(lista * (1 - porcentaje / 100) * 100) / 100;
}

export function OfertaPreviewModal({
  promo,
  productos,
  categoria,
  subcategoriaNombre,
  onClose,
}: {
  promo: Promocion;
  productos: Producto[];
  categoria?: Categoria | null;
  subcategoriaNombre?: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const porcentaje = Number(promo.descuentoPorcentaje);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const alcance =
    promo.tipoAplicacion === "SUBCATEGORIA" || promo.alcance === "SUBCATEGORY"
      ? (subcategoriaNombre ?? "Subcategoría")
      : promo.tipoAplicacion === "CATEGORIA" || promo.alcance === "CATEGORY"
        ? (categoria?.nombre ?? "Categoría")
        : promo.tipoAplicacion === "PRODUCTO" || promo.alcance === "PRODUCT"
          ? "Producto"
          : "Toda la tienda";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Cerrar vista previa" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto ${adminCardClass} p-6`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Vista previa en tienda</p>
            <h3 id={titleId} className="mt-1 text-lg font-semibold text-slate-900">
              {promo.titulo}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {Number.isFinite(porcentaje) ? `${porcentaje}%` : "—"} · {alcance}
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

        {productos.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay un producto cargado para previsualizar esta oferta.
          </p>
        ) : (
          <div className={`mt-6 grid gap-4 ${productos.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-sm"}`}>
            {productos.map((producto) => {
              const variante = getDefaultVariante(producto);
              const imagen = getProductoImagen(producto, variante);
              const lista = variante ? getPrecioLista(variante) : 0;
              const oferta = lista > 0 && porcentaje > 0 ? precioConDescuento(lista, porcentaje) : lista;
              return (
                <article key={producto.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-square bg-slate-50">
                    {imagen ? (
                      <img src={imagen} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-slate-400">
                        <ImageOff className="size-8" />
                      </div>
                    )}
                    {porcentaje > 0 ? (
                      <span className="absolute top-2 left-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                        -{porcentaje}%
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 p-4">
                    <h4 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">{producto.nombre}</h4>
                    <p className="text-xs text-slate-500">SKU {variante?.sku ?? "—"}</p>
                    {lista > 0 ? (
                      <PriceDisplay
                        size="md"
                        source={{
                          precioLista: lista,
                          precioUnitario: oferta,
                          descuentoPorcentaje: porcentaje,
                        }}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">Consultar</p>
                    )}
                    {lista > 0 && oferta < lista ? (
                      <p className="text-xs text-emerald-700">
                        Ahorrás {formatARS(lista - oferta)} con esta oferta.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
