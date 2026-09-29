import type { CartItem, Producto, Variante } from "@/types";
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

export function formatVarianteLabel(variante: Variante): string {
  if (variante.atributos && Object.keys(variante.atributos).length > 0) {
    return Object.values(variante.atributos).join(" · ");
  }
  return variante.sku;
}

export function getProductoImagen(producto: Producto, variante?: Variante): string | null {
  return variante?.imagenUrl ?? producto.imagenUrl ?? producto.imagenes?.[0] ?? null;
}

export function getProductoGaleria(producto: Producto, variante?: Variante): string[] {
  const urls = [variante?.imagenUrl, producto.imagenUrl, ...producto.imagenes].filter(
    (url): url is string => Boolean(url),
  );
  return [...new Set(urls)];
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
