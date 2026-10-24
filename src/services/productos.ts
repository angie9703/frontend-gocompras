import type { ApiErrorResponse, ApiResponse, Producto, ProductoGrupo } from "@/types";
import api, { API_BASE_URL } from "@/services/api";

export interface GetProductosParams {
  busqueda?: string;
  categoria?: string;
  categoriaId?: string | number;
  subcategoria?: string;
  marcaId?: string | number;
  orden?: string;
  enStock?: boolean;
  ofertas?: boolean;
  destacado?: boolean;
  page?: number;
  pageSize?: number;
}

function toProductosQuery(params?: GetProductosParams): Record<string, string> {
  const query: Record<string, string> = {};

  if (params?.busqueda?.trim()) {
    query.q = params.busqueda.trim();
  }

  if (params?.subcategoria?.trim()) {
    query.subcategoria = params.subcategoria.trim();
  }

  if (params?.categoriaId != null && String(params.categoriaId).trim()) {
    const categoriaId = String(params.categoriaId).trim();
    if (/^\d+$/.test(categoriaId) && Number(categoriaId) > 0) {
      query.categoriaId = categoriaId;
    }
  }

  if (params?.categoria?.trim()) {
    const categoria = params.categoria.trim();
    if (/^\d+$/.test(categoria) && Number(categoria) > 0) {
      query.categoriaId = categoria;
    } else {
      query.categoria = categoria;
    }
  }

  if (params?.marcaId != null && String(params.marcaId).trim()) {
    const marcaId = String(params.marcaId).trim();
    if (/^\d+$/.test(marcaId) && Number(marcaId) > 0) {
      query.marcaId = marcaId;
    }
  }

  if (params?.orden?.trim()) {
    query.sort = params.orden.trim();
  }

  if (params?.enStock) {
    query.soloConStock = "true";
  }

  if (params?.ofertas) {
    query.ofertas = "true";
  }

  if (params?.destacado) {
    query.destacado = "true";
  }

  if (params?.page) {
    query.page = String(params.page);
  }

  if (params?.pageSize) {
    query.pageSize = String(params.pageSize);
  }

  return query;
}

function productosFetchInit(): RequestInit {
  const headers = new Headers({ Accept: "application/json" });
  if (typeof window === "undefined") {
    return {
      headers,
      next: { tags: ["products"], revalidate: 60 },
    };
  }

  headers.set("Cache-Control", "no-cache");
  return {
    headers,
    cache: "no-store",
  };
}

async function requestProducto<T>(path: string, fallback: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, productosFetchInit());
  } catch {
    throw new Error("No pudimos conectar con el servidor. Verificá que el backend esté en marcha.");
  }

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | ApiErrorResponse | null;
  if (!response.ok || !body || body.success === false) {
    const message = body && body.success === false && body.error?.message ? body.error.message : fallback;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function getProductos(
  params?: GetProductosParams,
): Promise<ApiResponse<Producto[]>> {
  const query = new URLSearchParams(toProductosQuery(params)).toString();
  return requestProducto<Producto[]>(`/productos${query ? `?${query}` : ""}`, "No se pudieron cargar los productos.");
}

function parseProductoGrupo(raw: unknown): ProductoGrupo | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const grupoId = String(item.grupo_id ?? item.grupoId ?? "").trim();
  if (!grupoId) return null;
  const nombre = String(item.nombre ?? "").trim();
  const total = Number(item.total_variantes ?? item.totalVariantes);
  return {
    grupo_id: grupoId,
    nombre: nombre || grupoId,
    ...(Number.isFinite(total) ? { total_variantes: total } : {}),
  };
}

export async function searchProductosGrupos(search?: string): Promise<ProductoGrupo[]> {
  const term = (search ?? "").trim();
  const path = term ? `/productos/grupos?search=${encodeURIComponent(term)}` : "/productos/grupos";
  const { data } = await api.get<ApiResponse<unknown>>(path);
  const payload = data.data;
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as { items?: unknown; data?: unknown }).items ??
        (payload as { items?: unknown; data?: unknown }).data)
      : [];
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const grupo = parseProductoGrupo(item);
    return grupo ? [grupo] : [];
  });
}

export async function getProductoById(id: string | number): Promise<ApiResponse<Producto>> {
  return requestProducto<Producto>(
    `/productos/${encodeURIComponent(String(id))}`,
    "No se pudo cargar el producto.",
  );
}

export async function getProductoBySlug(slug: string): Promise<ApiResponse<Producto>> {
  return getProductoById(slug);
}
