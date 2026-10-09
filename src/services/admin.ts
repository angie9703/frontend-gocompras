import axios from "axios";
import { friendlyUserError } from "@/lib/errors";
import type {
  AdminCliente,
  ApiErrorResponse,
  ApiResponse,
  Banner,
  CargaMasivaItem,
  Categoria,
  Cupon,
  Pedido,
  Producto,
  Promocion,
} from "@/types";
import api from "@/services/api";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data && data.success === false && data.error?.message) {
      return data.error.message;
    }
    if (error.code === "ERR_NETWORK") {
      return "No pudimos conectar con el servidor. Verificá que el backend esté en marcha.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const record = payload as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
}

export interface AdminListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listAdminClientes(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminCliente[]; meta?: AdminListMeta }> {
  try {
    const { data } = await api.get<ApiResponse<AdminCliente[]>>("/admin/clientes", {
      params: {
        q: params?.q || undefined,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    });
    return {
      items: unwrapList<AdminCliente>(data.data),
      meta: data.meta as AdminListMeta | undefined,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los clientes."));
  }
}

export async function getAdminCliente(id: number): Promise<AdminCliente> {
  try {
    const { data } = await api.get<ApiResponse<AdminCliente>>(`/admin/clientes/${id}`);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la ficha del cliente."));
  }
}

export async function updateAdminCliente(
  id: number,
  payload: Partial<{
    nombre: string;
    email: string | null;
    telefonoWhatsapp: string;
    direccion: string | null;
    notas: string;
    notasInternas: string;
  }>,
): Promise<AdminCliente> {
  try {
    const { data } = await api.patch<ApiResponse<AdminCliente>>(`/admin/clientes/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron guardar los datos del cliente."));
  }
}

export async function updateAdminClienteNotas(id: number, notas: string): Promise<AdminCliente> {
  return updateAdminCliente(id, { notas, notasInternas: notas });
}

export async function listAdminPromociones(): Promise<Promocion[]> {
  try {
    const { data } = await api.get<ApiResponse<Promocion[]>>("/admin/promociones", {
      params: { pageSize: 100 },
    });
    return unwrapList<Promocion>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar las promociones."));
  }
}

export async function createAdminPromocion(payload: {
  titulo: string;
  descuentoPorcentaje: number;
  alcance?: "ALL" | "CATEGORY" | "SUBCATEGORY" | "PRODUCT";
  tipoAplicacion?: Promocion["tipoAplicacion"];
  categoriaId?: number;
  subcategoriaId?: number;
  productoId?: number;
  fechaInicio: string;
  fechaFin: string;
  activo?: boolean;
}): Promise<Promocion> {
  try {
    const { data } = await api.post<ApiResponse<Promocion>>("/admin/promociones", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la promoción."));
  }
}

export async function updateAdminPromocion(
  id: number,
  payload: Partial<{
    titulo: string;
    descuentoPorcentaje: number;
    tipoAplicacion: Promocion["tipoAplicacion"];
    categoriaId: number | null;
    productoId: number | null;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
  }>,
): Promise<Promocion> {
  try {
    const { data } = await api.patch<ApiResponse<Promocion>>(`/admin/promociones/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la promoción."));
  }
}

export async function listAdminBanners(): Promise<Banner[]> {
  try {
    const { data } = await api.get<ApiResponse<Banner[]>>("/admin/banners");
    return unwrapList<Banner>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los banners."));
  }
}

export async function createAdminBanner(payload: {
  titulo?: string | null;
  subtitulo?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imagenUrl?: string | null;
  imagenMobileUrl?: string | null;
  imagen_mobile_url?: string | null;
  link_url?: string | null;
  linkDestino?: string | null;
  orden?: number;
  activo?: boolean;
  publicado?: boolean;
  tarjeta1Visible?: boolean;
  tarjeta2Visible?: boolean;
  tarjeta3Visible?: boolean;
}): Promise<Banner> {
  try {
    const { data } = await api.post<ApiResponse<Banner>>("/admin/banners", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el banner."));
  }
}

export async function updateAdminBanner(
  id: number,
  payload: Partial<{
    titulo: string;
    subtitulo: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    imagenUrl: string | null;
    imagenMobileUrl: string | null;
    imagen_mobile_url: string | null;
    link_url: string | null;
    linkDestino: string | null;
    orden: number;
    activo: boolean;
    publicado: boolean;
    tarjeta1Visible: boolean;
    tarjeta2Visible: boolean;
    tarjeta3Visible: boolean;
  }>,
): Promise<Banner> {
  try {
    const { data } = await api.patch<ApiResponse<Banner>>(`/admin/banners/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el banner."));
  }
}

export async function deleteAdminBanner(id: number): Promise<void> {
  try {
    await api.delete(`/admin/banners/${id}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar el banner."));
  }
}

export type ImportacionLote = {
  id: number;
  nombreArchivo: string;
  cantidadProductos: number;
  productosActuales?: number;
  createdAt: string;
};

export async function importarCargaMasiva(
  items: CargaMasivaItem[],
  nombreArchivo?: string,
): Promise<{
  total: number;
  creados: number;
  actualizados: number;
}> {
  try {
    const payload = {
      nombreArchivo,
      items: items.map((item) => ({
        sku: item.sku,
        nombre: item.nombre,
        grupo_id: item.grupoId ?? item.grupo_id ?? null,
        grupoId: item.grupoId ?? item.grupo_id ?? null,
        variante_nombre: item.varianteNombre ?? item.variante_nombre,
        varianteNombre: item.varianteNombre ?? item.variante_nombre,
        precio: item.precio,
        precioOferta: item.precioOferta,
        stock: item.stock,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        marca: item.marca,
        descripcion: item.descripcion,
        destacado: item.destacado,
        orden: item.orden,
        imagen_url: item.imagenUrl ?? item.imagen_url,
        imagenUrl: item.imagenUrl ?? item.imagen_url,
      })),
    };
    const { data } = await api.post<ApiResponse<{ total: number; creados: number; actualizados: number }>>(
      "/productos/importar",
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo importar el archivo."));
  }
}

export async function deleteAdminProductosMasivo(productIds: number[]): Promise<{ eliminados: number; message?: string }> {
  try {
    const { data } = await api.delete<ApiResponse<{ eliminados: number; message?: string }>>("/productos/borrar-masivo", {
      data: { productIds },
    });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron eliminar los productos."));
  }
}

export async function listAdminImportaciones(): Promise<ImportacionLote[]> {
  try {
    const { data } = await api.get<ApiResponse<ImportacionLote[]>>("/productos/importaciones");
    return unwrapList<ImportacionLote>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el historial de cargas."));
  }
}

export async function deshacerAdminImportacion(loteId: number): Promise<{ eliminados: number; message?: string }> {
  try {
    const { data } = await api.delete<ApiResponse<{ eliminados: number; message?: string }>>(
      `/productos/importaciones/${loteId}`,
    );
    return data.data ?? { eliminados: 0 };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo deshacer la importación."));
  }
}

export async function getAdminCategorias(): Promise<Categoria[]> {
  try {
    const { data } = await api.get<ApiResponse<Categoria[]>>("/categorias");
    return unwrapList<Categoria>(data.data);
  } catch {
    return [];
  }
}

export async function createAdminCategoria(nombre: string): Promise<Categoria> {
  try {
    const { data } = await api.post<ApiResponse<Categoria>>("/admin/categorias", { nombre });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la categoría."));
  }
}

export async function createAdminMarca(nombre: string): Promise<{ id: number; nombre: string }> {
  try {
    const { data } = await api.post<ApiResponse<{ id: number; nombre: string }>>("/admin/marcas", { nombre });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la marca."));
  }
}

export async function listAdminMarcas(): Promise<{ id: number; nombre: string }[]> {
  try {
    const { data } = await api.get<ApiResponse<{ id: number; nombre: string }[]>>("/admin/marcas");
    return unwrapList<{ id: number; nombre: string }>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar las marcas."));
  }
}

export async function updateAdminCategoria(
  id: number,
  payload: { nombre?: string; esDestacada?: boolean; ordenDestacada?: number },
): Promise<Categoria> {
  try {
    const { data } = await api.put<ApiResponse<Categoria>>(`/categorias/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la categoría."));
  }
}

export async function deleteAdminCategoria(id: number): Promise<void> {
  try {
    await api.delete(`/admin/categorias/${id}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la categoría."));
  }
}

export async function deleteAdminMarca(id: number): Promise<void> {
  try {
    await api.delete(`/admin/marcas/${id}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la marca."));
  }
}

export async function updateMarca(id: number, nombre: string): Promise<{ id: number; nombre: string }> {
  try {
    const { data } = await api.put<ApiResponse<{ id: number; nombre: string }>>(`/marcas/${id}`, { nombre });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la marca."));
  }
}

export async function deleteMarca(id: number): Promise<void> {
  try {
    await api.delete(`/marcas/${id}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la marca."));
  }
}

export type SubcategoriaItem = {
  id: number;
  nombre: string;
  categoriaId: number;
  categoria: string | null;
};

export async function listSubcategorias(categoriaId?: number): Promise<SubcategoriaItem[]> {
  try {
    const { data } = await api.get<ApiResponse<SubcategoriaItem[]>>("/subcategorias", {
      params: categoriaId ? { categoriaId } : undefined,
    });
    return unwrapList<SubcategoriaItem>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar las subcategorías."));
  }
}

export async function createSubcategoria(categoriaId: number, nombre: string): Promise<SubcategoriaItem> {
  try {
    const { data } = await api.post<ApiResponse<SubcategoriaItem>>("/subcategorias", { categoriaId, nombre });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la subcategoría."));
  }
}

export async function updateSubcategoria(id: number, nombre: string): Promise<SubcategoriaItem> {
  try {
    const { data } = await api.put<ApiResponse<SubcategoriaItem>>(`/subcategorias/${id}`, { nombre });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la subcategoría."));
  }
}

export async function deleteSubcategoria(id: number): Promise<void> {
  try {
    await api.delete(`/subcategorias/${id}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la subcategoría."));
  }
}

export interface InventarioFila {
  id: number;
  productoId: number;
  sku: string;
  nombre: string;
  nombreCompleto?: string | null;
  variante_nombre: string | null;
  precio: number;
  precioOferta: number | null;
  stock: number;
  estado: "activo" | "pausado";
  esDestacado: boolean;
  marca: string | null;
  categoria: string | null;
  imagenUrl: string | null;
}

export interface InventarioListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listMarcasCatalogo(): Promise<{ id: number; nombre: string }[]> {
  try {
    const { data } = await api.get<ApiResponse<{ id: number; nombre: string }[]>>("/marcas");
    return unwrapList<{ id: number; nombre: string }>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar las marcas."));
  }
}

export async function listAdminInventario(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  categoriaId?: number;
  marcaId?: number;
  subcategoriaId?: string;
}): Promise<{ items: InventarioFila[]; meta: InventarioListMeta }> {
  try {
    const { data } = await api.get<ApiResponse<InventarioFila[]>>("/admin/productos", {
      params: {
        q: params?.q || undefined,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
        sort: params?.sort,
        categoriaId: params?.categoriaId,
        marcaId: params?.marcaId,
        subcategoriaId: params?.subcategoriaId || undefined,
      },
    });
    const meta = (data.meta ?? {}) as Partial<InventarioListMeta> & { pageSize?: number };
    const limit = meta.limit ?? meta.pageSize ?? params?.pageSize ?? 20;
    const total = meta.total ?? 0;
    return {
      items: Array.isArray(data.data) ? data.data : [],
      meta: {
        page: meta.page ?? params?.page ?? 1,
        limit,
        total,
        totalPages: meta.totalPages ?? Math.max(Math.ceil(total / limit), 1),
      },
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los productos."));
  }
}

export type BulkUpdatePayload =
  | { action: "stock"; ids: number[]; value: number; mode: "set" | "add" }
  | { action: "price"; ids: number[]; value: number; mode: "percentage" | "fixed" }
  | { action: "status"; ids: number[]; active: boolean };

export type InlinePendingChange = {
  precio?: number;
  precioOferta?: number | null;
  stock?: number;
};

export async function bulkInlineUpdateAdminProductos(
  pendingChanges: Record<number, InlinePendingChange>,
): Promise<{ actualizados: number }> {
  const updates = Object.entries(pendingChanges).map(([id, fields]) => ({
    id: Number(id),
    ...fields,
  }));
  try {
    const { data } = await api.post<ApiResponse<{ actualizados: number }>>("/admin/productos/bulk-inline-update", {
      updates,
    });
    return data.data ?? { actualizados: updates.length };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron guardar los cambios."));
  }
}

export async function toggleDestacadoAdminProducto(id: number): Promise<{ id: number; esDestacado: boolean }> {
  try {
    const { data } = await api.patch<ApiResponse<{ id: number; esDestacado: boolean }>>(
      `/admin/productos/${id}/toggle-destacado`,
    );
    return data.data ?? { id, esDestacado: false };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el destacado."));
  }
}

export async function bulkUpdateAdminProductos(payload: BulkUpdatePayload): Promise<{ actualizados: number }> {
  try {
    const { data } = await api.post<ApiResponse<{ actualizados: number }>>("/admin/productos/bulk-update", payload);
    return data.data ?? { actualizados: 0 };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo aplicar la edición masiva."));
  }
}

export async function listAdminProductos(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Producto[]; meta?: AdminListMeta }> {
  try {
    const { data } = await api.get<ApiResponse<Producto[]>>("/admin/productos", {
      params: {
        q: params?.q || undefined,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 50,
      },
    });
    return {
      items: unwrapList<Producto>(data.data),
      meta: data.meta as AdminListMeta | undefined,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los productos."));
  }
}

export type AdminProductoPayload = Partial<{
  activo: boolean;
  destacado: boolean;
  grupoId: string | null;
  grupo_id: string | null;
  orden: number;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  imagenes: string[];
  categoriaId: number | null;
  marcaId: number | null;
  subcategoria: string | null;
}>;

export type AdminVariantePayload = Partial<{
  sku: string;
  precio: number;
  stock: number;
  precioOferta: number | null;
  atributos: Record<string, string> | null;
  imagenUrl: string | null;
  activo: boolean;
}>;

export interface AdminSkuImagen {
  id: number;
  productoId: number;
  sku: string;
  nombre: string;
  imagenUrl: string | null;
}

export async function getAdminProductoPorSku(sku: string): Promise<AdminSkuImagen> {
  try {
    const { data } = await api.get<ApiResponse<AdminSkuImagen>>(
      `/admin/productos/sku/${encodeURIComponent(sku)}`,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la imagen de este SKU."));
  }
}

export async function uploadAdminImage(payload: { file: string; sku?: string }): Promise<{ secure_url: string }> {
  try {
    const { data } = await api.post<ApiResponse<{ secure_url: string }>>("/admin/upload-image", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo subir la imagen."));
  }
}

export async function createAdminProducto(payload: {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  imagenes?: string[];
  activo?: boolean;
  destacado?: boolean;
  grupoId?: string | null;
  grupo_id?: string | null;
  orden?: number;
  categoriaId?: number | null;
  marcaId?: number | null;
  subcategoria?: string | null;
  variantes: Array<{
    sku: string;
    precio: number;
    precioOferta?: number | null;
    stock: number;
    imagenUrl?: string | null;
    atributos?: Record<string, string>;
    activo?: boolean;
  }>;
}): Promise<Producto> {
  try {
    const { data } = await api.post<ApiResponse<Producto>>("/productos", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el producto."));
  }
}

export async function updateAdminProducto(id: number, payload: AdminProductoPayload): Promise<Producto> {
  try {
    const { data } = await api.patch<ApiResponse<Producto>>(`/productos/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el producto."));
  }
}

export async function deleteAdminProducto(id: number): Promise<{ message?: string; eliminacion?: "fisica" | "logica" }> {
  try {
    const { data } = await api.delete<ApiResponse<{ message?: string; eliminacion?: "fisica" | "logica" }>>(
      `/productos/${id}`,
    );
    return data.data ?? {};
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar el producto."));
  }
}

export async function updateAdminVariante(
  productoId: number,
  varianteId: number,
  payload: AdminVariantePayload,
): Promise<void> {
  try {
    await api.patch(`/productos/${productoId}/variantes/${varianteId}`, payload);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la variante."));
  }
}

export async function listAdminPedidos(params?: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Pedido[]; meta?: AdminListMeta }> {
  try {
    const { data } = await api.get<ApiResponse<Pedido[]>>("/admin/pedidos", {
      params: {
        q: params?.q || undefined,
        from: params?.from || undefined,
        to: params?.to || undefined,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 30,
      },
    });
    return {
      items: unwrapList<Pedido>(data.data),
      meta: data.meta as AdminListMeta | undefined,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los pedidos."));
  }
}

export async function updateAdminPedidoEstado(id: number, estado: Pedido["estado"]): Promise<Pedido> {
  try {
    const { data } = await api.patch<ApiResponse<Pedido>>(`/admin/pedidos/${id}/estado`, { estado });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el estado."));
  }
}

export async function listAdminCupones(): Promise<Cupon[]> {
  try {
    const { data } = await api.get<ApiResponse<Cupon[]>>("/admin/cupones");
    return unwrapList<Cupon>(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los cupones."));
  }
}

export async function createAdminCupon(payload: {
  codigo: string;
  descuentoPorcentaje?: number | null;
  montoFijo?: number | null;
  limiteUso?: number | null;
  fechaLimite?: string | null;
  activo?: boolean;
}): Promise<Cupon> {
  try {
    const { data } = await api.post<ApiResponse<Cupon>>("/admin/cupones", {
      codigo: payload.codigo,
      descuentoPorcentaje: payload.descuentoPorcentaje ?? null,
      montoFijo: payload.montoFijo ?? null,
      limiteUso: payload.limiteUso,
      fechaExpiracion: payload.fechaLimite,
      activo: payload.activo,
    });
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el cupón."));
  }
}

export async function updateAdminCupon(
  id: number,
  payload: Partial<{
    descuentoPorcentaje: number;
    limiteUso: number | null;
    fechaLimite: string | null;
    activo: boolean;
  }>,
): Promise<Cupon> {
  try {
    const { data } = await api.patch<ApiResponse<Cupon>>(`/admin/cupones/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el cupón."));
  }
}

export async function validarCupon(codigo: string, subtotal?: number): Promise<Cupon> {
  try {
    const { data } = await api.get<ApiResponse<Cupon>>("/cupones/validar", {
      params: { codigo, subtotal },
    });
    return data.data;
  } catch (error) {
    throw new Error(friendlyUserError(error, "Código de descuento inválido o vencido."));
  }
}
