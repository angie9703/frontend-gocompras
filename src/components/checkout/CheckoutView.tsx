"use client";

import { ArrowLeft, ChevronDown, FileText, ImageOff, MessageCircle, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MetodoPagoSelector, labelMetodoPago } from "@/components/checkout/MetodoPagoSelector";
import { TipoEntregaSelector } from "@/components/checkout/TipoEntregaSelector";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { cn } from "@/lib/cn";
import { formatARS } from "@/lib/money";
import { friendlyUserError } from "@/lib/errors";
import { useHasMounted } from "@/lib/useHasMounted";
import { buildPedidoWhatsAppMessage, buildPedidoWhatsAppUrl, resolvePublicPdfUrl } from "@/lib/whatsapp";
import { crearPedido, descargarPdfPresupuesto } from "@/services/pedidos";
import { validarCupon } from "@/services/admin";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useAjustes } from "@/store/useAjustesStore";
import { useComercioConfig } from "@/store/useConfigStore";
import type {
  CartItem,
  CreatePedidoPayload,
  MetodoPagoCheckout,
  TipoEntrega,
  Cupon,
} from "@/types";

const DIRECCION_A_COORDINAR = "A coordinar por WhatsApp";

const TIPO_ENTREGA_LABEL: Record<TipoEntrega, string> = {
  ENVIO_DOMICILIO: "Envío a Domicilio",
  PUNTO_SEGURO: "Punto Seguro de Encuentro",
};

interface FieldErrors {
  nombre?: string;
  telefono?: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContacto(input: { nombre: string; telefono: string }): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.nombre.trim()) {
    errors.nombre = "Ingresá tu nombre completo.";
  }

  if (digitsOnly(input.telefono).length < 8) {
    errors.telefono = "Ingresá un teléfono de WhatsApp válido.";
  }

  return errors;
}

function validateCheckout(input: { nombre: string; telefono: string }): FieldErrors {
  return validateContacto(input);
}

function toPedidoItems(items: CartItem[]): CreatePedidoPayload["items"] {
  return items.map((item) => {
    const productoVarianteId = Number(item.varianteId);
    if (!Number.isInteger(productoVarianteId) || productoVarianteId <= 0) {
      throw new Error(
        `No pudimos identificar la variante de ${item.nombre}. Volvé a agregarla al carrito.`,
      );
    }

    return {
      productoVarianteId,
      cantidad: item.cantidad,
    };
  });
}

function buildPedidoPayload(input: {
  items: CartItem[];
  nombre: string;
  telefono: string;
  notas: string;
  metodoPago: MetodoPagoCheckout | "";
  tipoEntrega: TipoEntrega | "";
  direccion?: string | null;
  localidad?: string | null;
  codigoPostal?: string | null;
  notasDireccion?: string | null;
  codigoCupon?: string;
}): CreatePedidoPayload {
  const metodoLabel = input.metodoPago ? labelMetodoPago(input.metodoPago) : DIRECCION_A_COORDINAR;
  const direccionGuardada = input.direccion?.trim() || "";
  const localidadGuardada = input.localidad?.trim() || "";
  const notasDireccion = input.notasDireccion?.trim() || "";
  const cpDigits = (input.codigoPostal ?? "").replace(/\D/g, "");
  const codigoPostal = cpDigits ? Number(cpDigits) : undefined;

  const addressLines = [
    direccionGuardada ? `Dirección: ${direccionGuardada}` : null,
    localidadGuardada ? `Localidad: ${localidadGuardada}` : null,
    input.codigoPostal?.trim() ? `CP: ${input.codigoPostal.trim()}` : null,
  ].filter(Boolean);

  const notas = [`Pago: ${metodoLabel}`, ...addressLines, input.notas.trim() || null]
    .filter(Boolean)
    .join("\n");

  const payload: CreatePedidoPayload = {
    telefonoWhatsapp: input.telefono.trim(),
    nombre: input.nombre.trim(),
    origen: "WEB",
    items: toPedidoItems(input.items),
    notas,
    direccion: direccionGuardada || DIRECCION_A_COORDINAR,
    puntoReferencia: notasDireccion || DIRECCION_A_COORDINAR,
    barrioLocalidad: localidadGuardada || DIRECCION_A_COORDINAR,
  };

  if (input.tipoEntrega) {
    payload.tipoEntrega = input.tipoEntrega;
  }

  if (input.metodoPago) {
    payload.metodoPago = input.metodoPago;
  }

  if (codigoPostal && Number.isFinite(codigoPostal)) {
    payload.codigoPostal = codigoPostal;
  }

  if (input.codigoCupon?.trim()) {
    payload.codigoCupon = input.codigoCupon.trim().toUpperCase();
  }

  return payload;
}

