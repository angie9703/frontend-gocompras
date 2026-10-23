"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function esControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-carousel-control]"));
}

export function BannerCarousel({ count, children }: { count: number; children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [manualTick, setManualTick] = useState(0);
  const drag = useRef({ x: 0, moved: false });

  const go = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex(((next % count) + count) % count);
      setManualTick((tick) => tick + 1);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || dragging) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, dragging, manualTick]);

  return (
    <div
      className="absolute inset-0 touch-pan-y"
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
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {children}
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
            {Array.from({ length: count }, (_, dot) => (
              <button
                key={dot}
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
  );
}
