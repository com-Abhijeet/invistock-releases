import { menuSections } from "../config/menu";

export interface PermissionItem {
  key: string;
  label: string;
}

export interface PermissionSection {
  title: string;
  items: PermissionItem[];
}

/**
 * Transforms the menu configuration into a structured list of permissions.
 * It uses the route path (minus the leading slash) as the unique permission key.
 */
export const getPermissionsFromMenu = (): PermissionSection[] => {
  return menuSections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => ({
      // Convert path "/billing" -> key "billing"
      key: item.path.startsWith("/") ? item.path.slice(1) : item.path,
      label: item.label,
    })),
  }));
};
