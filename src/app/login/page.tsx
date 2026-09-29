import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Iniciá sesión o creá tu cuenta para ver tus pedidos en GO COMPRAS.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
          <div className="product-card h-80 animate-pulse bg-white" />
        </section>
      }
    >
      <LoginView />
    </Suspense>
  );
}
