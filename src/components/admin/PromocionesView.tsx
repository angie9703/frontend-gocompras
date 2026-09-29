"use client";

import { CalendarRange, Eye, ImageOff, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OfertaPreviewModal } from "@/components/admin/OfertaPreviewModal";
import { ProductoCombobox } from "@/components/admin/ProductoCombobox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminCardClass,
  adminFieldClass,
  adminTableHeadClass,
  adminTableRowClass,
  estadoOferta,
  estadoOfertaBadgeClass,
  selectClass,
  tabClass,
} from "@/lib/adminUi";
import { getProductoImagen } from "@/lib/catalog";
import { formatARS } from "@/lib/money";
import {
  createAdminCupon,
  createAdminPromocion,
  getAdminCategorias,
  listAdminCupones,
  listAdminProductos,
  listAdminPromociones,
  listSubcategorias,
  updateAdminCupon,
  updateAdminPromocion,
  type SubcategoriaItem,
} from "@/services/admin";
import type { AlcancePromocion, Categoria, Cupon, Producto, Promocion } from "@/types";

type AlcanceOferta = "ALL" | "CATEGORY" | "SUBCATEGORY" | "PRODUCT";

function alcanceDePromo(promo: Promocion): AlcancePromocion {
  if (
    promo.alcance === "ALL" ||
    promo.alcance === "CATEGORY" ||
    promo.alcance === "SUBCATEGORY" ||
    promo.alcance === "PRODUCT" ||
    promo.alcance === "MARCA"
  ) {
    return promo.alcance;
  }
  if (promo.tipoAplicacion === "CATEGORIA") return "CATEGORY";
  if (promo.tipoAplicacion === "SUBCATEGORIA") return "SUBCATEGORY";
  if (promo.tipoAplicacion === "PRODUCTO") return "PRODUCT";
  if (promo.tipoAplicacion === "MARCA") return "MARCA";
  return "ALL";
}

function idProducto(producto: Producto): number {
  return (producto as Producto & { productoId?: number }).productoId ?? producto.id;
}

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return {
    fechaInicio: start.toISOString().slice(0, 10),
    fechaFin: end.toISOString().slice(0, 10),
  };
}

function isCuponPromo(promo: Promocion) {
  return promo.titulo.toUpperCase().startsWith("CUPON:");
}

