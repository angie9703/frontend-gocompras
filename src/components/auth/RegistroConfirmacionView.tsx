"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { getFirstName } from "@/lib/userDisplay";
import { useHasMounted } from "@/lib/useHasMounted";
import { useAuthStore } from "@/store/useAuthStore";

function getSafeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return null;
  if (value.startsWith("/login") || value.startsWith("/registro")) return null;
  return value;
}

export function RegistroConfirmacionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!hasMounted || isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?tab=register");
    }
  }, [hasMounted, isAuthenticated, isLoading, router]);

  if (!hasMounted || isLoading || !isAuthenticated || !user) {
    return (
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="product-card h-64 animate-pulse bg-white" />
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className="product-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-main">¡Listo, {getFirstName(user.nombre)}!</h1>
        <p className="mt-2 text-sm text-muted">
          Tu cuenta ya está creada. Podés armar un presupuesto en el catálogo o ver tus datos en Mi
          cuenta.
        </p>

        <div className="mt-6 grid gap-3">
          <Button variant="accent" className="w-full" onClick={() => router.push("/productos")}>
            Explorar catálogo
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/perfil")}>
            Ver mi perfil
          </Button>
          {nextPath ? (
            <Link href={nextPath} className="text-sm font-semibold text-primary hover:underline">
              Continuar a donde ibas
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
