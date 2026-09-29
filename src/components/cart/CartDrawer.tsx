"use client";

import { MapPin, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { formatARS } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/lib/useHasMounted";
import { useCartStore } from "@/store/useCartStore";
import { useComercioConfig } from "@/store/useConfigStore";

export function CartDrawer() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const mensajeFlete = useComercioConfig().mensajeFlete;

  const visibleItems = hasMounted ? items : [];
  const subtotal = hasMounted ? getSubtotal() : 0;
  const open = hasMounted && isCartOpen;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeCart]);

  const goToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  return (
    <div
      className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 z-0 bg-slate-950/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar carrito"
        onClick={closeCart}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={cn(
          "absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col bg-surface shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" aria-hidden />
            <h2 id="cart-drawer-title" className="text-lg font-semibold text-main">
              Tu carrito
            </h2>
          </div>
          <Button variant="ghost" className="min-w-11 px-0" aria-label="Cerrar carrito" onClick={closeCart}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {visibleItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="size-10 text-muted" aria-hidden />
              <p className="font-semibold text-main">Tu carrito está vacío</p>
              <p className="text-sm text-muted">Agregá productos del catálogo para iniciar un pedido.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleItems.map((item) => {
                const canDecrease = item.cantidad > 1;
                const canIncrease = item.cantidad < item.stockDisponible;

                return (
                  <li key={item.varianteId} className="product-card p-3">
                    <div className="flex gap-3">
                      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {item.imagenUrl ? (
                          <img
                            src={item.imagenUrl}
                            alt={item.nombre}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted">
                            <ShoppingBag className="size-6" aria-hidden />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-main">{item.nombre}</p>
                        <p className="text-xs text-muted">SKU {item.varianteSku}</p>
                        <p className="text-xs text-muted">Variante: {item.varianteSku}</p>
                        <PriceDisplay source={item} size="sm" className="mt-1" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          className="min-w-11 px-0"
                          aria-label={`Quitar una unidad de ${item.nombre}`}
                          disabled={!canDecrease}
                          onClick={() => updateQuantity(item.varianteId, item.cantidad - 1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                          {item.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          className="min-w-11 px-0"
                          aria-label={`Agregar una unidad de ${item.nombre}`}
                          disabled={!canIncrease}
                          onClick={() => updateQuantity(item.varianteId, item.cantidad + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        className="min-w-11 px-0 text-accent hover:bg-accent/10 hover:text-accent-hover"
                        aria-label={`Eliminar ${item.nombre} del carrito`}
                        onClick={() => removeItem(item.varianteId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-4">
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{mensajeFlete ?? "Envío a coordinar o retiro en punto seguro"}</p>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted">Subtotal</span>
            <span className="text-lg font-semibold text-main">{formatARS(subtotal)}</span>
          </div>

          <Button
            variant="accent"
            className="w-full"
            disabled={visibleItems.length === 0}
            onClick={goToCheckout}
          >
            Finalizar Pedido / Presupuesto
          </Button>
        </div>
      </aside>
    </div>
  );
}
