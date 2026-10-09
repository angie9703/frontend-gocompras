"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getBannersActivos } from "@/services/banners";
import type { Banner } from "@/types";
import { cn } from "@/lib/cn";

function bannerLink(banner: Banner): string | null {
  const href = banner.link_url?.trim() || banner.linkUrl?.trim() || banner.linkDestino?.trim() || banner.ctaHref?.trim() || "";
  return href || null;
}

function bannerImages(banner: Banner): { desktop: string | null; mobile: string | null } {
  const desktop = banner.imagenUrl?.trim() || banner.imagen_url?.trim() || null;
  const mobile = banner.imagenMobileUrl?.trim() || banner.imagen_mobile_url?.trim() || null;
  return { desktop, mobile };
}

function SlideFrame({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  if (!href) return <div className="relative block h-full w-full">{children}</div>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="relative block h-full w-full" aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="relative block h-full w-full" aria-label={label}>
      {children}
    </a>
  );
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, moved: false });

  useEffect(() => {
    let cancelled = false;
    void getBannersActivos()
      .then((items) => {
        if (cancelled) return;
        const visibles = items
          .filter((item) => item.activo !== false && item.publicado !== false)
          .filter((item) => {
            const images = bannerImages(item);
            return Boolean(images.desktop || images.mobile);
          })
          .sort((a, b) => a.orden - b.orden || a.id - b.id);
        setBanners(visibles);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = banners.length;
  const go = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex((next + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (loading || count < 2 || hovering || dragging) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, dragging, hovering, index, loading]);

  if (loading) {
    return <div className="h-56 w-full animate-pulse bg-slate-100 sm:h-72 md:h-[22rem]" aria-hidden />;
  }

  if (count === 0) return null;

  return (
    <section
      className="relative w-full touch-pan-y overflow-hidden bg-slate-100"
      aria-roledescription="carrusel"
      aria-label="Banners promocionales"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        drag.current = { x: event.clientX, moved: false };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging) return;
        if (Math.abs(event.clientX - drag.current.x) > 8) drag.current.moved = true;
      }}
      onPointerUp={(event) => {
        if (!dragging) return;
        const delta = event.clientX - drag.current.x;
        if (delta <= -48) go(index + 1);
        else if (delta >= 48) go(index - 1);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
      onClickCapture={(event) => {
        if (!drag.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
        drag.current.moved = false;
      }}
    >
      <div
        className="flex h-56 transition-transform duration-500 ease-out sm:h-72 md:h-[22rem]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner) => {
          const images = bannerImages(banner);
          const href = bannerLink(banner);
          const label = banner.titulo?.trim() || "Banner promocional";
          const desktop = images.desktop || images.mobile;
          const mobile = images.mobile;
          return (
            <div key={banner.id} className="h-full w-full shrink-0">
              <SlideFrame href={href} label={label}>
                {mobile ? (
                  <img src={mobile} alt="" className="h-full w-full object-cover md:hidden" draggable={false} />
                ) : null}
                {desktop ? (
                  <img
                    src={desktop}
                    alt={mobile ? "" : label}
                    className={cn("h-full w-full object-cover", mobile ? "hidden md:block" : "")}
                    draggable={false}
                  />
                ) : null}
              </SlideFrame>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white md:inline-flex"
            aria-label="Banner anterior"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white md:inline-flex"
            aria-label="Banner siguiente"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {banners.map((banner, dot) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Ir al banner ${dot + 1}`}
                aria-current={dot === index ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full bg-white shadow transition-all",
                  dot === index ? "w-6" : "w-2 bg-white/70",
                )}
                onClick={() => go(dot)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
