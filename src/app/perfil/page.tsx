import { Suspense } from "react";
import type { Metadata } from "next";
import { MiCuentaView } from "@/components/cuenta/MiCuentaView";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Consultá tus pedidos, descargá presupuestos y actualizá tus datos en GO COMPRAS.",
};

function PerfilFallback() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="product-card h-48 animate-pulse bg-white" />
    </section>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<PerfilFallback />}>
      <MiCuentaView />
    </Suspense>
  );
}
