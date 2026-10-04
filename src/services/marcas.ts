import type { ApiResponse, Marca } from "@/types";
import api from "@/services/api";

export const MARCAS_FALLBACK: Marca[] = [
  { id: -1, nombre: "Prysmian", activo: true },
  { id: -2, nombre: "Schneider", activo: true },
  { id: -3, nombre: "Sica", activo: true },
  { id: -4, nombre: "Genrod", activo: true },
  { id: -5, nombre: "Philips", activo: true },
  { id: -6, nombre: "Cirilo", activo: true },
];

function unwrapMarcas(payload: unknown): Marca[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items as Marca[];
    if (Array.isArray(record.data)) return record.data as Marca[];
  }

  return [];
}

function normalizeMarcas(items: Marca[]): Marca[] {
  return items.filter((marca) => marca.activo !== false && Boolean(marca.nombre?.trim()));
}

export interface GetMarcasParams {
  categoria?: string;
  categoriaId?: string | number;
}

function toMarcasQuery(params?: GetMarcasParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (!params) return query;

  if (params.categoriaId != null && String(params.categoriaId).trim()) {
    const categoriaId = String(params.categoriaId).trim();
    if (/^\d+$/.test(categoriaId) && Number(categoriaId) > 0) {
      query.categoriaId = categoriaId;
    }
  }

  if (params.categoria?.trim()) {
    query.categoria = params.categoria.trim();
  }

  return query;
}

export async function getMarcas(params?: GetMarcasParams): Promise<Marca[]> {
  const query = toMarcasQuery(params);
  const filtradasPorCategoria = Object.keys(query).length > 0;

  try {
    const { data } = await api.get<ApiResponse<Marca[] | { items: Marca[] }>>("/productos/marcas", {
      params: query,
    });
    const marcas = normalizeMarcas(unwrapMarcas(data.data));
    if (marcas.length > 0) return marcas;
    return filtradasPorCategoria ? [] : MARCAS_FALLBACK;
  } catch {
    return filtradasPorCategoria ? [] : MARCAS_FALLBACK;
  }
}
