import type { CartItem, Marca, Producto, Variante } from "@/types";
import { getDescuentoPorcentaje, getPrecioLista, getPrecioOferta } from "@/lib/pricing";

export function getActiveVariantes(producto: Producto): Variante[] {
  const plano = producto as Producto & { sku?: string; precio?: string | number };
  if (!producto?.variantes || !Array.isArray(producto.variantes) || producto.variantes.length === 0) {
    return [
      {
        id: producto?.id,
        sku: plano?.sku,
        precio: plano?.precio,
        activo: producto?.activo ?? true,
      } as any,
    ];
  }
  const activas = producto.variantes.filter((variante) => variante.activo !== false);
  return activas.length > 0 ? activas : producto.variantes;
}

export function getDefaultVariante(producto: Producto): Variante | undefined {
  const activas = getActiveVariantes(producto);
  if (activas.length === 0) return undefined;

  const conStock = activas.filter((variante) => variante.stockDisponible > 0);
  const pool = conStock.length > 0 ? conStock : activas;

  // Elegimos la variante más económica del pool para que el precio mostrado
  // en la tarjeta coincida con el precio usado por el filtro de rango de precio
  // (que siempre considera el mínimo entre las variantes del producto).
  return pool.reduce((min, actual) => (Number(actual.precio) < Number(min.precio) ? actual : min));
}

export function productoTieneStock(producto: Producto): boolean {
  return getActiveVariantes(producto).some((variante) => variante.stockDisponible > 0);
}

export function productoCoincideCategoria(
  producto: Producto,
  categoriaSlug?: string,
  categoriaId?: string,
): boolean {
  const slug = categoriaSlug?.trim();
  const id = categoriaId?.trim();
  if (!slug && !id) return true;

  const categoria = producto.categoria;
  if (!categoria) return false;

  if (id && /^\d+$/.test(id) && categoria.id === Number(id)) return true;
  if (slug && categoria.slug === slug) return true;
  return false;
}

export function productoCoincideSubcategoria(producto: Producto, subcategoria?: string): boolean {
  const wanted = subcategoria?.trim().toLowerCase();
  if (!wanted) return true;
  return (producto.subcategoria ?? "").trim().toLowerCase() === wanted;
}

export function marcasDesdeProductos(productos: Producto[]): Marca[] {
  const byId = new Map<number, Marca>();

  for (const producto of productos) {
    const marca = producto.marca;
    if (!marca?.nombre?.trim() || byId.has(marca.id)) continue;
    byId.set(marca.id, { id: marca.id, nombre: marca.nombre, activo: true });
  }

  return [...byId.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

export function productoCoincideMarca(producto: Producto, marcaId?: string): boolean {
  const id = marcaId?.trim();
  if (!id) return true;
  return producto.marca != null && String(producto.marca.id) === id;
}

export function productoPrecioMinimo(producto: Producto): number {
  const desde = Number(producto.precioDesde);
  if (Number.isFinite(desde) && desde >= 0) return desde;

  const precios = getActiveVariantes(producto)
    .map((variante) => Number(variante.precio))
    .filter((precio) => Number.isFinite(precio) && precio >= 0);

  return precios.length > 0 ? Math.min(...precios) : 0;
}

export function productoEnRangoPrecio(
  producto: Producto,
  precioMin?: string,
  precioMax?: string,
): boolean {
  const price = productoPrecioMinimo(producto);
  const min = precioMin ? Number(precioMin) : NaN;
  const max = precioMax ? Number(precioMax) : NaN;
  if (Number.isFinite(min) && price < min) return false;
  if (Number.isFinite(max) && price > max) return false;
  return true;
}

export function getVarianteNombre(variante: Variante | undefined, fallback: string): string {
  return variante?.nombre?.trim() || fallback;
}

const ATRIBUTO_IGNORADO = /^(nombre_producto|variante_nombre|nombre|color|sku)$/i;
const ATRIBUTO_ESPECIFICACION =
  /(medida|calibre|potencia|secci[oó]n|di[aá]metro|largo|tensi[oó]n|amper|watt)/i;

const PATRONES_MEDIDA: RegExp[] = [
  /\d+\s*x\s*\d+(?:[.,]\d+)?\s*mm\b/gi,
  /\d+\s*x\s*\d+(?:[.,]\d+)?\s*A\b/gi,
  /\d+(?:[.,]\d+)?\s*mm\b/gi,
  /\d+(?:[.,]\d+)?\s*W\b/gi,
  /\d+(?:[.,]\d+)?\s*A\b/gi,
  /x\s*\d+(?:[.,]\d+)?\s*m\b/gi,
  /\d+\s*x\s*\d+\b/gi,
];

function formatearMedida(token: string): string {
  const compact = token.replace(/\s+/g, "");
  const metro = compact.match(/^x?(\d+(?:[.,]\d+)?)m$/i);
  if (metro && !/mm$/i.test(compact)) return `${metro[1]} m`;
  const seccion = compact.match(/^(\d+x\d+(?:[.,]\d+)?)mm$/i);
  if (seccion) return `${seccion[1]} mm`;
  const milimetro = compact.match(/^(\d+(?:[.,]\d+)?)mm$/i);
  if (milimetro) return `${milimetro[1]} mm`;
  const amperaje = compact.match(/^(\d+x\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)A$/i);
  if (amperaje) return `${amperaje[1]} A`;
  const potencia = compact.match(/^(\d+(?:[.,]\d+)?)W$/i);
  if (potencia) return `${potencia[1]} W`;
  return compact;
}

function medidasDesdeNombre(nombre: string): string[] {
  const hallazgos: Array<{ start: number; end: number; text: string }> = [];

  for (const patron of PATRONES_MEDIDA) {
    patron.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = patron.exec(nombre))) {
      const start = match.index;
      const end = start + match[0].length;
      const seSolapa = hallazgos.some((item) => start < item.end && end > item.start);
      if (!seSolapa) hallazgos.push({ start, end, text: formatearMedida(match[0]) });
    }
  }

  return [...new Set(hallazgos.sort((a, b) => a.start - b.start).map((item) => item.text))].slice(0, 3);
}

