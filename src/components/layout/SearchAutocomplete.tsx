"use client";

import { ImageOff, Loader2, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/Input";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { getDefaultVariante, getProductoImagen } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { getProductos } from "@/services/productos";
import type { Producto } from "@/types";

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  inputClassName?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  dropdownAlign?: "stretch" | "wide";
  onNavigate?: () => void;
}

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 5;
const DEBOUNCE_MS = 250;

export function SearchAutocomplete({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputClassName,
  inputRef,
  dropdownAlign = "stretch",
  onNavigate,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const term = value.trim();
  const showDropdown = open && term.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (term.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    const timeoutId = window.setTimeout(() => {
      void getProductos({ busqueda: term, pageSize: MAX_RESULTS, orden: "relevancia" })
        .then((response) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResults(response.data.slice(0, MAX_RESULTS));
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setResults([]);
        })
        .finally(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [term]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const closeAndNotify = () => {
    setOpen(false);
    onNavigate?.();
  };

  const goToProducto = (producto: Producto) => {
    closeAndNotify();
    router.push(`/productos/${producto.id}`);
  };

  const goToAllResults = () => {
    closeAndNotify();
    router.push(buildCatalogPath(new URLSearchParams(), { q: term || null }));
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key === "Enter") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted" />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        autoComplete="off"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (term.length >= MIN_QUERY_LENGTH) setOpen(true);
        }}
        onKeyDown={onInputKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        role="combobox"
        className={inputClassName}
      />

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute top-full z-[70] mt-2 max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-xl",
            dropdownAlign === "wide"
              ? "right-0 left-auto w-[min(22rem,calc(100vw-1.5rem))]"
              : "inset-x-0",
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Buscando...
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {results.map((producto) => {
                const variante = getDefaultVariante(producto);
                const imagenUrl = getProductoImagen(producto, variante);
                return (
                  <li key={producto.id} role="option">
                    <button
                      type="button"
                      onClick={() => goToProducto(producto)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
                        {imagenUrl ? (
                          <img
                            src={imagenUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageOff className="size-5 text-muted" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-main">
                          {producto.nombre}
                        </span>
                        <span className="mt-0.5 block">
                          {variante ? <PriceDisplay source={variante} size="sm" /> : "Consultar"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-muted">
              No encontramos productos para &ldquo;{term}&rdquo;.
            </div>
          )}

          <button
            type="button"
            onClick={goToAllResults}
            className="block w-full border-t border-slate-100 px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Ver todos los resultados para &ldquo;{term}&rdquo;
          </button>
        </div>
      ) : null}
    </div>
  );
}
