"use client";

import { FileSpreadsheet, ImageOff, Upload } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { Button } from "@/components/ui/Button";
import { adminCardClass, adminTableHeadClass, adminTableRowClass, selectClass, tabClass } from "@/lib/adminUi";
import { formatARS } from "@/lib/money";
import { parseProductosSpreadsheet } from "@/lib/spreadsheet";
import {
  deshacerAdminImportacion,
  importarCargaMasiva,
  listAdminImportaciones,
  type ImportacionLote,
} from "@/services/admin";
import type { CargaMasivaItem } from "@/types";

function PreviewImagen({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="size-10 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
      {showImage ? (
        <img
          src={src}
          alt=""
          width={40}
          height={40}
          className="size-10 object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex size-10 items-center justify-center text-slate-400">
          <ImageOff className="size-4" />
        </div>
      )}
    </div>
  );
}

function formatFecha(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function CargaMasivaView({
  compact = false,
  onImported,
  onReverted,
}: {
  compact?: boolean;
  onImported?: (resultado: { total: number; creados: number; actualizados: number }) => void | Promise<void>;
  onReverted?: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"carga" | "historial">("carga");
  const [rows, setRows] = useState<CargaMasivaItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [lotes, setLotes] = useState<ImportacionLote[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [lotePendiente, setLotePendiente] = useState<ImportacionLote | null>(null);
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    setHistorialLoading(true);
    setHistorialError(null);
    try {
      setLotes(await listAdminImportaciones());
    } catch (err) {
      setHistorialError(err instanceof Error ? err.message : "No se pudo cargar el historial de cargas.");
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "historial") return;
    void cargarHistorial();
  }, [tab, cargarHistorial]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setCurrentPage(1);
    setFileName(file.name);
    try {
      const items = await parseProductosSpreadsheet(file);
      if (items.length === 0) {
        setRows([]);
        setError("No encontramos filas válidas. Incluí columnas SKU, Nombre y Precio.");
        return;
      }
      setRows(items);
    } catch {
      setRows([]);
      setError("No se pudo leer el archivo. Probá con CSV o Excel (.xlsx).");
    }
  }, []);

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  };

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
  };

  const onImport = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await importarCargaMasiva(rows, fileName ?? undefined);
      const cantidad = response.total ?? rows.length;
      setResult(`Se importaron ${cantidad} productos correctamente`);
      await onImported?.(response);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "No se pudo importar.");
      return;
    }
    setLoading(false);
  };

  const confirmarReversion = async () => {
    if (!lotePendiente) return;
    setRevirtiendo(true);
    setRevertError(null);
    try {
      await deshacerAdminImportacion(lotePendiente.id);
      setLotePendiente(null);
      await cargarHistorial();
      await onReverted?.();
    } catch (err) {
      setRevertError(err instanceof Error ? err.message : "No se pudo deshacer la importación.");
    } finally {
      setRevirtiendo(false);
    }
  };

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const start = pageSize === 0 ? 0 : (page - 1) * pageSize;
  const paginatedRows = pageSize === 0 ? rows : rows.slice((page - 1) * pageSize, page * pageSize);
  const from = rows.length === 0 ? 0 : start + 1;
  const to = pageSize === 0 ? rows.length : Math.min(start + pageSize, rows.length);

  return (
    <div className="space-y-5">
      {compact ? null : (
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Carga masiva de productos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Arrastrá un Excel o CSV con SKU, Nombre, Precio, Stock, Categoría, Subcategoría, Marca, Grupo ID,
            Variante e Imagen.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabClass(tab === "carga")} onClick={() => setTab("carga")}>
          Nueva carga
        </button>
        <button type="button" className={tabClass(tab === "historial")} onClick={() => setTab("historial")}>
          Historial de cargas
        </button>
      </div>

      {tab === "historial" ? (
        <div className={`${adminCardClass} overflow-x-auto`}>
          {historialError ? (
            <p className="px-4 py-3 text-sm font-medium text-rose-700" role="alert">
              {historialError}
            </p>
          ) : null}
          <table className="min-w-full text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Nombre de archivo</th>
                <th className="px-3 py-3">Cantidad de productos</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historialLoading ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={4}>
                    Cargando historial...
                  </td>
                </tr>
              ) : lotes.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={4}>
                    Todavía no hay cargas registradas.
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.id} className={adminTableRowClass}>
                    <td className="px-3 py-2.5 text-slate-700">{formatFecha(lote.createdAt)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{lote.nombreArchivo}</td>
                    <td className="px-3 py-2.5 text-slate-700">{lote.cantidadProductos}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                        onClick={() => {
                          setRevertError(null);
                          setLotePendiente(lote);
                        }}
                      >
                        Deshacer importación
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center ${
          dragging ? "border-primary bg-primary/5" : "border-slate-300 bg-white"
        }`}
      >
        <Upload className="size-8 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-main">Soltá el archivo acá o hacé clic para elegirlo</span>
        <span className="text-xs text-muted">Formatos: .xlsx, .xls, .csv</span>
        <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={onSelect} />
      </label>

      {fileName ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <FileSpreadsheet className="size-4 text-primary" aria-hidden />
          {fileName} · {rows.length} filas válidas
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {result && !onImported ? <p className="text-sm font-medium text-primary">{result}</p> : null}

      {rows.length > 0 ? (
        <>
          <div className={`${adminCardClass} overflow-x-auto`}>
            <table className="min-w-full text-left text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className="px-3 py-3">Imagen</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Grupo ID</th>
                  <th className="px-3 py-3">Variante</th>
                  <th className="px-3 py-3">Precio</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Subcategoría</th>
                  <th className="px-3 py-3">Marca</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, index) => {
                  const imagen = row.imagenUrl ?? row.imagen_url;
                  return (
                    <tr key={`${row.sku}-${start + index}`} className={adminTableRowClass}>
                      <td className="px-3 py-2.5">
                        <PreviewImagen src={imagen} />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{row.sku}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.nombre}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {row.grupoId ?? row.grupo_id ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {row.varianteNombre ?? row.variante_nombre ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{formatARS(row.precio)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.stock}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.categoria ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.subcategoria ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.marca ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Mostrando {from}–{to} de {rows.length} filas
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Filas
                <select
                  className={`${selectClass} min-h-9 w-auto px-2`}
                  value={pageSize === 0 ? "todas" : String(pageSize)}
                  aria-label="Filas por página"
                  onChange={(event) => {
                    const value = event.target.value;
                    setPageSize(value === "todas" ? 0 : Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="todas">Todas</option>
                </select>
              </label>
              <Button variant="subtle" className="min-h-9 px-3" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-slate-700">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="subtle"
                className="min-h-9 px-3"
                disabled={page >= totalPages}
                onClick={() => setCurrentPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
          <Button variant="dark" onClick={() => void onImport()} loading={loading}>
            Importar {rows.length} productos
          </Button>
        </>
      ) : null}
      </>
      )}

      {lotePendiente ? (
        <AlertDialog
          title="¿Deshacer importación?"
          description={`Esta acción eliminará los ${lotePendiente.cantidadProductos} productos cargados en '${lotePendiente.nombreArchivo}'. ¿Deseás continuar?`}
          confirmLabel="Deshacer"
          loading={revirtiendo}
          error={revertError}
          onCancel={() => {
            if (revirtiendo) return;
            setLotePendiente(null);
            setRevertError(null);
          }}
          onConfirm={() => void confirmarReversion()}
        />
      ) : null}
    </div>
  );
}
