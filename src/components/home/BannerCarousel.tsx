"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { bannerImages, bannerLink, bannersVisibles } from "@/lib/banners";
import { cn } from "@/lib/cn";
import { getBannersActivos } from "@/services/banners";
import type { Banner } from "@/types";

const BANNER_SIZES = "(max-width: 768px) 100vw, 1280px";

function esControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-carousel-control]"));
}

function BannerImage({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className: string;
  priority: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={BANNER_SIZES}
      className={className}
      draggable={false}
      {...(priority ? { priority: true } : { loading: "lazy" as const })}
    />
  );
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

export function BannerCarousel({ initialBanners }: { initialBanners?: Banner[] }) {
  const provided = initialBanners !== undefined;
  const [banners, setBanners] = useState<Banner[]>(() => initialBanners ?? []);
  const [loading, setLoading] = useState(!provided);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [manualTick, setManualTick] = useState(0);
  const drag = useRef({ x: 0, moved: false });

  useEffect(() => {
    if (provided) return;
    let cancelled = false;
    void getBannersActivos()
      .then((items) => {
        if (cancelled) return;
        setBanners(bannersVisibles(items));
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
  }, [provided]);

  const count = banners.length;
  const go = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex(((next % count) + count) % count);
      setManualTick((tick) => tick + 1);
    },
    [count],
  );

  useEffect(() => {
    if (loading || count < 2 || dragging) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, dragging, loading, manualTick]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
        <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100 md:aspect-auto md:h-[22rem]" aria-hidden />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:pt-6">
    <div
      className="relative w-full touch-pan-y overflow-hidden rounded-2xl bg-slate-100"
      aria-roledescription="carrusel"
      aria-label="Banners promocionales"
      onPointerDown={(event) => {
        if (esControl(event.target)) return;
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
        className="relative z-0 flex aspect-[4/3] w-full transition-transform duration-500 ease-out md:aspect-auto md:h-[22rem]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, slideIndex) => {
          const images = bannerImages(banner);
          const href = bannerLink(banner);
          const label = banner.titulo?.trim() || "Banner promocional";
          const desktop = images.desktop || images.mobile;
          const mobile = images.mobile;
          const isFirst = slideIndex === 0;
          return (
            <div key={banner.id} className="relative h-full w-full shrink-0">
              <SlideFrame href={href} label={label}>
                {mobile ? (
                  <BannerImage
                    src={mobile}
                    alt=""
                    priority={isFirst}
                    className="object-contain md:hidden"
                  />
                ) : null}
                {desktop ? (
                  <BannerImage
                    src={desktop}
                    alt={mobile ? "" : label}
                    priority={isFirst}
                    className={
                      mobile ? "hidden object-cover md:block" : "object-contain md:object-cover"
                    }
                  />
                ) : null}
              </SlideFrame>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="pointer-events-none absolute inset-0 z-30">
          <button
            type="button"
            data-carousel-control
            className="pointer-events-auto absolute top-1/2 left-3 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white md:inline-flex"
            aria-label="Banner anterior"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            data-carousel-control
            className="pointer-events-auto absolute top-1/2 right-3 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white md:inline-flex"
            aria-label="Banner siguiente"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-center gap-2">
            {banners.map((banner, dot) => (
              <button
                key={banner.id}
                type="button"
                data-carousel-control
                aria-label={`Ir al banner ${dot + 1}`}
                aria-current={dot === index ? "true" : undefined}
                className={cn(
                  "pointer-events-auto relative z-30 h-2 rounded-full bg-white shadow transition-all",
                  dot === index ? "w-6" : "w-2 bg-white/70",
                )}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => go(dot)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
    </section>
  );
}
