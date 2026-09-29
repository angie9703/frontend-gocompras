import Papa from "papaparse";
import type { CargaMasivaItem } from "@/types";

const HEADER_ALIASES: Record<string, string> = {
  sku: "sku",
  codigo: "sku",
  nombre: "nombre",
  name: "nombre",
  descripcion: "descripcion",
  descripción: "descripcion",
  description: "descripcion",
  categoria: "categoria",
  categoría: "categoria",
  category: "categoria",
  subcategoria: "subcategoria",
  subcategory: "subcategoria",
  sub_categoria: "subcategoria",
  marca: "marca",
  brand: "marca",
  preciolista: "precio",
  precio_lista: "precio",
  precio: "precio",
  price: "precio",
  preciooferta: "precioOferta",
  precio_oferta: "precioOferta",
  oferta: "precioOferta",
  stock: "stock",
  grupoid: "grupoId",
  grupo_id: "grupoId",
  grupo: "grupoId",
  variantenombre: "varianteNombre",
  variante_nombre: "varianteNombre",
  variante: "varianteNombre",
  variant: "varianteNombre",
  destacado: "destacado",
  featured: "destacado",
  orden: "orden",
  relevancia: "orden",
  prioridad: "orden",
  imagenurl: "imagenUrl",
  imagen_url: "imagenUrl",
  imagen: "imagenUrl",
  image: "imagenUrl",
  imageurl: "imagenUrl",
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "");
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  let normalized = value.trim().replace(/[$\s]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = parseNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  const parsed = parseOptionalNumber(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return undefined;
}

function cellValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function recordsToItems(records: Record<string, string>[]): CargaMasivaItem[] {
  const items: CargaMasivaItem[] = [];

  for (const record of records) {
    const sku = record.sku?.trim() ?? "";
    const nombre = record.nombre?.trim() ?? "";
    if (!sku || !nombre) continue;

    const precioOferta = parseOptionalNumber(record.precioOferta);
    const grupoId = record.grupoId?.trim() || undefined;
    const varianteNombre = record.varianteNombre?.trim() || undefined;
    const imagenUrl = record.imagenUrl?.trim() || undefined;
    const destacado = parseOptionalBoolean(record.destacado);
    const orden = parseOptionalInt(record.orden);
    const item: CargaMasivaItem = {
      sku,
      nombre,
      precio: parseNumber(record.precio),
      stock: Math.max(0, Math.trunc(parseNumber(record.stock))),
    };
    if (record.descripcion?.trim()) item.descripcion = record.descripcion.trim();
    if (record.categoria?.trim()) item.categoria = record.categoria.trim();
    if (record.subcategoria?.trim()) item.subcategoria = record.subcategoria.trim();
    if (record.marca?.trim()) item.marca = record.marca.trim();
    if (precioOferta != null) item.precioOferta = precioOferta;
    if (grupoId) {
      item.grupoId = grupoId;
      item.grupo_id = grupoId;
    }
    if (varianteNombre) {
      item.varianteNombre = varianteNombre;
      item.variante_nombre = varianteNombre;
    }
    if (imagenUrl) {
      item.imagenUrl = imagenUrl;
      item.imagen_url = imagenUrl;
    }
    if (destacado !== undefined) item.destacado = destacado;
    if (orden !== undefined) item.orden = orden;
    items.push(item);
  }

  return items;
}

function mapHeader(header: string): string {
  return HEADER_ALIASES[normalizeHeader(header)] ?? "";
}

export function parseProductosCsv(text: string): CargaMasivaItem[] {
  const parsed = Papa.parse<Record<string, unknown>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimiter: "",
    quoteChar: '"',
    escapeChar: '"',
    transformHeader: mapHeader,
  });

  const records = (parsed.data ?? []).map((row) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key) continue;
      record[key] = cellValue(value);
    }
    return record;
  });
  return recordsToItems(records);
}

function sheetRowsToItems(rows: unknown[][]): CargaMasivaItem[] {
  if (rows.length < 2) return [];
  const headers = (rows[0] ?? []).map((cell) => mapHeader(String(cell ?? "")));
  const records: Record<string, string>[] = [];
  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    headers.forEach((key, index) => {
      if (!key) return;
      record[key] = cellValue(row[index]);
    });
    records.push(record);
  }
  return recordsToItems(records);
}

export async function parseProductosSpreadsheet(file: File): Promise<CargaMasivaItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type.includes("csv") || file.type.includes("text/plain")) {
    return parseProductosCsv(await file.text());
  }

  const buffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: false });
  return sheetRowsToItems(rows);
}
