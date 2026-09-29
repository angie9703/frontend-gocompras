"use client";

import { Menu, Search, ShoppingBag, Store, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { SearchAutocomplete } from "@/components/layout/SearchAutocomplete";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Badge } from "@/components/ui/Badge";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/SocialIcons";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/lib/useHasMounted";
import { useAjustes } from "@/store/useAjustesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useComercioConfig } from "@/store/useConfigStore";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const hasMounted = useHasMounted();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openLoginDrawer = useAuthStore((state) => state.openLoginDrawer);
  const config = useComercioConfig();
  const ajustes = useAjustes();
  const itemCount = hasMounted ? totalItems : 0;
  const showAccount = hasMounted && isAuthenticated && authUser;
  const cleanPhone = ajustes?.whatsapp ? ajustes.whatsapp.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";
  const nombreComercio = config.nombreComercio;
  const catalogActive = pathname === "/productos" || pathname.startsWith("/productos/");

  useEffect(() => {
    if (pathname === "/productos") {
      setQuery(qFromUrl);
    }
  }, [qFromUrl, pathname]);

  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    router.push(buildCatalogPath(new URLSearchParams(), { q: value || null }));
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl flex-nowrap items-center gap-1.5 px-3 md:h-16 md:gap-3 md:px-4">
        {!searchOpen ? (
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        ) : null}

        {!searchOpen ? (
          <Link
            href="/"
            className="shrink-0"
            aria-label={`${nombreComercio} - Materiales Eléctricos`}
          >
            <Image
              src="/logo.png"
              alt={`${nombreComercio} - Materiales Eléctricos`}
              width={180}
              height={50}
              className="h-8 w-auto max-w-[100px] bg-transparent object-contain sm:max-w-none md:h-9"
              priority
            />
          </Link>
        ) : null}

        {!searchOpen ? (
          <nav aria-label="Principal" className="hidden items-center md:flex">
            <Link href="/" className={cn(navLinkClass, pathname === "/" && "bg-primary/5")} aria-current={pathname === "/" ? "page" : undefined}>
              Inicio
            </Link>
            <Link
              href="/productos"
              className={cn(navLinkClass, catalogActive && "bg-primary/5")}
              aria-current={catalogActive ? "page" : undefined}
            >
              Catálogo
            </Link>
          </nav>
        ) : null}

        <form onSubmit={onSearch} className="relative hidden w-64 shrink-0 md:block xl:w-80">
          <SearchAutocomplete
            value={query}
            onChange={setQuery}
            placeholder="Buscar productos o marcas..."
            ariaLabel="Buscar productos o marcas"
            dropdownAlign="wide"
            inputClassName="h-10 min-h-10 border-slate-300 bg-slate-50 py-2 pl-10 text-sm text-main"
          />
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </form>

        <div className={cn("ml-auto flex min-w-0 items-center gap-0.5", searchOpen && "flex-1")}>
          {searchOpen ? (
            <form onSubmit={onSearch} className="relative mr-1 min-w-0 flex-1 md:hidden">
              <SearchAutocomplete
                inputRef={searchInputRef}
                value={query}
                onChange={setQuery}
                placeholder="Buscar productos o marcas..."
                ariaLabel="Buscar productos o marcas"
                onNavigate={() => setSearchOpen(false)}
                inputClassName="h-10 min-h-10 border-slate-300 bg-slate-50 py-2 pl-10 pr-10 text-sm text-main"
              />
              <button type="submit" className="sr-only">
                Buscar
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
              aria-label="Abrir búsqueda"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" aria-hidden />
            </button>
          )}

          {searchOpen ? (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-primary hover:bg-primary/5 md:hidden"
              aria-label="Cerrar búsqueda"
              onClick={() => setSearchOpen(false)}
            >
              <X className="size-5" />
            </button>
          ) : null}

          {!searchOpen && whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#25D366] transition-colors hover:bg-[#25D366]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
              aria-label={`WhatsApp de ${nombreComercio}`}
            >
              <WhatsAppIcon className="size-5" aria-hidden />
            </a>
          ) : null}
          {!searchOpen && ajustes?.instagram ? (
            <a
              href={ajustes.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:inline-flex"
              aria-label={`Instagram de ${nombreComercio}`}
            >
              <InstagramIcon className="size-5" />
            </a>
          ) : null}
          {!searchOpen && ajustes?.facebook ? (
            <a
              href={ajustes.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:inline-flex"
              aria-label={`Facebook de ${nombreComercio}`}
            >
              <FacebookIcon className="size-5" />
            </a>
          ) : null}

          {!searchOpen ? (
            showAccount && authUser ? (
              <AccountMenu user={authUser} />
            ) : (
              <button
                type="button"
                onClick={openLoginDrawer}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Ingresar"
              >
                <User className="size-5 shrink-0" aria-hidden />
                <span className="hidden text-sm font-semibold sm:inline">Ingresar</span>
              </button>
            )
          ) : null}

          <button
            type="button"
            onClick={toggleCart}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Abrir carrito, ${itemCount} ${itemCount === 1 ? "artículo" : "artículos"}`}
          >
            <ShoppingBag className="size-6" />
            <Badge
              variant="accent"
              className="absolute -top-1 -right-1 min-w-5 justify-center px-1.5 py-0 text-[11px] leading-5"
            >
              {itemCount}
            </Badge>
          </button>
        </div>
      </div>

      <div
        className={cn("fixed inset-0 z-40 md:hidden", menuOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-slate-950/40 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
        <nav
          aria-label="Menú principal"
          className={cn(
            "absolute top-14 left-0 w-64 max-w-[80vw] rounded-br-2xl bg-white shadow-xl transition-transform duration-200",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <ul className="flex flex-col gap-1 p-3">
            <li>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-main hover:bg-primary/5",
                  pathname === "/" && "bg-primary/10 text-primary",
                )}
              >
                <Store className="size-4" aria-hidden />
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/productos"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-main hover:bg-primary/5",
                  catalogActive && "bg-primary/10 text-primary",
                )}
              >
                <Search className="size-4" aria-hidden />
                Catálogo
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
