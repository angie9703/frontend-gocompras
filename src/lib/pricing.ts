import type { Variante } from "@/types";

export function getPrecioLista(variante: Pick<Variante, "precio" | "precioLista">): number {
  const lista = Number(variante.precioLista ?? variante.precio);
  return Number.isFinite(lista) && lista > 0 ? lista : 0;
}

export function getPrecioOferta(
  variante: Pick<Variante, "precio" | "precioLista" | "precioOferta">,
): number {
  const lista = getPrecioLista(variante);
  const ofertaDirecta = variante.precioOferta != null ? Number(variante.precioOferta) : NaN;
  if (Number.isFinite(ofertaDirecta) && ofertaDirecta > 0 && ofertaDirecta < lista) {
    return ofertaDirecta;
  }

  const precio = Number(variante.precio);
  if (Number.isFinite(precio) && precio > 0 && precio < lista) return precio;
  return lista;
}

export function getDescuentoPorcentaje(
  variante: Pick<Variante, "precio" | "precioLista" | "precioOferta" | "descuentoPorcentaje">,
): number {
  const listed = Number(variante.descuentoPorcentaje);
  if (Number.isFinite(listed) && listed > 0) return Math.round(listed);

  const lista = getPrecioLista(variante);
  const oferta = getPrecioOferta(variante);
  if (!(lista > 0) || !(oferta < lista)) return 0;
  return Math.round((1 - oferta / lista) * 100);
}

export function tienePrecioOferta(
  variante: Pick<Variante, "precio" | "precioLista" | "precioOferta">,
): boolean {
  return getDescuentoPorcentaje(variante) > 0 && getPrecioOferta(variante) < getPrecioLista(variante);
}
