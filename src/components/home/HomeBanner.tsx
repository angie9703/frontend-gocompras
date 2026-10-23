import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { bannerImages, bannerLink } from "@/lib/banners";
import type { Banner } from "@/types";

function BannerAnchor({
  href,
  label,
  className,
  children,
}: {
  href: string | null;
  label: string;
  className: string;
  children: ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} aria-label={label}>
      {children}
    </a>
  );
}

function SlideFrame({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  return (
    <BannerAnchor href={href} label={label} className="absolute inset-0 block">
      {children}
    </BannerAnchor>
  );
}

function FirstBannerImage({ banner }: { banner: Banner }) {
  const images = bannerImages(banner);
  const mobileSrc = images.mobile || images.desktop;
  const desktopSrc = images.desktop || images.mobile;
  if (!mobileSrc || !desktopSrc) return null;
  const label = banner.titulo?.trim() || "Banner promocional";

  return (
    <BannerAnchor href={bannerLink(banner)} label={label} className="relative block">
      <Image
        src={mobileSrc}
        alt={label}
        width={1080}
        height={810}
        priority={true}
        fetchPriority="high"
        loading="eager"
        decoding="sync"
        sizes="100vw"
        draggable={false}
        className="block aspect-[4/3] h-auto w-full object-contain md:hidden"
      />
      <Image
        src={desktopSrc}
        alt=""
        width={1280}
        height={352}
        sizes="(max-width: 768px) 100vw, 1280px"
        draggable={false}
        className="hidden h-[22rem] w-full object-cover md:block"
      />
    </BannerAnchor>
  );
}

function RestBannerSlide({ banner }: { banner: Banner }) {
  const images = bannerImages(banner);
  const mobileSrc = images.mobile || images.desktop;
  const desktopSrc = images.desktop || images.mobile;
  if (!mobileSrc || !desktopSrc) return null;
  const label = banner.titulo?.trim() || "Banner promocional";

  return (
    <div className="relative aspect-[4/3] min-w-full shrink-0 md:aspect-auto md:h-[22rem]">
      <SlideFrame href={bannerLink(banner)} label={label}>
        <Image
          src={mobileSrc}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="block object-contain md:hidden"
          draggable={false}
        />
        <Image
          src={desktopSrc}
          alt={label}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 1280px"
          className="hidden object-cover md:block"
          draggable={false}
        />
      </SlideFrame>
    </div>
  );
}

export function HomeBanner({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;
  const [first, ...rest] = banners;
  if (!first) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:pt-6">
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100">
        <FirstBannerImage banner={first} />
        {rest.length > 0 ? (
          <BannerCarousel count={banners.length} href={bannerLink(first)}>
            <div className="h-full min-w-full shrink-0" aria-hidden="true" />
            {rest.map((banner) => (
              <RestBannerSlide key={banner.id} banner={banner} />
            ))}
          </BannerCarousel>
        ) : null}
      </div>
    </section>
  );
}
