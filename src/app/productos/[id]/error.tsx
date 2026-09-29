"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ProductoError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-main">No se pudo cargar el producto</h1>
      <p className="mt-2 text-muted">
        El servidor no respondió. Reintentá o volvé al catálogo.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark"
        >
          Volver al catálogo
        </Link>
      </div>
    </section>
  );
}
