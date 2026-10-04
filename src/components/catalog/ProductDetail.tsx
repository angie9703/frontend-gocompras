"use client";

import { ChevronLeft, ChevronRight, ImageOff, MapPin, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import {
  formatVarianteLabel,
  getActiveVariantes,
  getDefaultVariante,
  getGaleriaItems,
  toCartItem,
} from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatARS } from "@/lib/money";
import { useCartStore } from "@/store/useCartStore";
import type { Producto, Variante } from "@/types";

interface ProductDetailProps {
  producto: Producto;
}

export function ProductDetail({ producto }: ProductDetailProps) {
  const variantes = useMemo(() => getActiveVariantes(producto), [producto]);
  const galeria = useMemo(() => getGaleriaItems(producto, variantes), [producto, variantes]);
  const [selectedSku, setSelectedSku] = useState(
    () => getDefaultVariante(producto)?.sku ?? variantes[0]?.sku ?? "",
  );
  const [cantidad, setCantidad] = useState(1);
  const [imageIndex, setImageIndex] = useState(() => {
    const sku = getDefaultVariante(producto)?.sku ?? variantes[0]?.sku ?? "";
    const index = getGaleriaItems(producto, variantes).findIndex((item) => item.varianteSku === sku);
    return index >= 0 ? index : 0;
  });
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const selectedVariante: Variante | undefined =
    variantes.find((variante) => variante.sku === selectedSku) ?? variantes[0];
  const varianteActiva = selectedVariante as (Variante & { nombre_producto?: string | null }) | undefined;
  const titulo =
    varianteActiva?.nombre_producto?.trim() ||
    varianteActiva?.atributos?.nombre_producto?.trim() ||
    varianteActiva?.nombre?.trim() ||
    producto.nombre;
  const imagenActual = galeria[Math.min(imageIndex, Math.max(galeria.length - 1, 0))]?.url ?? null;
  const enStock = (selectedVariante?.stockDisponible ?? 0) > 0;
  const maxCantidad = selectedVariante?.stockDisponible ?? 0;

  useEffect(() => {
    document.title = `${titulo} | GO COMPRAS`;
  }, [titulo]);

  const onSelectVariante = (variante: Variante) => {
    setSelectedSku(variante.sku);
    setCantidad(variante.stockDisponible > 0 ? 1 : 0);
    const index = galeria.findIndex((item) => item.varianteSku === variante.sku);
    setImageIndex(index >= 0 ? index : 0);
  };

  const onSelectImagen = (index: number) => {
    const item = galeria[index];
    if (!item) return;
    setImageIndex(index);
    if (!item.varianteSku || item.varianteSku === selectedSku) return;
    const variante = variantes.find((entry) => entry.sku === item.varianteSku);
    if (!variante) return;
    setSelectedSku(variante.sku);
    setCantidad(variante.stockDisponible > 0 ? 1 : 0);
  };

  const onAddToCart = () => {
    if (!selectedVariante || !enStock) return;
    addItem(toCartItem(producto, selectedVariante, Math.max(cantidad, 1)));
    openCart();
  };

  const specs: Array<{ label: string; value: string }> = [
    { label: "SKU", value: selectedVariante?.sku ?? "—" },
    ...(producto.marca ? [{ label: "Marca", value: producto.marca.nombre }] : []),
    ...(producto.categoria ? [{ label: "Categoría", value: producto.categoria.nombre }] : []),
    ...Object.entries(selectedVariante?.atributos ?? {}).map(([label, value]) => ({
      label,
      value,
    })),
  ];

  return (
    <article className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 py-8">
      <Link href="/productos" className="text-sm font-medium text-primary hover:underline">
        ← Volver al catálogo
      </Link>

      <div className="mt-6 grid w-full min-w-0 gap-8 lg:grid-cols-2">
        <div className="min-w-0 max-w-full">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-white">
            {imagenActual ? (
              <img src={imagenActual} alt={titulo} className="size-full object-contain p-4" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted">
                <ImageOff className="size-12" aria-hidden />
              </div>
            )}

            {galeria.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm"
                  aria-label="Imagen anterior"
                  onClick={() => onSelectImagen((imageIndex - 1 + galeria.length) % galeria.length)}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm"
                  aria-label="Imagen siguiente"
                  onClick={() => onSelectImagen((imageIndex + 1) % galeria.length)}
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {galeria.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {galeria.map((item, index) => {
                const variante = item.varianteSku
                  ? variantes.find((entry) => entry.sku === item.varianteSku)
                  : undefined;
                const etiqueta = variante ? formatVarianteLabel(variante) : `imagen ${index + 1}`;
                return (
                  <button
                    key={`${item.varianteSku ?? "foto"}-${item.url}`}
                    type="button"
                    onClick={() => onSelectImagen(index)}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-lg border bg-white",
                      index === imageIndex ? "border-accent" : "border-slate-200",
                    )}
                    aria-label={variante ? `Ver variante ${etiqueta}` : `Ver imagen ${index + 1}`}
                  >
                    <img src={item.url} alt="" className="size-full object-cover" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 max-w-full">
          {producto.categoria ? (
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              {producto.categoria.nombre}
            </p>
          ) : null}
          <h1 className="mt-1 break-words text-2xl font-semibold text-main md:text-3xl">{titulo}</h1>
          <p className="mt-2 text-sm text-muted">SKU {selectedVariante?.sku ?? "—"}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {selectedVariante ? (
              <PriceDisplay source={selectedVariante} size="lg" />
            ) : (
              <p className="text-3xl font-semibold text-primary">Consultar</p>
            )}
            <Badge kind={enStock ? "stock" : "consultar"} />
          </div>

          {variantes.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-main">Variante</p>
              <div className="flex w-full min-w-0 max-w-full flex-wrap gap-2">
                {variantes.map((variante) => {
                  const selected = variante.sku === selectedVariante?.sku;
                  return (
                    <button
                      key={variante.sku}
                      type="button"
                      onClick={() => onSelectVariante(variante)}
                      className={cn(
                        "max-w-full rounded-full border px-3 py-2 text-center text-sm font-medium break-words whitespace-normal transition-colors",
                        selected
                          ? "border-accent bg-accent/10 font-semibold text-main shadow-sm"
                          : "border-gray-200 bg-white text-main hover:border-accent/40",
                      )}
                    >
                      {formatVarianteLabel(variante)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="min-w-11 px-0"
                aria-label="Disminuir cantidad"
                disabled={!enStock || cantidad <= 1}
                onClick={() => setCantidad((value) => Math.max(1, value - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-10 text-center text-sm font-semibold tabular-nums">{cantidad}</span>
              <Button
                variant="outline"
                className="min-w-11 px-0"
                aria-label="Aumentar cantidad"
                disabled={!enStock || cantidad >= maxCantidad}
                onClick={() => setCantidad((value) => Math.min(maxCantidad, value + 1))}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <Button
              variant="accent"
              className="flex-1"
              disabled={!selectedVariante || !enStock}
              onClick={onAddToCart}
            >
              <ShoppingBag className="size-4" />
              Agregar al Presupuesto
            </Button>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Envío a coordinar o retiro en Punto Seguro. Por tu seguridad no pedimos la dirección
              exacta al comprar: coordinamos estación, supermercado o domicilio a convenir por
              WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-xl border border-slate-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-main">Especificaciones técnicas</h2>
        <dl className="mt-4 divide-y divide-slate-100">
          {specs.map((spec) => (
            <div key={spec.label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="text-sm font-medium capitalize text-muted">{spec.label}</dt>
              <dd className="min-w-0 text-sm break-words text-main sm:col-span-2">{spec.value}</dd>
            </div>
          ))}
        </dl>
        {producto.descripcion ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-main">{producto.descripcion}</p>
        ) : null}
      </section>

      {producto.complementos && producto.complementos.productos.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-main">También te puede servir</h2>
          <div className="catalog-grid">
            {producto.complementos.productos.slice(0, 4).map((complemento) => (
              <article key={complemento.id} className="product-card p-3">
                <Link href={`/productos/${complemento.id}`} className="block">
                  <h3 className="line-clamp-2 text-sm font-semibold text-main hover:text-primary">
                    {complemento.nombre}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Desde {complemento.precioDesde ? formatARS(Number(complemento.precioDesde)) : "consultar"}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
