import Link from "next/link";

export default function ProductoNotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-main">Producto no encontrado</h1>
      <p className="mt-2 text-muted">
        El producto no existe o ya no está disponible en el catálogo.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark"
      >
        Volver al catálogo
      </Link>
    </section>
  );
}
