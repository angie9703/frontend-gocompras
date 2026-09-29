"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { Button } from "@/components/ui/Button";
import { adminCardClass } from "@/lib/adminUi";

export function AlertDialog({
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Cerrar confirmación"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-md ${adminCardClass} p-5`}
      >
        <h3 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        {error ? <p className="mt-3 text-sm font-medium text-accent">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
            disabled={loading}
            aria-busy={loading || undefined}
            onClick={onConfirm}
          >
            {loading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
