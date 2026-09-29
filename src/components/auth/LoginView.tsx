"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/useAuthStore";

type AuthMode = "login" | "register";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function getSafeNextPath(value: string | null): string {
  if (!value) return "/perfil";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/perfil";
  }
  if (value.startsWith("/login") || value.startsWith("/registro")) return "/perfil";
  return value;
}

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next") ?? searchParams.get("redirect")),
    [searchParams],
  );
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const skipAuthRedirect = useRef(false);

  useEffect(() => {
    if (skipAuthRedirect.current) return;
    if (!isLoading && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath, router]);

  const initialMode: AuthMode = searchParams.get("tab") === "register" ? "register" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    if (mode === "register") {
      if (!nombre.trim()) {
        setError("Ingresá tu nombre.");
        return;
      }
      if (digitsOnly(telefono).length < 8) {
        setError("Ingresá un teléfono válido.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email: emailValue, password });
        router.replace(nextPath);
      } else {
        skipAuthRedirect.current = true;
        await register({
          nombre: nombre.trim(),
          email: emailValue,
          telefono: digitsOnly(telefono) || telefono.trim(),
          password,
        });
        const confirmPath =
          nextPath && nextPath !== "/perfil"
            ? `/registro/confirmacion?next=${encodeURIComponent(nextPath)}`
            : "/registro/confirmacion";
        router.replace(confirmPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la autenticación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="product-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-main">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "login"
            ? "Ingresá con tu email y contraseña para ver tu cuenta y tus pedidos."
            : "Completá tus datos para registrarte y hacer seguimiento de tus pedidos."}
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`min-h-11 rounded-md text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main"
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`min-h-11 rounded-md text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-main"
            }`}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          {mode === "register" ? (
            <>
              <div>
                <label htmlFor="auth-nombre" className="mb-1.5 block text-sm font-medium text-main">
                  Nombre
                </label>
                <Input
                  id="auth-nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  autoComplete="name"
                  placeholder="Nombre y apellido"
                  required
                />
              </div>
              <div>
                <label htmlFor="auth-telefono" className="mb-1.5 block text-sm font-medium text-main">
                  Teléfono
                </label>
                <Input
                  id="auth-telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  autoComplete="tel"
                  placeholder="11 1234 5678"
                  required
                />
              </div>
            </>
          ) : null}

          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-main">
              Email
            </label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-main">
              Contraseña
            </label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
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
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              ¿No tenés cuenta?{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Iniciá sesión
              </button>
            </>
          )}
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/" className="font-medium text-primary hover:underline">
          Volver al catálogo
        </Link>
      </p>
    </section>
  );
}