export function getEspecificacionClave(
  nombre: string,
  atributos?: Record<string, string> | null,
): string | null {
  const desdeAtributos = [
    ...new Set(
      Object.entries(atributos ?? {})
        .filter(([clave, valor]) => {
          const texto = valor?.trim();
          if (!texto || ATRIBUTO_IGNORADO.test(clave)) return false;
          return ATRIBUTO_ESPECIFICACION.test(clave);
        })
        .map(([, valor]) => valor.trim()),
    ),
  ];

  const medidas = desdeAtributos.length > 0 ? desdeAtributos.slice(0, 3) : medidasDesdeNombre(nombre);
  return medidas.length > 0 ? medidas.join(" · ") : null;
}

export function formatVarianteLabel(variante: Variante): string {
  const corta = variante.variante_nombre?.trim();
  if (corta) return corta;

  const valores = Object.entries(variante.atributos ?? {})
    .filter(([clave]) => !/^(nombre_producto|nombre)$/i.test(clave))
    .map(([, valor]) => valor?.trim())
    .filter((valor): valor is string => Boolean(valor));

  if (valores.length > 0) return [...new Set(valores)].join(" · ");
  return variante.sku;
}

export function getProductoImagen(producto: Producto, variante?: Variante): string | null {
  return variante?.imagenUrl ?? producto.imagenUrl ?? producto.imagenes?.[0] ?? null;
}

export function getProductoGaleria(producto: Producto, variante?: Variante): string[] {
  const urls = [variante?.imagenUrl, producto.imagenUrl, ...(producto.imagenes ?? [])].filter(
    (url): url is string => Boolean(url),
  );
  return [...new Set(urls)];
}

export interface GaleriaItem {
  url: string;
  varianteSku?: string;
}

export function getGaleriaItems(producto: Producto, variantes: Variante[]): GaleriaItem[] {
  const skuPorUrl = new Map<string, string>();
  for (const variante of variantes) {
    const url = variante.imagenUrl?.trim();
    if (url && !skuPorUrl.has(url)) skuPorUrl.set(url, variante.sku);
  }

  const urls = [
    producto.imagenUrl,
    ...(producto.imagenes ?? []),
    ...variantes.map((variante) => variante.imagenUrl),
  ];
  const items: GaleriaItem[] = [];
  const vistas = new Set<string>();

  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || vistas.has(url)) continue;
    vistas.add(url);
    const varianteSku = skuPorUrl.get(url);
    items.push(varianteSku ? { url, varianteSku } : { url });
  }

  return items;
}

export function toCartItem(
  producto: Producto,
  variante: Variante,
  cantidad = 1,
): CartItem {
  const precioLista = getPrecioLista(variante);
  const precioOferta = getPrecioOferta(variante);
  const descuentoPorcentaje = getDescuentoPorcentaje(variante);

  return {
    productoId: String(producto.id),
    varianteId: String(variante.id ?? variante.sku),
    varianteSku: variante.sku,
    nombre: getVarianteNombre(variante, producto.nombre),
    precioUnitario: precioOferta,
    precioLista: descuentoPorcentaje > 0 ? precioLista : undefined,
    descuentoPorcentaje: descuentoPorcentaje > 0 ? descuentoPorcentaje : undefined,
    cantidad,
    stockDisponible: variante.stockDisponible,
    imagenUrl: getProductoImagen(producto, variante),
  };
}
