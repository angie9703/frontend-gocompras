import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BenefitsBar, HeroBanner } from "@/components/home/HeroBanner";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PromoBanner } from "@/components/home/PromoBanner";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <BenefitsBar />
      <PopularCategories />
      <PromoBanner />
      <FeaturedProducts />
    </>
  );
}
