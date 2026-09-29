import axios from "axios";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { getProductoById, getProductoBySlug } from "@/services/productos";

interface ProductoPageProps {
  params: Promise<{ id: string }>;
}

async function fetchProducto(id: string) {
  try {
    const response = /^\d+$/.test(id) ? await getProductoById(id) : await getProductoBySlug(id);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: ProductoPageProps): Promise<Metadata> {
  const { id } = await params;
  const producto = await fetchProducto(id);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: producto.nombre,
    description: producto.descripcion ?? `Comprar ${producto.nombre} en GO COMPRAS.`,
  };
}

export default async function ProductoPage({ params }: ProductoPageProps) {
  const { id } = await params;
  const producto = await fetchProducto(id);

  if (!producto) {
    notFound();
  }

  return <ProductDetail producto={producto} />;
}
