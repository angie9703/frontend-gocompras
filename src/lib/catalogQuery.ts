export const CATALOG_BASE_PATH = "/productos";
export const DEFAULT_CATALOG_ORDEN = "relevancia";

export const CATALOG_ORDEN_OPTIONS = [
  { value: "relevancia", label: "Más relevantes" },
  { value: "nombre_asc", label: "Nombre: A-Z" },
  { value: "nombre_desc", label: "Nombre: Z-A" },
  { value: "precio_asc", label: "Precio: Menor a Mayor" },
  { value: "precio_desc", label: "Precio: Mayor a Menor" },
] as const;

export type CatalogOrden = (typeof CATALOG_ORDEN_OPTIONS)[number]["value"];

export interface CatalogQueryState {
  q: string;
  categoria: string;
  categoriaId: string;
  subcategoria: string;
  orden: string;
  enStock: boolean;
  ofertas: boolean;
  precioMin: string;
  precioMax: string;
  marcaId: string;
}

export type CatalogQueryPatch = {
  q?: string | null;
  categoria?: string | null;
  categoriaId?: string | number | null;
  subcategoria?: string | null;
  orden?: string | null;
  enStock?: boolean | null;
  ofertas?: boolean | null;
  precioMin?: string | number | null;
  precioMax?: string | number | null;
  marcaId?: string | number | null;
};

const CATALOG_PARAM_KEYS = [
  "q",
  "categoria",
  "categoriaId",
  "subcategoria",
  "orden",
  "enStock",
  "ofertas",
  "precioMin",
  "precioMax",
  "marcaId",
] as const;

function isCatalogOrden(value: string): value is CatalogOrden {
  return CATALOG_ORDEN_OPTIONS.some((option) => option.value === value);
}

export function parseEnStockParam(value: string | null): boolean {
  return value === "1" || value === "true";
}

function parsePriceParam(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return String(amount);
}

export function readCatalogQuery(searchParams: URLSearchParams): CatalogQueryState {
  const ordenRaw = searchParams.get("orden")?.trim() ?? "";
  return {
    q: searchParams.get("q")?.trim() ?? "",
    categoria: searchParams.get("categoria")?.trim() ?? "",
    categoriaId: searchParams.get("categoriaId")?.trim() ?? "",
    subcategoria: searchParams.get("subcategoria")?.trim() ?? "",
    orden: isCatalogOrden(ordenRaw) ? ordenRaw : DEFAULT_CATALOG_ORDEN,
    enStock: parseEnStockParam(searchParams.get("enStock")),
    ofertas: parseEnStockParam(searchParams.get("ofertas")),
    precioMin: parsePriceParam(searchParams.get("precioMin")),
    precioMax: parsePriceParam(searchParams.get("precioMax")),
    marcaId: searchParams.get("marcaId")?.trim() ?? "",
  };
}

export function hasActiveCatalogFilters(query: CatalogQueryState): boolean {
  return countActiveCatalogFilters(query) > 0;
}

export function countActiveCatalogFilters(query: CatalogQueryState): number {
  let count = 0;
  if (query.q) count += 1;
  if (query.categoria || query.categoriaId) count += 1;
  if (query.subcategoria) count += 1;
  if (query.enStock) count += 1;
  if (query.ofertas) count += 1;
  if (query.orden && query.orden !== DEFAULT_CATALOG_ORDEN) count += 1;
  if (query.precioMin) count += 1;
  if (query.precioMax) count += 1;
  if (query.marcaId) count += 1;
  return count;
}

function applyPatch(params: URLSearchParams, patch: CatalogQueryPatch): void {
  if ("q" in patch) {
    const value = patch.q?.trim() ?? "";
    if (value) params.set("q", value);
    else params.delete("q");
  }

  if ("categoria" in patch) {
    const value = patch.categoria?.trim() ?? "";
    if (value) params.set("categoria", value);
    else params.delete("categoria");
  }

  if ("categoriaId" in patch) {
    const value = patch.categoriaId == null ? "" : String(patch.categoriaId).trim();
    if (value && Number(value) > 0) params.set("categoriaId", value);
    else params.delete("categoriaId");
  }

  if ("subcategoria" in patch) {
    const value = patch.subcategoria?.trim() ?? "";
    if (value) params.set("subcategoria", value);
    else params.delete("subcategoria");
  }

  if ("orden" in patch) {
    const value = patch.orden?.trim() ?? "";
    if (value && value !== DEFAULT_CATALOG_ORDEN) params.set("orden", value);
    else params.delete("orden");
  }

  if ("enStock" in patch) {
    if (patch.enStock) params.set("enStock", "1");
    else params.delete("enStock");
  }

  if ("ofertas" in patch) {
    if (patch.ofertas) params.set("ofertas", "true");
    else params.delete("ofertas");
  }

  if ("precioMin" in patch) {
    const value = parsePriceParam(patch.precioMin == null ? "" : String(patch.precioMin));
    if (value) params.set("precioMin", value);
    else params.delete("precioMin");
  }

  if ("precioMax" in patch) {
    const value = parsePriceParam(patch.precioMax == null ? "" : String(patch.precioMax));
    if (value) params.set("precioMax", value);
    else params.delete("precioMax");
  }

  if ("marcaId" in patch) {
    const value = patch.marcaId == null ? "" : String(patch.marcaId).trim();
    if (value && Number(value) > 0) params.set("marcaId", value);
    else params.delete("marcaId");
  }
}

export function buildCatalogPath(
  current: URLSearchParams,
  patch: CatalogQueryPatch = {},
): string {
  const params = new URLSearchParams();
  for (const key of CATALOG_PARAM_KEYS) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  applyPatch(params, patch);
  const qs = params.toString();
  return qs ? `${CATALOG_BASE_PATH}?${qs}` : CATALOG_BASE_PATH;
}

export function catalogStateToPath(state: CatalogQueryState): string {
  return buildCatalogPath(new URLSearchParams(), {
    q: state.q || null,
    categoria: state.categoria || null,
    categoriaId: state.categoriaId || null,
    subcategoria: state.subcategoria || null,
    orden: state.orden,
    enStock: state.enStock,
    ofertas: state.ofertas,
    precioMin: state.precioMin || null,
    precioMax: state.precioMax || null,
    marcaId: state.marcaId || null,
  });
}

export function clearCatalogFiltersPath(): string {
  return CATALOG_BASE_PATH;
}
