import { Suspense } from "react";
import type { Metadata } from "next";
import { RedirectDuplicado } from "./RedirectDuplicado";

export const metadata: Metadata = {
  title: "Nuevo producto",
};

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Abriendo el formulario...</p>}>
      <RedirectDuplicado />
    </Suspense>
  );
}
