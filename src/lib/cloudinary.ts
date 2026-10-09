const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() ?? "";

const missingEnvMessage =
  "Cloudinary no está configurado. Definí NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET antes de subir imágenes.";

export function getCloudinaryUploadConfig(): { cloudName: string; uploadPreset: string } | null {
  const missing: string[] = [];
  if (!cloudName) missing.push("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  if (!uploadPreset) missing.push("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
  if (missing.length > 0) {
    console.error(`[Cloudinary] ${missingEnvMessage} Faltan: ${missing.join(", ")}.`);
    return null;
  }
  return { cloudName, uploadPreset };
}

export async function uploadCloudinaryImage(
  file: string | Blob,
  config = getCloudinaryUploadConfig(),
): Promise<string> {
  if (!config) {
    throw new Error(missingEnvMessage);
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", config.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    { method: "POST", body },
  );
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || "Cloudinary no pudo guardar la imagen.");
  }
  return payload.secure_url;
}
