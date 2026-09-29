"use client";

import { ChevronDown, LogOut, Package, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getFirstName, getInitials } from "@/lib/userDisplay";
import { isStaffRole } from "@/lib/staff";
import { useAuthStore } from "@/store/useAuthStore";
import type { AuthUser } from "@/types";

export function AccountMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onLogout = () => {
    setOpen(false);
    logout();
    router.push("/");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-2"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {getInitials(user.nombre)}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">
          {getFirstName(user.nombre)}
        </span>
        <ChevronDown className={cn("hidden size-4 sm:inline", open && "rotate-180")} aria-hidden />
        <span className="sr-only">Menú de cuenta</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
          {user.rol !== "ADMIN" ? (
            <Link
              href="/perfil?tab=pedidos"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-main hover:bg-primary/5"
            >
              <Package className="size-4 text-primary" aria-hidden />
              Mis Pedidos / Presupuestos
            </Link>
          ) : null}
          {isStaffRole(user.rol) ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-main hover:bg-primary/5"
            >
              <Settings2 className="size-4 text-primary" aria-hidden />
              Panel admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium text-accent hover:bg-accent/5"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