function formatRangoFechas(inicio: string, fin: string): string {
  const from = new Date(inicio);
  const to = new Date(fin);
  const fmt = (date: Date) =>
    Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(from)} → ${fmt(to)}`;
}

function productosDeOferta(
  promo: Promocion,
  productos: Producto[],
  subcategorias: SubcategoriaItem[] = [],
): Producto[] {
  const alcance = alcanceDePromo(promo);
  if (alcance === "PRODUCT" && promo.productoId) {
    const match = productos.find(
      (producto) => idProducto(producto) === promo.productoId || producto.id === promo.productoId,
    );
    return match ? [match] : [];
  }
  if (alcance === "SUBCATEGORY" && promo.subcategoriaId) {
    const sub = subcategorias.find((item) => item.id === promo.subcategoriaId);
    if (!sub) return [];
    return productos
      .filter(
        (producto) =>
          producto.categoria?.id === sub.categoriaId &&
          (producto.subcategoria ?? "").trim().toLowerCase() === sub.nombre.trim().toLowerCase(),
      )
      .slice(0, 3);
  }
  if (alcance === "CATEGORY" && promo.categoriaId) {
    return productos.filter((producto) => producto.categoria?.id === promo.categoriaId).slice(0, 3);
  }
  return productos.slice(0, 3);
}

function labelDescuento(cupon: Cupon): string {
  if (cupon.montoFijo) return formatARS(Number(cupon.montoFijo));
  const porcentaje = Number(cupon.descuentoPorcentaje);
  return Number.isFinite(porcentaje) && porcentaje > 0 ? `${porcentaje}%` : "—";
}

type Tab = "cupones" | "ofertas";

export function PromocionesView() {
  const [tab, setTab] = useState<Tab>("cupones");
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<SubcategoriaItem[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCupon, setSavingCupon] = useState(false);
  const [savingOferta, setSavingOferta] = useState(false);
  const [previewPromo, setPreviewPromo] = useState<Promocion | null>(null);
  const dates = defaultDates();
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "fijo">("porcentaje");
  const [cuponForm, setCuponForm] = useState({
    codigo: "",
    valor: "10",
    limiteUso: "",
    fechaLimite: dates.fechaFin,
  });
  const [ofertaForm, setOfertaForm] = useState({
    titulo: "",
    descuentoPorcentaje: "10",
    alcance: "PRODUCT" as AlcanceOferta,
    categoriaId: "",
    subcategoriaId: "",
    productoId: "",
    fechaInicio: dates.fechaInicio,
    fechaFin: dates.fechaFin,
  });

  const ofertas = useMemo(() => promos.filter((promo) => !isCuponPromo(promo)), [promos]);
  const subcategoriasDeCategoria = useMemo(
    () => subcategorias.filter((item) => String(item.categoriaId) === ofertaForm.categoriaId),
    [subcategorias, ofertaForm.categoriaId],
  );

  const reload = async () => {
    const [nextCupones, nextPromos, nextCategorias, nextSubcategorias, nextProductos] = await Promise.all([
      listAdminCupones(),
      listAdminPromociones(),
      getAdminCategorias(),
      listSubcategorias(),
      listAdminProductos({ pageSize: 200 }),
    ]);
    setCupones(nextCupones);
    setPromos(nextPromos);
    setCategorias(nextCategorias);
    setSubcategorias(nextSubcategorias);
    setProductos(nextProductos.items);
  };

  useEffect(() => {
    setLoading(true);
    void reload()
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el panel."))
      .finally(() => setLoading(false));
  }, []);

  const createCupon = async () => {
    setSavingCupon(true);
    setError(null);
    try {
      await createAdminCupon({
        codigo: cuponForm.codigo.trim(),
        descuentoPorcentaje: tipoDescuento === "porcentaje" ? Number(cuponForm.valor) : null,
        montoFijo: tipoDescuento === "fijo" ? Number(cuponForm.valor) : null,
        limiteUso: cuponForm.limiteUso ? Number(cuponForm.limiteUso) : null,
        fechaLimite: cuponForm.fechaLimite
          ? new Date(`${cuponForm.fechaLimite}T23:59:59`).toISOString()
          : null,
        activo: true,
      });
      setCuponForm((current) => ({ ...current, codigo: "", valor: "10", limiteUso: "" }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cupón.");
    } finally {
      setSavingCupon(false);
    }
  };

  const createOferta = async () => {
    setSavingOferta(true);
    setError(null);
    try {
      const producto = productos.find((item) => String(item.id) === ofertaForm.productoId);
      const categoria = categorias.find((item) => String(item.id) === ofertaForm.categoriaId);
      const subcategoria = subcategorias.find((item) => String(item.id) === ofertaForm.subcategoriaId);
      const tituloAutomatico =
        ofertaForm.alcance === "PRODUCT"
          ? `Oferta ${producto?.nombre ?? "producto"}`
          : ofertaForm.alcance === "CATEGORY"
            ? `Oferta ${categoria?.nombre ?? "categoría"}`
            : ofertaForm.alcance === "SUBCATEGORY"
              ? `Oferta ${subcategoria?.nombre ?? "subcategoría"}`
              : "Oferta en toda la tienda";
      await createAdminPromocion({
        titulo: ofertaForm.titulo.trim() || tituloAutomatico,
        descuentoPorcentaje: Number(ofertaForm.descuentoPorcentaje),
        alcance: ofertaForm.alcance,
        categoriaId: ofertaForm.alcance === "CATEGORY" ? Number(ofertaForm.categoriaId) : undefined,
        subcategoriaId: ofertaForm.alcance === "SUBCATEGORY" ? Number(ofertaForm.subcategoriaId) : undefined,
        productoId: ofertaForm.alcance === "PRODUCT" ? Number(ofertaForm.productoId) : undefined,
        fechaInicio: new Date(`${ofertaForm.fechaInicio}T00:00:00`).toISOString(),
        fechaFin: new Date(`${ofertaForm.fechaFin}T23:59:59`).toISOString(),
        activo: true,
      });
      setOfertaForm((current) => ({ ...current, titulo: "", categoriaId: "", subcategoriaId: "", productoId: "" }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la oferta.");
    } finally {
      setSavingOferta(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Cupones y promociones</h2>
        <p className="mt-1 text-sm text-slate-500">
          Creá códigos de checkout o aplicá un descuento directo sobre la tienda, una categoría, una subcategoría o un producto.
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Tipo de promoción">
        <button type="button" role="tab" aria-selected={tab === "cupones"} className={tabClass(tab === "cupones")} onClick={() => setTab("cupones")}>
          Cupones de descuento
        </button>
        <button type="button" role="tab" aria-selected={tab === "ofertas"} className={tabClass(tab === "ofertas")} onClick={() => setTab("ofertas")}>
          Ofertas directas
        </button>
      </div>

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

      {tab === "cupones" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <section className={`${adminCardClass} h-fit space-y-4 p-5`}>
            <h3 className="font-semibold text-slate-900">Nuevo cupón</h3>

            <label className={adminFieldClass}>
              Código del cupón
              <Input
                className="mt-1"
                value={cuponForm.codigo}
                onChange={(event) => setCuponForm((current) => ({ ...current, codigo: event.target.value }))}
                placeholder='Ej. "VERANO10"'
              />
            </label>

            <div>
              <span className={adminFieldClass}>Tipo de descuento</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={tabClass(tipoDescuento === "porcentaje")}
                  onClick={() => setTipoDescuento("porcentaje")}
                >
                  % Porcentaje
                </button>
                <button
                  type="button"
                  className={tabClass(tipoDescuento === "fijo")}
                  onClick={() => setTipoDescuento("fijo")}
                >
                  $ Monto fijo
                </button>
              </div>
            </div>

            <label className={adminFieldClass}>
              {tipoDescuento === "porcentaje" ? "Porcentaje de descuento" : "Monto en pesos"}
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={tipoDescuento === "porcentaje" ? 100 : undefined}
                value={cuponForm.valor}
                onChange={(event) => setCuponForm((current) => ({ ...current, valor: event.target.value }))}
                placeholder={tipoDescuento === "porcentaje" ? "% de descuento" : "Monto en pesos"}
              />
            </label>

            <label className={adminFieldClass}>
              Límite de uso
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={cuponForm.limiteUso}
                onChange={(event) => setCuponForm((current) => ({ ...current, limiteUso: event.target.value }))}
                placeholder="Opcional"
              />
            </label>

            <label className={adminFieldClass}>
              Fecha límite
              <Input
                className="mt-1"
                type="date"
                value={cuponForm.fechaLimite}
                onChange={(event) => setCuponForm((current) => ({ ...current, fechaLimite: event.target.value }))}
              />
            </label>

            <Button
              variant="dark"
              className="w-full"
              onClick={() => void createCupon()}
              loading={savingCupon}
              disabled={!cuponForm.codigo.trim() || !cuponForm.valor}
            >
              Crear cupón
            </Button>
          </section>

          <section className={`${adminCardClass} overflow-x-auto p-5`}>
            <h3 className="font-semibold text-slate-900">Cupones creados</h3>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Descuento</th>
                  <th className="px-3 py-2.5">Usos</th>
                  <th className="px-3 py-2.5">Vence</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cupones.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={6}>
                      Todavía no hay cupones.
                    </td>
                  </tr>
                ) : (
                  cupones.map((cupon) => {
                    const usos = cupon.usos ?? cupon.usosActuales ?? 0;
                    const vencimiento = cupon.fechaLimite ?? cupon.fechaExpiracion;
                    return (
                      <tr key={cupon.id} className={adminTableRowClass}>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{cupon.codigo}</td>
                        <td className="px-3 py-2.5 text-slate-800">{labelDescuento(cupon)}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {usos}
                            {cupon.limiteUso != null ? ` / ${cupon.limiteUso}` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {vencimiento ? new Date(vencimiento).toLocaleDateString("es-AR") : "Sin fecha"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              cupon.activo
                                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {cupon.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            variant="subtle"
                            className="min-h-9 px-3 text-xs"
                            onClick={() =>
                              void updateAdminCupon(cupon.id, { activo: !cupon.activo })
                                .then(() => reload())
                                .catch((err) =>
                                  setError(err instanceof Error ? err.message : "No se pudo actualizar."),
                                )
                            }
                          >
                            {cupon.activo ? "Desactivar" : "Activar"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        </div>
      ) : (
        <div className="space-y-5">
        <section className={`${adminCardClass} space-y-5 p-5`}>
          <div>
            <h3 className="font-semibold text-slate-900">Oferta inmediata</h3>
            <p className="mt-1 text-xs text-slate-500">
              Aplicá un descuento directo sobre toda la tienda, una categoría, una subcategoría o un producto, sin necesidad de código.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className={`${adminFieldClass} md:col-span-2`}>
              Título de la oferta
              <Input
                className="mt-1"
                value={ofertaForm.titulo}
                onChange={(event) => setOfertaForm((current) => ({ ...current, titulo: event.target.value }))}
                placeholder="Opcional, se genera automáticamente si lo dejás vacío"
              />
            </label>

            <label className={adminFieldClass}>
              Porcentaje de descuento
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={100}
                value={ofertaForm.descuentoPorcentaje}
                onChange={(event) =>
                  setOfertaForm((current) => ({ ...current, descuentoPorcentaje: event.target.value }))
                }
                placeholder="% de descuento"
              />
            </label>

            <label className={adminFieldClass}>
              Alcance de la oferta
              <select
                value={ofertaForm.alcance}
                onChange={(event) =>
                  setOfertaForm((current) => ({
                    ...current,
                    alcance: event.target.value as AlcanceOferta,
                    categoriaId: "",
                    subcategoriaId: "",
                    productoId: "",
                  }))
                }
                className={`${selectClass} mt-1`}
              >
                <option value="ALL">Toda la tienda</option>
                <option value="CATEGORY">Una categoría</option>
                <option value="SUBCATEGORY">Una subcategoría</option>
                <option value="PRODUCT">Un producto</option>
              </select>
            </label>

            {ofertaForm.alcance === "CATEGORY" || ofertaForm.alcance === "SUBCATEGORY" ? (
              <label className={adminFieldClass}>
                Categoría
                <select
                  value={ofertaForm.categoriaId}
                  onChange={(event) =>
                    setOfertaForm((current) => ({
                      ...current,
                      categoriaId: event.target.value,
                      subcategoriaId: "",
                    }))
                  }
                  className={`${selectClass} mt-1`}
                >
                  <option value="">Elegí una categoría</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {ofertaForm.alcance === "SUBCATEGORY" ? (
              <label className={adminFieldClass}>
                Subcategoría
                <select
                  value={ofertaForm.subcategoriaId}
                  onChange={(event) =>
                    setOfertaForm((current) => ({ ...current, subcategoriaId: event.target.value }))
                  }
                  className={`${selectClass} mt-1`}
                  disabled={!ofertaForm.categoriaId}
                >
                  <option value="">
                    {ofertaForm.categoriaId ? "Elegí una subcategoría" : "Primero elegí una categoría"}
                  </option>
                  {subcategoriasDeCategoria.map((subcategoria) => (
                    <option key={subcategoria.id} value={subcategoria.id}>
                      {subcategoria.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {ofertaForm.alcance === "PRODUCT" ? (
              <label className={`${adminFieldClass} md:col-span-2`}>
                Producto
                <div className="mt-1">
                  <ProductoCombobox
                    productos={productos}
                    value={ofertaForm.productoId}
                    onChange={(productoId) => setOfertaForm((current) => ({ ...current, productoId }))}
                  />
                </div>
              </label>
            ) : null}

            <label className={adminFieldClass}>
              Fecha de inicio
              <Input
                className="mt-1"
                type="date"
                value={ofertaForm.fechaInicio}
                onChange={(event) => setOfertaForm((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </label>
            <label className={adminFieldClass}>
              Fecha de fin
              <Input
                className="mt-1"
                type="date"
                value={ofertaForm.fechaFin}
                onChange={(event) => setOfertaForm((current) => ({ ...current, fechaFin: event.target.value }))}
              />
            </label>
          </div>

          <Button
            variant="dark"
            onClick={() => void createOferta()}
            loading={savingOferta}
            disabled={
              !ofertaForm.descuentoPorcentaje ||
              (ofertaForm.alcance === "CATEGORY" && !ofertaForm.categoriaId) ||
              (ofertaForm.alcance === "SUBCATEGORY" && (!ofertaForm.categoriaId || !ofertaForm.subcategoriaId)) ||
              (ofertaForm.alcance === "PRODUCT" && !ofertaForm.productoId)
            }
          >
            Aplicar descuento
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-semibold text-slate-900">Ofertas creadas</h3>
            <p className="mt-1 text-xs text-slate-500">
              Cada tarjeta muestra el alcance, la vigencia y cómo queda el precio en la tienda.
            </p>
          </div>
          {ofertas.length === 0 ? (
            <div className={`${adminCardClass} px-5 py-10 text-center text-sm text-slate-500`}>
              Todavía no hay ofertas directas.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {ofertas.map((promo) => {
                const estado = estadoOferta(promo);
                const porcentaje = Number(promo.descuentoPorcentaje);
                const alcance = alcanceDePromo(promo);
                const subcategoria = subcategorias.find((item) => item.id === promo.subcategoriaId) ?? null;
                const categoria =
                  categorias.find((item) => item.id === promo.categoriaId) ??
                  categorias.find((item) => item.id === subcategoria?.categoriaId) ??
                  null;
                const targets = productosDeOferta(promo, productos, subcategorias);
                const producto = alcance === "PRODUCT" ? (targets[0] ?? null) : null;
                const primeraVariante = producto?.variantes?.[0];
                const sku = primeraVariante?.sku ?? (producto as (Producto & { sku?: string }) | null)?.sku ?? "";
                const thumb = producto ? getProductoImagen(producto, primeraVariante) : null;
                const aplicaEn =
                  alcance === "PRODUCT"
                    ? (producto?.nombre ?? "Producto no encontrado")
                    : alcance === "CATEGORY"
                      ? (categoria?.nombre ?? "Sin categoría")
                      : alcance === "SUBCATEGORY"
                        ? (subcategoria?.nombre ?? "Sin subcategoría")
                        : alcance === "MARCA"
                          ? "Marca"
                          : "Toda la tienda";
                return (
                  <article key={promo.id} className={`${adminCardClass} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-slate-900">{promo.titulo}</h4>
                        <p className="mt-1 text-sm font-semibold text-emerald-700">
                          {Number.isFinite(porcentaje) && porcentaje > 0 ? `${porcentaje}% de descuento` : "Sin descuento"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estadoOfertaBadgeClass(estado)}`}>
                        {estado}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                        {thumb ? (
                          <img src={thumb} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-slate-400">
                            {alcance === "CATEGORY" || alcance === "SUBCATEGORY" ? (
                              <Tag className="size-5" />
                            ) : (
                              <ImageOff className="size-5" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Aplica en</p>
                        <p className="truncate font-medium text-slate-900">{aplicaEn}</p>
                        {alcance === "PRODUCT" ? <p className="text-xs text-slate-500">SKU {sku || "—"}</p> : null}
                        {alcance === "SUBCATEGORY" && categoria ? (
                          <p className="text-xs text-slate-500">{categoria.nombre}</p>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600">
                      <CalendarRange className="size-4 text-slate-400" aria-hidden />
                      {formatRangoFechas(promo.fechaInicio, promo.fechaFin)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="subtle" className="min-h-9 px-3 text-xs" onClick={() => setPreviewPromo(promo)}>
                        <Eye className="size-3.5" aria-hidden />
                        Ver vista previa
                      </Button>
                      <Button
                        variant="subtle"
                        className="min-h-9 px-3 text-xs"
                        onClick={() =>
                          void updateAdminPromocion(promo.id, { activo: !promo.activo })
                            .then(() => reload())
                            .catch((err) => setError(err instanceof Error ? err.message : "No se pudo actualizar."))
                        }
                      >
                        {promo.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </div>
      )}

      {previewPromo ? (
        <OfertaPreviewModal
          promo={previewPromo}
          productos={productosDeOferta(previewPromo, productos, subcategorias)}
          categoria={
            categorias.find((item) => item.id === previewPromo.categoriaId) ??
            categorias.find(
              (item) => item.id === subcategorias.find((sub) => sub.id === previewPromo.subcategoriaId)?.categoriaId,
            ) ??
            null
          }
          subcategoriaNombre={subcategorias.find((item) => item.id === previewPromo.subcategoriaId)?.nombre ?? null}
          onClose={() => setPreviewPromo(null)}
        />
      ) : null}
    </div>
  );
}
