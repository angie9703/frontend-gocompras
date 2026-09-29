"use client";

import { Cog, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { isStaffRole } from "@/lib/staff";
import { useAuthStore } from "@/store/useAuthStore";

const NAV = [
  { href: "/admin", label: "Dashboard / Resumen", icon: "📊", exact: true },
  { href: "/admin/pedidos", label: "Pedidos y Presupuestos", icon: "📦" },
  { href: "/admin/productos", label: "Productos e Inventario", icon: "🏷️" },
  { href: "/admin/promociones", label: "Cupones y Promociones", icon: "🎟️" },
  { href: "/admin/banners", label: "Banner Promocional", icon: "🖼️" },
  { href: "/admin/clientes", label: "Clientes / CRM", icon: "👥" },
  { href: "/admin/ajustes", label: "Ajustes", icon: "cog" },
];

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openLoginDrawer = useAuthStore((state) => state.openLoginDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-50/60">
        <div className="h-24 w-64 animate-pulse rounded-xl bg-white" />
      </section>
    );
  }

  if (!isAuthenticated || !isStaffRole(user?.rol)) {
    return (
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-main">Panel de administración</h1>
        <p className="mt-2 text-sm text-muted">
          Esta sección es exclusiva para vendedores y administradores.
        </p>
        <button
          type="button"
          onClick={openLoginDrawer}
          className="btn-touch mt-6 inline-flex items-center justify-center bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Iniciar sesión
        </button>
      </section>
    );
  }

  const sidebar = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">GO COMPRAS</p>
        <p className="mt-1 text-lg font-semibold text-white">Administración</p>
        <p className="mt-1 truncate text-xs text-slate-400">{user?.nombre}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Secciones de administración">
        {NAV.map((item) => {
          const active = navActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <span aria-hidden className="flex w-6 items-center justify-center">
                {item.icon === "cog" ? <Cog className="size-4" /> : item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <Link href="/" className="text-xs font-medium text-slate-400 hover:text-white">
          ← Volver a la tienda
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 text-white lg:flex">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-slate-900 text-white shadow-xl">
            <button
              type="button"
              className="absolute top-3 right-3 rounded-lg p-2 text-slate-300 hover:bg-white/10"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Abrir menú de administración"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold text-main">Panel de administración</p>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
