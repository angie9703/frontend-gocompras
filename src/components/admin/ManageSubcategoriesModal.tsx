"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminCardClass, adminFieldClass } from "@/lib/adminUi";
import {
  createSubcategoria,
  deleteSubcategoria,
  listSubcategorias,
  updateSubcategoria,
  type SubcategoriaItem,
} from "@/services/admin";

type SubcategoriaChange =
  | { type: "create"; nombre: string }
  | { type: "rename"; from: string; to: string }
  | { type: "delete"; nombre: string };

export function ManageSubcategoriesModal({
  categoriaId,
  categoriaNombre,
  onClose,
  onSync,
}: {
  categoriaId: number;
  categoriaNombre: string;
  onClose: () => void;
  onSync: (nombres: string[], change: SubcategoriaChange) => void;
}) {
  const titleId = useId();
  const [items, setItems] = useState<SubcategoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pending, setPending] = useState<SubcategoriaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const publish = (next: SubcategoriaItem[], change: SubcategoriaChange) => {
    onSync(
      next.map((item) => item.nombre).sort((a, b) => a.localeCompare(b, "es")),
      change,
    );
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listSubcategorias(categoriaId)
      .then((rows) => {
        if (!active) return;
        setItems(rows.filter((item) => item.categoriaId === categoriaId));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las subcategorías.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoriaId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (pending) {
        setPending(null);
        return;
      }
      if (editingId != null) {
        setEditingId(null);
        setEditingName("");
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editingId, onClose, pending]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const create = async () => {
    const value = nombre.trim();
    if (value.length < 2) return;
    setSaving(true);
    setError(null);
    try {
      const creada = await createSubcategoria(categoriaId, value);
      const next = [...items.filter((item) => item.id !== creada.id), creada].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      );
      setItems(next);
      publish(next, { type: "create", nombre: creada.nombre });
      setNombre("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la subcategoría.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (item: SubcategoriaItem) => {
    const value = editingName.trim();
    if (value.length < 2) return;
    setSavingEdit(true);
    setError(null);
    try {
      const actualizada = await updateSubcategoria(item.id, value);
      const next = items
        .map((row) => (row.id === item.id ? actualizada : row))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setItems(next);
      publish(next, { type: "rename", from: item.nombre, to: actualizada.nombre });
      setEditingId(null);
      setEditingName("");
      setToast("La subcategoría se actualizó correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la subcategoría.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeletingId(pending.id);
    setError(null);
    try {
      await deleteSubcategoria(pending.id);
      const next = items.filter((item) => item.id !== pending.id);
      setItems(next);
      publish(next, { type: "delete", nombre: pending.nombre });
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la subcategoría.");
      setPending(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Cerrar gestión" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col ${adminCardClass} p-5`}
      >
        <h4 id={titleId} className="text-lg font-semibold text-slate-900">
          Gestionar subcategorías
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          Categoría: <span className="font-medium text-slate-800">{categoriaNombre}</span>
        </p>

        <label className={`${adminFieldClass} mt-4`}>
          Nombre
          <div className="mt-1 flex gap-2">
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Unipolar"
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

        {error ? <p className="mt-3 text-sm font-medium text-accent">{error}</p> : null}

        <ul className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {loading ? (
            <li className="px-2 py-6 text-center text-sm text-slate-500">Cargando subcategorías...</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-slate-500">Todavía no hay subcategorías.</li>
          ) : (
            items.map((item) => {
              const editing = editingId === item.id;
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
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
                    <span className="truncate text-sm font-medium text-slate-800">{item.nombre}</span>
                  )}
                  <div className="flex shrink-0 items-center">
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
                            setPending(null);
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
                          disabled={deletingId === item.id}
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
                </li>
              );
            })
          )}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {pending ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Cerrar confirmación"
            onClick={() => setPending(null)}
          />
          <div className={`relative z-10 w-full max-w-sm ${adminCardClass} p-5`}>
            <h5 className="text-base font-semibold text-slate-900">Eliminar subcategoría</h5>
            <p className="mt-2 text-sm text-slate-600">
              ¿Estás seguro de que querés eliminar &quot;{pending.nombre}&quot;?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button variant="dark" onClick={() => void confirmDelete()} loading={deletingId === pending.id}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
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
