export function getInitials(nombre: string | null | undefined): string {
  const parts = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getFirstName(nombre: string | null | undefined): string {
  return (nombre ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "Cuenta";
}
