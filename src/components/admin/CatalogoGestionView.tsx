"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertDialog } from "@/components/admin/AlertDialog";
import { AdminSwitch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass, adminTableHeadClass, adminTableRowClass } from "@/lib/adminUi";
import {
  createAdminCategoria,
  createAdminMarca,
  deleteAdminCategoria,
  deleteMarca,
  getAdminCategorias,
  listAdminMarcas,
  updateAdminCategoria,
  updateMarca,
} from "@/services/admin";

type Kind = "categoria" | "marca";

type CatalogoItem = {
  id: number;
  nombre: string;
  esDestacada: boolean;
  ordenDestacada: number;
};

function leerDestacada(value: { esDestacada?: boolean; es_destacada?: boolean }): boolean {
  return Boolean(value.esDestacada ?? value.es_destacada);
}

function leerOrden(value: { ordenDestacada?: number; orden_destacada?: number }): number {
  const orden = value.ordenDestacada ?? value.orden_destacada ?? 0;
  return Number.isInteger(orden) ? orden : 0;
}

export function CatalogoGestionView({ kind }: { kind: Kind }) {
  const isCategoria = kind === "categoria";
  const label = isCategoria ? "categoría" : "marca";
  const titulo = isCategoria ? "Categorías" : "Marcas";
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pending, setPending] = useState<CatalogoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingHomeId, setSavingHomeId] = useState<number | null>(null);
  const [ordenDraft, setOrdenDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = isCategoria
      ? getAdminCategorias().then((categorias) =>
          categorias
            .filter((item) => item.id > 0)
            .map((item) => ({
              id: item.id,
              nombre: item.nombre,
              esDestacada: leerDestacada(item),
              ordenDestacada: leerOrden(item),
            })),
        )
      : listAdminMarcas().then((marcas) =>
          marcas
            .filter((item) => item.id > 0)
            .map((item) => ({
              id: item.id,
              nombre: item.nombre,
              esDestacada: false,
              ordenDestacada: 0,
            })),
        );

    void load
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : `No se pudieron cargar las ${titulo.toLowerCase()}.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCategoria, titulo]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibles = [...items].sort((a, b) => {
    if (isCategoria) {
      const orden = a.ordenDestacada - b.ordenDestacada;
      if (orden !== 0) return orden;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const create = async () => {
    const value = nombre.trim();
    if (value.length < 2) return;
    setSaving(true);
    setError(null);
    try {
      if (isCategoria) {
        const categoria = await createAdminCategoria(value);
        setItems((current) => [
          ...current,
          {
            id: categoria.id,
            nombre: categoria.nombre,
            esDestacada: leerDestacada(categoria),
            ordenDestacada: leerOrden(categoria),
          },
        ]);
      } else {
        const marca = await createAdminMarca(value);
        setItems((current) => [...current, { id: marca.id, nombre: marca.nombre, esDestacada: false, ordenDestacada: 0 }]);
      }
      setNombre("");
      setToast(`La ${label} se creó correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo crear la ${label}.`);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (item: CatalogoItem) => {
    const value = editingName.trim();
    if (value.length < 2) return;
    setSavingEdit(true);
    setError(null);
    try {
      if (isCategoria) {
        const categoria = await updateAdminCategoria(item.id, { nombre: value });
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, nombre: categoria.nombre } : row)),
        );
      } else {
        const marca = await updateMarca(item.id, value);
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, nombre: marca.nombre } : row)));
      }
      setEditingId(null);
      setEditingName("");
      setToast(`La ${label} se actualizó correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo actualizar la ${label}.`);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      if (isCategoria) await deleteAdminCategoria(pending.id);
      else await deleteMarca(pending.id);
      setItems((current) => current.filter((row) => row.id !== pending.id));
      setPending(null);
      setToast(`La ${label} se eliminó correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo eliminar la ${label}.`);
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  const saveHome = async (snapshot: CatalogoItem, destacada: boolean, orden: number) => {
    setSavingHomeId(snapshot.id);
    setError(null);
    try {
      const categoria = await updateAdminCategoria(snapshot.id, {
        esDestacada: destacada,
        ordenDestacada: orden,
      });
      setItems((current) =>
        current.map((row) =>
          row.id === snapshot.id
            ? {
                ...row,
                nombre: categoria.nombre || row.nombre,
                esDestacada: leerDestacada(categoria),
                ordenDestacada: leerOrden(categoria),
              }
            : row,
        ),
      );
      setOrdenDraft((current) => {
        const next = { ...current };
        delete next[snapshot.id];
        return next;
      });
      setToast("La categoría se actualizó correctamente.");
    } catch (err) {
      setItems((current) => current.map((row) => (row.id === snapshot.id ? snapshot : row)));
      setError(err instanceof Error ? err.message : "No se pudo actualizar la categoría.");
    } finally {
      setSavingHomeId(null);
    }
  };

  const toggleDestacada = (item: CatalogoItem) => {
    const ordenRaw = ordenDraft[item.id] ?? String(item.ordenDestacada);
    const orden = Number(ordenRaw);
    if (!Number.isInteger(orden) || orden < 0 || orden > 9999) {
      setError("El orden en Home tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    const next = !item.esDestacada;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, esDestacada: next } : row)));
    void saveHome(item, next, orden);
  };

  const commitOrden = (item: CatalogoItem, ordenRaw: string) => {
    const orden = Number(ordenRaw);
    if (!Number.isInteger(orden) || orden < 0 || orden > 9999) {
      setError("El orden en Home tiene que ser un número entero entre 0 y 9999.");
      return;
    }
    if (orden === item.ordenDestacada) return;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ordenDestacada: orden } : row)));
    void saveHome(item, item.esDestacada, orden);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isCategoria
            ? "Creá, renombrá, ordená o eliminá categorías, y elegí cuáles se destacan en la home."
            : "Creá, renombrá o eliminá marcas del catálogo."}
        </p>
      </div>

      <div className={`${adminCardClass} p-4`}>
        <label className={adminFieldClass}>
          Nueva {label}
          <div className="mt-1 flex gap-2">
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder={isCategoria ? "Cables" : "Prysmian"}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void create();
                }
              }}
            />
            <Button variant="dark" onClick={() => void create()} loading={saving} disabled={nombre.trim().length < 2}>
              Crear
            </Button>
          </div>
        </label>
      </div>

      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-4 py-3">Nombre</th>
              {isCategoria ? <th className="px-4 py-3">Destacar en la Home</th> : null}
              {isCategoria ? <th className="px-4 py-3">Orden en Home</th> : null}
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={isCategoria ? 4 : 2}>
                  Cargando {titulo.toLowerCase()}...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={isCategoria ? 4 : 2}>
                  Todavía no hay {isCategoria ? "categorías" : "marcas"}.
                </td>
              </tr>
            ) : (
              visibles.map((item) => {
                const editing = editingId === item.id;
                const ordenValue = ordenDraft[item.id] ?? String(item.ordenDestacada);
                return (
                  <tr key={item.id} className={adminTableRowClass}>
                    <td className="px-4 py-2.5">
                      {editing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          aria-label={`Nuevo nombre de ${item.nombre}`}
                          className="min-h-9"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveEdit(item);
                            }
                          }}
                        />
                      ) : (
                        <span className="font-medium text-slate-800">{item.nombre}</span>
                      )}
                    </td>
                    {isCategoria ? (
                      <td className="px-4 py-2.5">
                        <AdminSwitch
                          checked={item.esDestacada}
                          disabled={savingHomeId === item.id}
                          label={`Destacar ${item.nombre} en la Home`}
                          onChange={() => toggleDestacada(item)}
                        />
                      </td>
                    ) : null}
                    {isCategoria ? (
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={9999}
                          inputMode="numeric"
                          value={ordenValue}
                          disabled={savingHomeId === item.id}
                          aria-label={`Orden en Home de ${item.nombre}`}
                          className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
                          onChange={(event) =>
                            setOrdenDraft((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          onBlur={(event) => commitOrden(item, event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitOrden(item, ordenValue);
                            }
                          }}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              aria-label="Guardar"
                              disabled={savingEdit || editingName.trim().length < 2}
                              onClick={() => void saveEdit(item)}
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                              aria-label="Cancelar"
                              disabled={savingEdit}
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="size-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                              aria-label={`Editar ${item.nombre}`}
                              onClick={() => {
                                setError(null);
                                setEditingId(item.id);
                                setEditingName(item.nombre);
                              }}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                              aria-label={`Eliminar ${item.nombre}`}
                              onClick={() => {
                                setError(null);
                                setPending(item);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pending ? (
        <AlertDialog
          title={`Eliminar ${label}`}
          description={`¿Estás seguro de que querés eliminar "${pending.nombre}"?`}
          loading={deleting}
          onCancel={() => {
            if (!deleting) setPending(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
