import { Suspense } from "react";
import type { Metadata } from "next";
import { RegistroConfirmacionView } from "@/components/auth/RegistroConfirmacionView";

export const metadata: Metadata = {
  title: "Cuenta creada",
  description: "Tu cuenta en GO COMPRAS ya está lista. Explorá el catálogo o visitá tu perfil.",
};

export default function RegistroConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
          <div className="product-card h-64 animate-pulse bg-white" />
        </section>
      }
    >
      <RegistroConfirmacionView />
    </Suspense>
  );
}
