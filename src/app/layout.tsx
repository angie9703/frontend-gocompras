import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LoginDrawer } from "@/components/auth/LoginDrawer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AuthBootstrap } from "@/components/layout/AuthBootstrap";
import { ConfigBootstrap } from "@/components/layout/ConfigBootstrap";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StorefrontOnly } from "@/components/layout/StorefrontOnly";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GO COMPRAS",
    template: "%s | GO COMPRAS",
  },
  description: "Materiales eléctricos y ferretería. Envío a coordinar o retiro en punto seguro.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-main">
        <ConfigBootstrap>
          <AuthBootstrap>
            <StorefrontOnly>
              <Suspense fallback={<header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white md:h-16" />}>
                <Header />
              </Suspense>
              <CartDrawer />
            </StorefrontOnly>
            <LoginDrawer />
            <main className="flex flex-1 flex-col">{children}</main>
            <StorefrontOnly>
              <Footer />
              <WhatsAppButton />
            </StorefrontOnly>
          </AuthBootstrap>
        </ConfigBootstrap>
      </body>
    </html>
  );
}
