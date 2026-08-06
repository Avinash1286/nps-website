export const ADMIN_ACCESS_ROLES = {
  activeStaff: ["admin", "publisher", "editor", "admissions"],
  adminOnly: ["admin"],
  content: ["admin", "publisher", "editor"],
  navigation: ["admin", "publisher"],
  admissions: ["admin", "admissions"],
} as const;

export type AdminRole = (typeof ADMIN_ACCESS_ROLES.activeStaff)[number];

export function hasAdminAccess(userRoles: readonly string[], requiredRoles: readonly AdminRole[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function submissionRequiredRoles(type: "contacts" | "admissions" | "eventRegistrations") {
  return type === "admissions" ? ADMIN_ACCESS_ROLES.admissions : ADMIN_ACCESS_ROLES.adminOnly;
}
