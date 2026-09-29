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

export async function getMarcas(): Promise<Marca[]> {
  try {
    const { data } = await api.get<ApiResponse<Marca[] | { items: Marca[] }>>("/productos/marcas");
    const marcas = normalizeMarcas(unwrapMarcas(data.data));
    return marcas.length > 0 ? marcas : MARCAS_FALLBACK;
  } catch {
    return MARCAS_FALLBACK;
  }
}
