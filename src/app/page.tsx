import { BannerCarousel } from "@/components/home/BannerCarousel";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BenefitsBar } from "@/components/home/HeroBanner";
import { PopularCategories } from "@/components/home/PopularCategories";

export default function HomePage() {
  return (
    <>
      <BannerCarousel />
      <PopularCategories />
      <FeaturedProducts />
      <BenefitsBar />
    </>
  );
}
