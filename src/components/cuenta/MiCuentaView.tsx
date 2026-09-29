"use client";

import { ClipboardList, Eye, FileText, KeyRound, MessageCircle, Package, Pencil, RotateCcw, UserRound, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatARS } from "@/lib/money";
import { useHasMounted } from "@/lib/useHasMounted";
import { buildPedidoWhatsAppMessage, buildPedidoWhatsAppUrl } from "@/lib/whatsapp";
import { useAjustes, whatsappUrlFromAjustes } from "@/store/useAjustesStore";
import { changePassword } from "@/services/auth";
import { descargarPdfPresupuesto, getMisPedidos } from "@/services/pedidos";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useComercioConfig } from "@/store/useConfigStore";
import type { CartItem, EstadoPedido, MetodoPago, Pedido, TipoEntrega } from "@/types";
import { labelMetodoPago } from "@/components/checkout/MetodoPagoSelector";

type CuentaTab = "pedidos" | "datos";
type HistorialTab = "pedidos" | "presupuestos";

const TIPO_ENTREGA_LABEL: Record<TipoEntrega, string> = {
  ENVIO_DOMICILIO: "Envío a domicilio",
  PUNTO_SEGURO: "Punto seguro de encuentro",
};

const ESTADOS_PRESUPUESTO = new Set([
  "PENDIENTE",
  "PENDIENTE_PAGO",
  "SOLO_PDF",
  "CANCELADO",
]);

const ESTADOS_PEDIDO = new Set([
  "PAGADO",
  "EN_PREPARACION",
  "ENVIADO",
  "LISTO_ENTREGA",
  "ENTREGADO",
  "COMPLETADO",
]);

const ESTADO_PRESUPUESTO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PENDIENTE_PAGO: "Pendiente",
  SOLO_PDF: "Solo PDF",
  CANCELADO: "Cancelado",
};

const ESTADO_ENTREGA_LABEL: Record<string, string> = {
  PAGADO: "En preparación",
  EN_PREPARACION: "En preparación",
  ENVIADO: "En camino",
  LISTO_ENTREGA: "En camino",
  ENTREGADO: "Entregado",
  COMPLETADO: "Entregado",
};

