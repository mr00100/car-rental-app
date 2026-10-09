export function isAdmin(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "STAFF";
}
