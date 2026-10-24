"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateProducts(): Promise<void> {
  revalidateTag("products", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/productos");
  revalidatePath("/productos/[id]", "page");
}
