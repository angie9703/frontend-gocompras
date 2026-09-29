"use client";

import { LogIn, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/lib/useHasMounted";
import { useAuthStore } from "@/store/useAuthStore";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginDrawer() {
  const hasMounted = useHasMounted();
  const isLoginDrawerOpen = useAuthStore((state) => state.isLoginDrawerOpen);
  const closeLoginDrawer = useAuthStore((state) => state.closeLoginDrawer);
  const login = useAuthStore((state) => state.login);

  const open = hasMounted && isLoginDrawerOpen;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLoginDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeLoginDrawer]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const emailValue = email.trim();
    if (!isValidEmail(emailValue)) {
      setError("Ingresá un email válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: emailValue, password });
      closeLoginDrawer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 z-0 bg-slate-950/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar inicio de sesión"
        onClick={closeLoginDrawer}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-drawer-title"
        className={cn(
          "absolute right-0 top-0 z-10 flex h-full w-full max-w-sm flex-col bg-surface shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4">
          <div className="flex items-center gap-2">
            <LogIn className="size-5 text-primary" aria-hidden />
            <h2 id="login-drawer-title" className="text-lg font-semibold text-main">
              Iniciar sesión
            </h2>
          </div>
          <Button
            variant="ghost"
            className="min-w-11 px-0"
            aria-label="Cerrar inicio de sesión"
            onClick={closeLoginDrawer}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="text-sm text-muted">
            Ingresá con tu email y contraseña para ver tu cuenta y el historial de tus pedidos.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="login-drawer-email" className="mb-1.5 block text-sm font-medium text-main">
                Email
              </label>
              <Input
                id="login-drawer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="login-drawer-password" className="mb-1.5 block text-sm font-medium text-main">
                Contraseña
              </label>
              <Input
                id="login-drawer-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            {error ? (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="accent" loading={submitting} className="w-full">
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            ¿No tenés cuenta?{" "}
            <Link
              href="/login?tab=register"
              onClick={closeLoginDrawer}
              className="font-semibold text-primary hover:underline"
            >
              No tengo cuenta, registrarme
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}