function formatFechaPedido(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function totalPedido(pedido: Pedido): number {
  const raw = pedido.totalConEnvio ?? pedido.total;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function formatTipoEntrega(pedido: Pedido): string {
  const tipo = pedido.envio?.tipoEntrega;
  if (!tipo) return "A coordinar";
  return TIPO_ENTREGA_LABEL[tipo] ?? tipo;
}

function metodoPagoPedido(pedido: Pedido): MetodoPago | undefined {
  return pedido.metodoPago ?? pedido.pago?.metodo;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function esPresupuesto(estado: string): boolean {
  return ESTADOS_PRESUPUESTO.has(estado);
}

function esPedidoConcretado(estado: string): boolean {
  return ESTADOS_PEDIDO.has(estado);
}

function puedeVolverAPedir(estado: string): boolean {
  return estado === "ENTREGADO" || estado === "COMPLETADO";
}

function labelEstadoHistorial(estado: string, vista: HistorialTab): string {
  if (vista === "presupuestos") {
    return ESTADO_PRESUPUESTO_LABEL[estado] ?? estado;
  }
  return ESTADO_ENTREGA_LABEL[estado] ?? estado;
}

function claseEstadoEntrega(estado: string): string {
  if (estado === "ENTREGADO" || estado === "COMPLETADO") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (estado === "ENVIADO" || estado === "LISTO_ENTREGA") {
    return "bg-sky-50 text-sky-700";
  }
  return "bg-slate-100 text-slate-700";
}

function pedidoToCartItems(pedido: Pedido): CartItem[] {
  return pedido.items
    .filter((item) => item.productoVarianteId && item.cantidad > 0)
    .map((item) => {
      const precio = Number(item.precioUnitario);
      return {
        productoId: String(item.productoId),
        varianteId: String(item.productoVarianteId),
        varianteSku: item.sku,
        nombre: item.productoNombre,
        precioUnitario: Number.isFinite(precio) ? precio : 0,
        cantidad: item.cantidad,
        stockDisponible: Math.max(item.cantidad, 1),
        imagenUrl: item.imagenUrl,
      };
    });
}

export function MiCuentaView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const config = useComercioConfig();
  const ajustes = useAjustes();

  const tab: CuentaTab = searchParams.get("tab") === "datos" ? "datos" : "pedidos";
  const historial: HistorialTab =
    searchParams.get("historial") === "presupuestos" ? "presupuestos" : "pedidos";

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);
  const [pdfCodigo, setPdfCodigo] = useState<string | null>(null);
  const [whatsappCodigo, setWhatsappCodigo] = useState<string | null>(null);
  const [reorderCodigo, setReorderCodigo] = useState<string | null>(null);
  const [detalleCodigo, setDetalleCodigo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [notasDireccion, setNotasDireccion] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editingDatos, setEditingDatos] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [contrasenaActual, setContrasenaActual] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user || editingDatos) return;
    setNombre(user.nombre ?? "");
    setTelefono(user.telefono ?? user.telefonoWhatsapp ?? "");
    setEmail(user.email ?? "");
    setDireccion(user.direccion ?? "");
    setLocalidad(user.localidad ?? user.barrio ?? "");
    setCodigoPostal(user.codigoPostal ?? "");
    setNotasDireccion(user.notasDireccion ?? "");
  }, [user, editingDatos]);

  useEffect(() => {
    if (!hasMounted || !isAuthenticated) return;

    let cancelled = false;
    setPedidosLoading(true);
    setPedidosError(null);

    void getMisPedidos()
      .then((items) => {
        if (!cancelled) setPedidos(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPedidosError(error instanceof Error ? error.message : "No se pudieron cargar tus pedidos.");
        }
      })
      .finally(() => {
        if (!cancelled) setPedidosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated]);

  useEffect(() => {
    if (!emailModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!emailSaving) {
          setEmailModalOpen(false);
          setNuevoEmail("");
          setConfirmarEmail("");
          setEmailError(null);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emailModalOpen, emailSaving]);

  const pedidosConcretados = useMemo(
    () => pedidos.filter((pedido) => esPedidoConcretado(pedido.estado)),
    [pedidos],
  );
  const presupuestos = useMemo(
    () => pedidos.filter((pedido) => esPresupuesto(pedido.estado)),
    [pedidos],
  );
  const historialItems = historial === "presupuestos" ? presupuestos : pedidosConcretados;

  const setTab = (next: CuentaTab) => {
    if (next === "datos") {
      router.replace("/perfil?tab=datos");
      return;
    }
    router.replace(`/perfil?tab=pedidos&historial=${historial}`);
  };

  const setHistorial = (next: HistorialTab) => {
    setDetalleCodigo(null);
    router.replace(`/perfil?tab=pedidos&historial=${next}`);
  };

  const onDownloadPdf = async (codigo: string) => {
    setActionError(null);
    setActionNotice(null);
    setPdfCodigo(codigo);
    try {
      await descargarPdfPresupuesto(codigo);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo descargar el presupuesto.");
    } finally {
      setPdfCodigo(null);
    }
  };

  const onConsultarWhatsApp = (pedido: Pedido) => {
    setActionError(null);
    setActionNotice(null);
    const telefonoCliente =
      pedido.cliente?.telefonoWhatsapp ?? user?.telefono ?? user?.telefonoWhatsapp ?? "";
    const nombreCliente = pedido.cliente?.nombre ?? user?.nombre ?? "";
    const metodo = metodoPagoPedido(pedido);

    const whatsappUrl = whatsappUrlFromAjustes(ajustes);
    if (!whatsappUrl) {
      setActionError("No hay un WhatsApp de ventas configurado para consultar el pedido.");
      return;
    }

    setWhatsappCodigo(pedido.codigo);
    try {
      const message = buildPedidoWhatsAppMessage({
        codigo: pedido.codigo,
        nombre: nombreCliente,
        telefono: telefonoCliente,
        tipoEntregaLabel: formatTipoEntrega(pedido),
        metodoPagoLabel: metodo ? labelMetodoPago(metodo) : "A coordinar",
        items: pedido.items.map((item) => ({
          nombre: item.productoNombre,
          varianteSku: item.sku,
          cantidad: item.cantidad,
          precioUnitario: Number(item.precioUnitario),
        })),
        total: totalPedido(pedido),
        nombreComercio: config.nombreComercio,
        pdfUrl: pedido.pdfUrl,
      });
      window.location.href = buildPedidoWhatsAppUrl(ajustes?.whatsapp ?? "", message);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo armar el mensaje de WhatsApp.");
      setWhatsappCodigo(null);
    }
  };

  const onVolverAPedir = (pedido: Pedido) => {
    setActionError(null);
    setActionNotice(null);
    const items = pedidoToCartItems(pedido);
    if (items.length === 0) {
      setActionError("Este pedido no tiene ítems para volver a pedir.");
      return;
    }

    setReorderCodigo(pedido.codigo);
    try {
      for (const item of items) {
        addItem(item);
      }
      openCart();
      router.push("/checkout");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudieron agregar los ítems al carrito.");
      setReorderCodigo(null);
    }
  };

  const restoreDatosFromUser = () => {
    if (!user) return;
    setNombre(user.nombre ?? "");
    setTelefono(user.telefono ?? user.telefonoWhatsapp ?? "");
    setDireccion(user.direccion ?? "");
    setLocalidad(user.localidad ?? user.barrio ?? "");
    setCodigoPostal(user.codigoPostal ?? "");
    setNotasDireccion(user.notasDireccion ?? "");
  };

  const startEditDatos = () => {
    setProfileError(null);
    setProfileNotice(null);
    setEditingDatos(true);
  };

  const cancelEditDatos = () => {
    restoreDatosFromUser();
    setProfileError(null);
    setProfileNotice(null);
    setEditingDatos(false);
  };

  const openEmailModal = () => {
    setEmailError(null);
    setNuevoEmail("");
    setConfirmarEmail("");
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    if (emailSaving) return;
    setEmailModalOpen(false);
    setNuevoEmail("");
    setConfirmarEmail("");
    setEmailError(null);
  };

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDatos) return;
    setProfileError(null);
    setProfileNotice(null);

    if (!nombre.trim()) {
      setProfileError("Ingresá tu nombre.");
      return;
    }
    if (digitsOnly(telefono).length < 8) {
      setProfileError("Ingresá un teléfono de WhatsApp válido.");
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        localidad: localidad.trim(),
        codigoPostal: codigoPostal.trim(),
        notasDireccion: notasDireccion.trim(),
      });
      setProfileNotice("Tus datos se actualizaron. Se van a precargar en el próximo pedido.");
      setEditingDatos(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "No se pudieron guardar tus datos.");
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError(null);

    const emailNuevo = nuevoEmail.trim().toLowerCase();
    const emailConfirmado = confirmarEmail.trim().toLowerCase();

    if (!isValidEmail(emailNuevo)) {
      setEmailError("Ingresá un email válido.");
      return;
    }
    if (emailNuevo !== emailConfirmado) {
      setEmailError("La confirmación no coincide con el nuevo email.");
      return;
    }
    if (emailNuevo === (user?.email ?? "").trim().toLowerCase()) {
      setEmailError("El nuevo email debe ser distinto al actual.");
      return;
    }

    setEmailSaving(true);
    try {
      await updateProfile({
        nombre: user?.nombre ?? nombre.trim(),
        telefono: (user?.telefono ?? user?.telefonoWhatsapp ?? telefono).trim(),
        email: emailNuevo,
      });
      setEmail(emailNuevo);
      setEmailModalOpen(false);
      setNuevoEmail("");
      setConfirmarEmail("");
      setProfileNotice("Tu email se actualizó correctamente.");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "No se pudo actualizar el email.");
    } finally {
      setEmailSaving(false);
    }
  };

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);

    if (contrasenaActual.length < 6) {
      setPasswordError("Ingresá tu contraseña actual.");
      return;
    }
    if (nuevaContrasena.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (nuevaContrasena === contrasenaActual) {
      setPasswordError("La nueva contraseña debe ser distinta a la actual.");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({ contrasenaActual, nuevaContrasena });
      setPasswordNotice("Tu contraseña se actualizó correctamente.");
      setContrasenaActual("");
      setNuevaContrasena("");
      setConfirmarContrasena("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const renderAccionesPresupuesto = (pedido: Pedido, fullWidth: boolean) => {
    const widthClass = fullWidth ? "w-full text-xs" : "text-xs";

    return (
      <div className={cn("flex gap-2", fullWidth ? "grid" : "justify-end")}>
        <Button
          variant="outline"
          className={widthClass}
          loading={pdfCodigo === pedido.codigo}
          onClick={() => void onDownloadPdf(pedido.codigo)}
        >
          <FileText className="size-4" aria-hidden />
          Descargar PDF
        </Button>
        <Button
          variant="ghost"
          className={cn(widthClass, "border border-slate-200 text-slate-700 hover:bg-slate-50")}
          loading={whatsappCodigo === pedido.codigo}
          onClick={() => onConsultarWhatsApp(pedido)}
        >
          <MessageCircle className="size-4" aria-hidden />
          Enviar por WhatsApp
        </Button>
      </div>
    );
  };

  const renderAccionesPedido = (pedido: Pedido, fullWidth: boolean) => {
    const estado = pedido.estado as EstadoPedido | string;
    const widthClass = fullWidth ? "w-full text-xs" : "text-xs";

    if (puedeVolverAPedir(estado)) {
      return (
        <div className={cn("flex gap-2", fullWidth ? "grid" : "justify-end")}>
          <Button
            variant="accent"
            className={widthClass}
            loading={reorderCodigo === pedido.codigo}
            onClick={() => onVolverAPedir(pedido)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Volver a pedir
          </Button>
        </div>
      );
    }

    return (
      <div className={cn("flex gap-2", fullWidth ? "grid" : "justify-end")}>
        <Button
          variant="outline"
          className={widthClass}
          onClick={() => setDetalleCodigo((current) => (current === pedido.codigo ? null : pedido.codigo))}
        >
          <Eye className="size-4" aria-hidden />
          {detalleCodigo === pedido.codigo ? "Ocultar detalle" : "Ver detalle"}
        </Button>
      </div>
    );
  };

  const renderDetallePedido = (pedido: Pedido) => {
    const metodo = metodoPagoPedido(pedido);

    return (
      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ítems</p>
        <ul className="mt-2 grid gap-1.5">
          {pedido.items.map((item) => (
            <li key={`${pedido.codigo}-${item.productoVarianteId}-${item.sku}`} className="flex justify-between gap-3">
              <span className="min-w-0 text-main">
                {item.productoNombre}
                <span className="text-muted">
                  {" "}
                  · {item.sku} × {item.cantidad}
                </span>
              </span>
              <span className="shrink-0 font-medium text-main">
                {formatARS(Number(item.precioUnitario) * item.cantidad)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Entrega: {formatTipoEntrega(pedido)}
          {metodo ? ` · Pago: ${labelMetodoPago(metodo)}` : ""}
        </p>
      </div>
    );
  };

  if (!hasMounted || isLoading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
      </section>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <section className="mx-auto w-full max-w-lg px-4 py-16">
        <div className="product-card p-8 text-center">
          <Package className="mx-auto size-10 text-primary" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-main">Iniciá sesión para ver tu cuenta</h1>
          <p className="mt-2 text-sm text-muted">
            Con tu cuenta podés consultar tus pedidos, descargar presupuestos y actualizar tus datos.
          </p>
          <Button variant="accent" className="mt-6" onClick={() => router.push("/login?next=/perfil")}>
            Ir a iniciar sesión
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-main md:text-3xl">Mi cuenta</h1>
      <p className="mt-1 text-sm text-muted">Hola {user.nombre}. Acá están tus pedidos y tus datos de contacto.</p>

      <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("pedidos")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors",
            tab === "pedidos" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main",
          )}
        >
          <Package className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Mis Pedidos y Presupuestos</span>
          <span className="sm:hidden">Pedidos</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("datos")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors",
            tab === "datos" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main",
          )}
        >
          <UserRound className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Mis Datos</span>
          <span className="sm:hidden">Datos</span>
        </button>
      </div>

      {tab === "pedidos" ? (
        <div className="mt-6">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setHistorial("pedidos")}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors",
                historial === "pedidos" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main",
              )}
            >
              Mis Pedidos
            </button>
            <button
              type="button"
              onClick={() => setHistorial("presupuestos")}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors",
                historial === "presupuestos" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main",
              )}
            >
              Mis Presupuestos
            </button>
          </div>

          {actionError ? (
            <p className="mt-3 text-sm text-accent" role="alert">
              {actionError}
            </p>
          ) : null}
          {actionNotice ? <p className="mt-3 text-sm text-primary">{actionNotice}</p> : null}

          {pedidosLoading ? (
            <div className="mt-4 h-40 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
          ) : pedidosError ? (
            <p className="mt-4 text-sm text-accent" role="alert">
              {pedidosError}
            </p>
          ) : historialItems.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              {historial === "pedidos" ? (
                <Package className="mx-auto size-10 text-primary" aria-hidden />
              ) : (
                <ClipboardList className="mx-auto size-10 text-primary" aria-hidden />
              )}
              <p className="mt-4 text-base font-semibold text-main">
                {historial === "pedidos"
                  ? "Aún no tenés pedidos concretados"
                  : "Aún no tenés presupuestos"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {historial === "pedidos"
                  ? "Cuando confirmes una compra, el seguimiento de entrega va a aparecer acá."
                  : "Cuando descargues un PDF o armes una cotización, la vas a ver en esta lista."}
              </p>
              <Button variant="accent" className="mt-6" onClick={() => router.push("/productos")}>
                Ir al catálogo
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Nº de orden</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">{historial === "pedidos" ? "Entrega" : "Estado"}</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialItems.map((pedido) => (
                      <Fragment key={pedido.codigo}>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-primary">{pedido.codigo}</td>
                          <td className="px-4 py-3 text-main">{formatFechaPedido(pedido.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                historial === "pedidos"
                                  ? claseEstadoEntrega(pedido.estado)
                                  : "bg-slate-100 text-slate-700",
                              )}
                            >
                              {labelEstadoHistorial(pedido.estado, historial)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-main">
                            {formatARS(totalPedido(pedido))}
                          </td>
                          <td className="px-4 py-3">
                            {historial === "presupuestos"
                              ? renderAccionesPresupuesto(pedido, false)
                              : renderAccionesPedido(pedido, false)}
                          </td>
                        </tr>
                        {historial === "pedidos" && detalleCodigo === pedido.codigo ? (
                          <tr>
                            <td colSpan={5} className="p-0">
                              {renderDetallePedido(pedido)}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {historialItems.map((pedido) => (
                  <article key={pedido.codigo} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-primary">{pedido.codigo}</p>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            historial === "pedidos"
                              ? claseEstadoEntrega(pedido.estado)
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {labelEstadoHistorial(pedido.estado, historial)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted">Fecha</dt>
                          <dd className="font-medium text-main">{formatFechaPedido(pedido.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Total</dt>
                          <dd className="font-semibold text-main">{formatARS(totalPedido(pedido))}</dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        {historial === "presupuestos"
                          ? renderAccionesPresupuesto(pedido, true)
                          : renderAccionesPedido(pedido, true)}
                      </div>
                    </div>
                    {historial === "pedidos" && detalleCodigo === pedido.codigo
                      ? renderDetallePedido(pedido)
                      : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={onSaveProfile}
            className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-main">Datos personales y de entrega</h2>
                <p className="mt-1 text-sm text-muted">
                  Estos datos se van a precargar automáticamente la próxima vez que armes un pedido.
                </p>
              </div>
              {!editingDatos ? (
                <Button type="button" variant="ghost" className="shrink-0 text-sm" onClick={startEditDatos}>
                  <Pencil className="size-4" aria-hidden />
                  Editar datos
                </Button>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-nombre" className="mb-1.5 block text-sm font-medium text-main">
                  Nombre
                </label>
                <Input
                  id="perfil-nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  autoComplete="name"
                  placeholder="Nombre y apellido"
                  disabled={!editingDatos}
                  readOnly={!editingDatos}
                />
              </div>
              <div>
                <label htmlFor="perfil-telefono" className="mb-1.5 block text-sm font-medium text-main">
                  Teléfono
                </label>
                <Input
                  id="perfil-telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  autoComplete="tel"
                  placeholder="11 1234 5678"
                  disabled={!editingDatos}
                  readOnly={!editingDatos}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="perfil-email" className="block text-sm font-medium text-main">
                  Email
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  onClick={openEmailModal}
                >
                  ¿Cambiar email?
                </button>
              </div>
              <Input
                id="perfil-email"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="tu@email.com"
                disabled
                readOnly
              />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-main">Dirección habitual de entrega</p>
              <p className="mt-0.5 text-xs text-muted">Opcional. Se usa para coordinar envíos a domicilio.</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="perfil-direccion" className="mb-1.5 block text-sm font-medium text-main">
                    Calle y número <span className="font-normal text-muted">(opcional)</span>
                  </label>
                  <Input
                    id="perfil-direccion"
                    value={direccion}
                    onChange={(event) => setDireccion(event.target.value)}
                    autoComplete="street-address"
                    placeholder="Av. San Martín 123"
                    disabled={!editingDatos}
                    readOnly={!editingDatos}
                  />
                </div>
                <div>
                  <label htmlFor="perfil-localidad" className="mb-1.5 block text-sm font-medium text-main">
                    Localidad / barrio <span className="font-normal text-muted">(opcional)</span>
                  </label>
                  <Input
                    id="perfil-localidad"
                    value={localidad}
                    onChange={(event) => setLocalidad(event.target.value)}
                    autoComplete="address-level2"
                    placeholder="Lanús, Villa Martelli..."
                    disabled={!editingDatos}
                    readOnly={!editingDatos}
                  />
                </div>
              </div>

              <div className="mt-4 max-w-xs">
                <label htmlFor="perfil-cp" className="mb-1.5 block text-sm font-medium text-main">
                  Código postal <span className="font-normal text-muted">(opcional)</span>
                </label>
                <Input
                  id="perfil-cp"
                  value={codigoPostal}
                  onChange={(event) => setCodigoPostal(event.target.value)}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="1824"
                  disabled={!editingDatos}
                  readOnly={!editingDatos}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="perfil-notas-direccion" className="mb-1.5 block text-sm font-medium text-main">
                  Notas de entrega <span className="font-normal text-muted">(opcional)</span>
                </label>
                <textarea
                  id="perfil-notas-direccion"
                  value={notasDireccion}
                  onChange={(event) => setNotasDireccion(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder='Ej. "Entregar por la mañana"'
                  disabled={!editingDatos}
                  readOnly={!editingDatos}
                  className="min-h-20 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-main placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60"
                />
              </div>
            </div>

            {profileError ? (
              <p className="mt-4 text-sm text-accent" role="alert">
                {profileError}
              </p>
            ) : null}
            {profileNotice ? (
              <p className="mt-4 text-sm text-primary">{profileNotice}</p>
            ) : null}

            {editingDatos ? (
              <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={cancelEditDatos} disabled={profileSaving}>
                  Cancelar
                </Button>
                <Button type="submit" variant="accent" className="w-full sm:w-auto" loading={profileSaving}>
                  Guardar cambios
                </Button>
              </div>
            ) : null}
          </form>

          <form
            onSubmit={onChangePassword}
            className="flex h-fit flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 shrink-0 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-main">Seguridad</h2>
            </div>
            <p className="mt-1 text-sm text-muted">Actualizá la clave de acceso de tu cuenta.</p>

            <div className="mt-5 grid gap-4">
              <div>
                <label htmlFor="perfil-password-actual" className="mb-1.5 block text-sm font-medium text-main">
                  Contraseña actual
                </label>
                <Input
                  id="perfil-password-actual"
                  type="password"
                  value={contrasenaActual}
                  onChange={(event) => setContrasenaActual(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Tu clave actual"
                />
              </div>
              <div>
                <label htmlFor="perfil-password-nueva" className="mb-1.5 block text-sm font-medium text-main">
                  Nueva contraseña
                </label>
                <Input
                  id="perfil-password-nueva"
                  type="password"
                  value={nuevaContrasena}
                  onChange={(event) => setNuevaContrasena(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label htmlFor="perfil-password-confirm" className="mb-1.5 block text-sm font-medium text-main">
                  Confirmar nueva contraseña
                </label>
                <Input
                  id="perfil-password-confirm"
                  type="password"
                  value={confirmarContrasena}
                  onChange={(event) => setConfirmarContrasena(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Repetí la nueva clave"
                />
              </div>
            </div>

            {passwordError ? (
              <p className="mt-4 text-sm text-accent" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordNotice ? (
              <p className="mt-4 text-sm text-primary">{passwordNotice}</p>
            ) : null}

            <Button type="submit" variant="primary" className="mt-5 w-full" loading={passwordSaving}>
              Actualizar contraseña
            </Button>
          </form>
        </div>
      )}

      {emailModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeEmailModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-email-dialog-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="perfil-email-dialog-title" className="text-lg font-semibold text-main">
                  Cambiar email
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Tu email actual es {email || "—"}. Ingresá el nuevo y confirmalo para actualizarlo.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted hover:bg-slate-100 hover:text-main"
                onClick={closeEmailModal}
                aria-label="Cerrar"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={onChangeEmail} className="mt-5 grid gap-4">
              <div>
                <label htmlFor="perfil-email-nuevo" className="mb-1.5 block text-sm font-medium text-main">
                  Nuevo email
                </label>
                <Input
                  id="perfil-email-nuevo"
                  type="email"
                  value={nuevoEmail}
                  onChange={(event) => setNuevoEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="nuevo@email.com"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="perfil-email-confirm" className="mb-1.5 block text-sm font-medium text-main">
                  Confirmar nuevo email
                </label>
                <Input
                  id="perfil-email-confirm"
                  type="email"
                  value={confirmarEmail}
                  onChange={(event) => setConfirmarEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Repetí el nuevo email"
                />
              </div>

              {emailError ? (
                <p className="text-sm text-accent" role="alert">
                  {emailError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <Button type="button" variant="ghost" onClick={closeEmailModal} disabled={emailSaving}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={emailSaving}>
                  Actualizar email
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
