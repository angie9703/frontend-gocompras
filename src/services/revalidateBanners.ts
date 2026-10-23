"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateBanners(): Promise<void> {
  revalidateTag("banners", { expire: 0 });
  revalidatePath("/");
}
