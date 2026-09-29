export type DireccionCliente = {
  direccion: string;
  localidad: string;
  codigoPostal: string;
};

function emptyDireccion(): DireccionCliente {
  return { direccion: "", localidad: "", codigoPostal: "" };
}

export function parseDireccionCliente(raw: string | null | undefined): DireccionCliente {
  if (!raw?.trim()) return emptyDireccion();
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return {
        direccion: String(parsed.calle ?? parsed.direccion ?? "").trim(),
        localidad: String(parsed.localidad ?? parsed.barrio ?? "").trim(),
        codigoPostal: String(parsed.codigoPostal ?? "").trim(),
      };
    } catch {
      return { ...emptyDireccion(), direccion: trimmed };
    }
  }
  return { ...emptyDireccion(), direccion: trimmed };
}

export function serializeDireccionCliente(input: DireccionCliente): string | null {
  const direccion = input.direccion.trim();
  const localidad = input.localidad.trim();
  const codigoPostal = input.codigoPostal.trim();
  if (!direccion && !localidad && !codigoPostal) return null;
  if (!localidad && !codigoPostal) return direccion;
  return JSON.stringify({
    v: 1,
    calle: direccion,
    direccion,
    localidad,
    codigoPostal,
    notasDireccion: "",
  });
}

export function formatDireccionCliente(raw: string | null | undefined): string {
  const parsed = parseDireccionCliente(raw);
  const parts = [
    parsed.direccion,
    parsed.localidad,
    parsed.codigoPostal ? `CP ${parsed.codigoPostal}` : "",
  ].filter(Boolean);
  return parts.join(", ") || "Sin dirección cargada";
}
