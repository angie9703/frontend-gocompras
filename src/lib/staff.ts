export function isStaffRole(rol?: string | null): boolean {
  return rol === "ADMIN" || rol === "VENDEDOR";
}

export function isAdminRole(rol?: string | null): boolean {
  return rol === "ADMIN";
}
