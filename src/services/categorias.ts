import type { ApiResponse, Categoria, CategoriaDestacada } from "@/types";
import api from "@/services/api";

export const CATEGORIAS_FALLBACK: Categoria[] = [
  { id: -1, nombre: "Cables y Conductores", slug: "cables-y-conductores", activo: true },
  { id: -2, nombre: "Llaves Térmicas y Disyuntores", slug: "llaves-termicas-y-disyuntores", activo: true },
  { id: -3, nombre: "Iluminación", slug: "iluminacion", activo: true },
  { id: -4, nombre: "Cajas y Tableros", slug: "cajas-y-tableros", activo: true },
  { id: -5, nombre: "Accesorios y Mangueras", slug: "accesorios-y-mangueras", activo: true },
];

function unwrapCategorias<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const record = payload as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }

  return [];
}

function normalizeCategorias(items: Categoria[]): Categoria[] {
  return items.filter(
    (categoria) =>
      categoria.activo !== false && Boolean(categoria.slug?.trim()) && Boolean(categoria.nombre?.trim()),
  );
}

export async function getCategoriasDestacadas(): Promise<CategoriaDestacada[]> {
  const { data } = await api.get<ApiResponse<CategoriaDestacada[] | { items: CategoriaDestacada[] }>>(
    "/categories/featured",
  );
  return unwrapCategorias<CategoriaDestacada & { imagen?: string | null }>(data.data).flatMap((categoria) => {
    const titulo = (categoria.titulo || categoria.nombre || "").trim();
    const slug = categoria.slug?.trim();
    if (!titulo || !slug || categoria.id <= 0) return [];
    const imagen = categoria.imagenUrl?.trim() || categoria.imagen?.trim() || null;
    return [
      {
        id: categoria.id,
        titulo,
        nombre: categoria.nombre?.trim() || titulo,
        slug,
        imagenUrl: imagen,
        orden: categoria.orden,
      },
    ];
  });
}

export async function getCategorias(): Promise<Categoria[]> {
  try {
    const { data } = await api.get<ApiResponse<Categoria[] | { items: Categoria[] }>>("/categorias");
    const categorias = normalizeCategorias(unwrapCategorias<Categoria>(data.data));
    return categorias.length > 0 ? categorias : CATEGORIAS_FALLBACK;
  } catch {
    return CATEGORIAS_FALLBACK;
  }
}