function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-main">
      {children}
      {optional ? <span className="font-normal text-muted"> (opcional)</span> : null}
    </label>
  );
}

function ResumenItems({ items, className }: { items: CartItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <li key={item.varianteId} className="flex gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
            {item.imagenUrl ? (
              <Image
                src={item.imagenUrl}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted">
                <ImageOff className="size-5" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-main">{item.nombre}</p>
            <p className="text-xs text-muted">
              {item.varianteSku} · {item.cantidad} u.
            </p>
            <PriceDisplay
              source={{
                precioUnitario: item.precioUnitario * item.cantidad,
                precioLista:
                  item.precioLista && item.precioLista > item.precioUnitario
                    ? item.precioLista * item.cantidad
                    : undefined,
                descuentoPorcentaje: item.descuentoPorcentaje,
              }}
              size="sm"
              className="mt-0.5"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ResumenTotales({
  subtotal,
  descuento,
  codigoCupon,
  total,
}: {
  subtotal: number;
  descuento: number;
  codigoCupon?: string;
  total: number;
}) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Subtotal</span>
        <span className="font-semibold text-main">{formatARS(subtotal)}</span>
      </div>
      {descuento > 0 ? (
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-muted">Cupón {codigoCupon}</span>
          <span className="font-medium text-emerald-700">-{formatARS(descuento)}</span>
        </div>
      ) : null}
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-muted">Flete</span>
        <span className="text-xs text-muted">A coordinar</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-main">Total</span>
        <span className="text-xl font-bold text-primary">{formatARS(total)}</span>
      </div>
    </div>
  );
}

export function CheckoutView() {
  const hasMounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const config = useComercioConfig();
  const ajustes = useAjustes();
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);

  const [inlineLoginOpen, setInlineLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [notasOpen, setNotasOpen] = useState(false);
  const notasRef = useRef<HTMLTextAreaElement>(null);
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega | "">("");
  const [metodoPago, setMetodoPago] = useState<MetodoPagoCheckout | "">("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [codigoCupon, setCodigoCupon] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<Cupon | null>(null);
  const [cuponError, setCuponError] = useState<string | null>(null);
  const [aplicandoCupon, setAplicandoCupon] = useState(false);
  const presupuestoRef = useRef<{ codigo: string; pdfUrl: string } | null>(null);
  const didPrefill = useRef(false);

  const visibleItems = hasMounted ? items : [];
  const subtotal = hasMounted ? getSubtotal() : 0;
  const porcentajeCupon = cuponAplicado ? Number(cuponAplicado.descuentoPorcentaje) : 0;
  const montoFijoCupon = cuponAplicado?.montoFijo != null ? Number(cuponAplicado.montoFijo) : 0;
  const descuentoCupon =
    porcentajeCupon > 0
      ? Math.round(subtotal * (porcentajeCupon / 100) * 100) / 100
      : Math.min(Number.isFinite(montoFijoCupon) ? montoFijoCupon : 0, subtotal);
  const totalConCupon = Math.max(subtotal - descuentoCupon, 0);
  const cantidadProductos = visibleItems.reduce((total, item) => total + item.cantidad, 0);
  const mostrarNotas = notasOpen || Boolean(notas.trim());
  const busy = confirming || downloadingPdf;

  useEffect(() => {
    if (!hasMounted || !authUser || didPrefill.current) return;
    didPrefill.current = true;
    setNombre((current) => current || authUser.nombre);
    const telefonoPerfil = authUser.telefono ?? authUser.telefonoWhatsapp ?? "";
    setTelefono((current) => current || telefonoPerfil);
    const notasPerfil = authUser.notasDireccion?.trim() ?? "";
    if (notasPerfil) {
      setNotas((current) => current || notasPerfil);
    }
  }, [authUser, hasMounted]);

  const resetPresupuesto = () => {
    presupuestoRef.current = null;
  };

  const aplicarCodigoCupon = async () => {
    const codigo = codigoCupon.trim();
    if (!codigo) return;
    setAplicandoCupon(true);
    setCuponError(null);
    try {
      const cupon = await validarCupon(codigo, subtotal);
      setCuponAplicado(cupon);
      setCodigoCupon(cupon.codigo);
      resetPresupuesto();
    } catch (err) {
      setCuponAplicado(null);
      setCuponError(friendlyUserError(err, "Código de descuento inválido o vencido."));
    } finally {
      setAplicandoCupon(false);
    }
  };

  const quitarCupon = () => {
    setCuponAplicado(null);
    setCodigoCupon("");
    setCuponError(null);
    resetPresupuesto();
  };

  const clearFieldError = (...fields: Array<keyof FieldErrors>) => {
    setFormError(null);
    setErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const validateOrShow = (): FieldErrors | null => {
    const nextErrors = validateCheckout({
      nombre,
      telefono,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Completá tu nombre y teléfono para continuar.");
      return null;
    }
    setFormError(null);
    return nextErrors;
  };

  const validateContactoOrShow = (): FieldErrors | null => {
    const nextErrors = validateContacto({ nombre, telefono });
    setErrors((prev) => ({ ...prev, nombre: nextErrors.nombre, telefono: nextErrors.telefono }));
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Completá tu nombre y teléfono para descargar el presupuesto.");
      return null;
    }
    setFormError(null);
    return nextErrors;
  };

  const ensurePedido = async (): Promise<{ codigo: string; pdfUrl: string }> => {
    if (presupuestoRef.current) {
      return presupuestoRef.current;
    }

    const pedido = await crearPedido(
      buildPedidoPayload({
        items: visibleItems,
        nombre,
        telefono,
        notas,
        metodoPago,
        tipoEntrega,
        direccion: authUser?.direccion,
        localidad: authUser?.localidad ?? authUser?.barrio,
        codigoPostal: authUser?.codigoPostal,
        notasDireccion: authUser?.notasDireccion,
        codigoCupon: cuponAplicado?.codigo,
      }),
    );

    const created = {
      codigo: pedido.codigo,
      pdfUrl: resolvePublicPdfUrl(pedido.codigo, pedido.pdfUrl),
    };
    presupuestoRef.current = created;
    return created;
  };

  const onConfirmWhatsApp = async () => {
    if (busy) return;
    if (!validateOrShow()) return;

    setConfirming(true);
    setPdfNotice(null);

    try {
      const pedido = await ensurePedido();
      const message = buildPedidoWhatsAppMessage({
        codigo: pedido.codigo,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        tipoEntregaLabel: tipoEntrega ? TIPO_ENTREGA_LABEL[tipoEntrega] : DIRECCION_A_COORDINAR,
        metodoPagoLabel: metodoPago ? labelMetodoPago(metodoPago) : DIRECCION_A_COORDINAR,
        items: visibleItems,
        total: totalConCupon,
        nombreComercio: config.nombreComercio,
        pdfUrl: pedido.pdfUrl,
        notas,
      });
      const url = buildPedidoWhatsAppUrl(ajustes?.whatsapp ?? "", message);

      clearCart();
      closeCart();
      window.location.href = url;
    } catch (error) {
      resetPresupuesto();
      setFormError(friendlyUserError(error, "No se pudo confirmar el pedido."));
      setConfirming(false);
    }
  };

  const onDownloadPdf = async () => {
    if (busy) return;
    if (!validateContactoOrShow()) return;

    setDownloadingPdf(true);
    setPdfNotice(null);

    try {
      const pedido = await ensurePedido();
      await descargarPdfPresupuesto(pedido.codigo);
      setPdfNotice(`Descargamos el presupuesto ${pedido.codigo}. El carrito sigue disponible para confirmar el pedido.`);
    } catch (error) {
      resetPresupuesto();
      setFormError(friendlyUserError(error, "No se pudo descargar el presupuesto."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const onInlineLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    const emailValue = loginEmail.trim();
    if (!isValidEmail(emailValue)) {
      setLoginError("Ingresá un email válido.");
      return;
    }
    if (loginPassword.length < 6) {
      setLoginError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoginSubmitting(true);
    try {
      await login({ email: emailValue, password: loginPassword });
      setInlineLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-96 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
        </div>
      </section>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-main md:text-3xl">Finalizar Tu Pedido</h1>
        <div className="product-card mx-auto mt-8 max-w-lg p-8 text-center">
          <ShoppingBag className="mx-auto size-12 text-muted" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-main">Tu carrito está vacío</h2>
          <p className="mt-2 text-sm text-muted">
            Agregá materiales del catálogo para armar el pedido o descargar un presupuesto.
          </p>
          <Link
            href="/"
            className="btn-touch mt-6 inline-flex items-center justify-center bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Explorar Catálogo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5 lg:py-8">
      <Link
        href="/productos"
        className="mb-2 flex w-fit items-center gap-1 text-xs font-medium text-slate-600 hover:text-brand-orange sm:text-sm"
      >
        <ArrowLeft className="size-3.5 sm:size-4" aria-hidden />
        Seguir comprando
      </Link>
      <h1 className="mb-3 text-xl font-bold text-main lg:mb-0 lg:text-3xl">Finalizar Tu Pedido</h1>
      <p className="mt-2 hidden max-w-2xl text-sm text-muted lg:block">
        Completá tu nombre y teléfono para enviar tu pedido por WhatsApp o descargar tu presupuesto
        en PDF.
      </p>

      <details className="group product-card overflow-hidden lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary">
            <ShoppingBag className="size-5 shrink-0" aria-hidden />
            <span className="truncate group-open:hidden">
              Ver pedido ({cantidadProductos} {cantidadProductos === 1 ? "producto" : "productos"})
            </span>
            <span className="hidden truncate group-open:inline">Ocultar pedido</span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </span>
          <span className="shrink-0 text-base font-bold text-slate-900">{formatARS(totalConCupon)}</span>
        </summary>
        <div className="border-t border-slate-100 px-4 pt-4 pb-4">
          <ResumenItems items={visibleItems} />
          <Link
            href="/productos"
            className="mt-3 inline-block py-1 text-xs font-semibold text-brand-orange hover:underline"
          >
            + Agregar más productos
          </Link>
          <ResumenTotales
            subtotal={subtotal}
            descuento={descuentoCupon}
            codigoCupon={cuponAplicado?.codigo}
            total={totalConCupon}
          />
        </div>
      </details>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="product-card p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-main">Datos de contacto</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:mt-5 lg:grid-cols-2 lg:gap-4">
            <div>
              <FieldLabel htmlFor="checkout-nombre">Nombre completo</FieldLabel>
              <Input
                id="checkout-nombre"
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                  resetPresupuesto();
                  clearFieldError("nombre");
                }}
                autoComplete="name"
                placeholder="Nombre y apellido"
              />
              {errors.nombre ? (
                <p className="mt-1 text-xs text-accent" role="alert">
                  {errors.nombre}
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="checkout-telefono">Teléfono (WhatsApp)</FieldLabel>
              <Input
                id="checkout-telefono"
                type="tel"
                value={telefono}
                onChange={(event) => {
                  setTelefono(event.target.value);
                  resetPresupuesto();
                  clearFieldError("telefono");
                }}
                autoComplete="tel"
                placeholder="11 1234 5678"
              />
              {errors.telefono ? (
                <p className="mt-1 text-xs text-accent" role="alert">
                  {errors.telefono}
                </p>
              ) : null}
            </div>
          </div>

          {hasMounted && !isAuthenticated ? (
            <div className="mt-4">
              <p className="text-sm text-muted">
                ¿Ya tenés cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setInlineLoginOpen((open) => !open)}
                  aria-expanded={inlineLoginOpen}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Iniciá sesión acá
                </button>
              </p>

              {inlineLoginOpen ? (
                <form onSubmit={onInlineLoginSubmit} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-surface p-4">
                  <div>
                    <label htmlFor="checkout-login-email" className="mb-1.5 block text-sm font-medium text-main">
                      Email
                    </label>
                    <Input
                      id="checkout-login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-login-password" className="mb-1.5 block text-sm font-medium text-main">
                      Contraseña
                    </label>
                    <Input
                      id="checkout-login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  {loginError ? (
                    <p className="text-sm text-accent" role="alert">
                      {loginError}
                    </p>
                  ) : null}
                  <Button type="submit" variant="accent" loading={loginSubmitting} className="w-full">
                    Iniciar sesión
                  </Button>
                  <p className="text-center text-xs text-muted">
                    ¿No tenés cuenta?{" "}
                    <Link
                      href="/login?tab=register&next=/checkout"
                      className="font-semibold text-primary hover:underline"
                    >
                      Registrate
                    </Link>
                  </p>
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 lg:mt-6">
            <TipoEntregaSelector
              value={tipoEntrega}
              onChange={(tipo) => {
                setTipoEntrega(tipo);
                resetPresupuesto();
              }}
            />
          </div>

          <div className="mt-5 lg:mt-6">
            <MetodoPagoSelector
              value={metodoPago}
              onChange={(metodo) => {
                setMetodoPago(metodo);
                resetPresupuesto();
              }}
            />
          </div>

          {!mostrarNotas ? (
            <button
              type="button"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-2 hover:underline lg:hidden"
              aria-expanded={false}
              aria-controls="checkout-notas-campo"
              onClick={() => {
                flushSync(() => setNotasOpen(true));
                notasRef.current?.focus();
              }}
            >
              + Agregar nota o aclaración <span className="ml-1 font-normal text-muted">(opcional)</span>
            </button>
          ) : null}

          <div id="checkout-notas-campo" className={cn("mt-5 lg:mt-6 lg:block", !mostrarNotas && "hidden")}>
            <FieldLabel htmlFor="checkout-notas" optional>
              Notas o aclaraciones
            </FieldLabel>
            <textarea
              ref={notasRef}
              id="checkout-notas"
              value={notas}
              onChange={(event) => {
                setNotas(event.target.value);
                resetPresupuesto();
              }}
              rows={3}
              maxLength={1800}
              placeholder="Horario preferido, referencia de la obra, etc."
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-main placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <aside className="product-card h-fit self-start p-4 lg:sticky lg:top-24 lg:p-5">
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-main">Resumen del pedido</h2>
            <ResumenItems
              items={visibleItems}
              className="mt-4 max-h-[min(18rem,calc(100vh_-_30rem))] min-h-28 overflow-y-auto pr-1"
            />
          </div>

          <div className="lg:mt-4 lg:border-t lg:border-slate-100 lg:pt-4">
            <p className="text-sm font-medium text-main">Tengo un código de descuento</p>
            {cuponAplicado ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span>
                  {cuponAplicado.codigo} ·{" "}
                  {porcentajeCupon > 0
                    ? `${porcentajeCupon}%`
                    : montoFijoCupon > 0
                      ? formatARS(montoFijoCupon)
                      : "aplicado"}
                </span>
                <button type="button" className="text-xs font-semibold underline" onClick={quitarCupon}>
                  Quitar
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Input
                  value={codigoCupon}
                  onChange={(event) => {
                    setCodigoCupon(event.target.value);
                    setCuponError(null);
                  }}
                  placeholder="VERANO10"
                  aria-label="Código de descuento"
                />
                <Button
                  variant="outline"
                  className="shrink-0 px-3"
                  loading={aplicandoCupon}
                  disabled={!codigoCupon.trim() || busy}
                  onClick={() => void aplicarCodigoCupon()}
                >
                  Aplicar
                </Button>
              </div>
            )}
            {cuponError ? (
              <p className="mt-1 text-xs text-accent" role="alert">
                {cuponError}
              </p>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <ResumenTotales
              subtotal={subtotal}
              descuento={descuentoCupon}
              codigoCupon={cuponAplicado?.codigo}
              total={totalConCupon}
            />
          </div>

          {formError ? (
            <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent" role="alert">
              {formError}
            </p>
          ) : null}

          {pdfNotice ? (
            <p className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">{pdfNotice}</p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            <Button variant="accent" className="w-full" loading={confirming} disabled={busy} onClick={onConfirmWhatsApp}>
              <MessageCircle className="size-4" aria-hidden />
              Confirmar Pedido por WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full"
              loading={downloadingPdf}
              disabled={busy}
              onClick={onDownloadPdf}
            >
              <FileText className="size-4" aria-hidden />
              Descargar Presupuesto en PDF
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
