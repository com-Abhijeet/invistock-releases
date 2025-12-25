export type UserRole = "admin" | "employee";

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  permissions: string[]; // Parsed from JSON
  is_active: number;
  created_at: string;
}

export interface CreateUserPayload {
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  permissions: string[];
}

export interface AccessLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  details: string;
  machine_type: "server" | "client";
  ip_address: string;
  timestamp: string;
}

// --- New Auth Types ---

export interface LoginPayload {
  username: string;
  password: string;
  machineType: "server" | "client";
  ip?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
  token?: string; // If you implement JWT later
}

export interface LogoutPayload {
  userId: number;
  machineType: "server" | "client";
}

export const AVAILABLE_PERMISSIONS = [
  { key: "pos", label: "Point of Sale" },
  { key: "inventory", label: "Inventory Management" },
  { key: "reports", label: "View Reports" },
  { key: "expenses", label: "Manage Expenses" },
  { key: "settings", label: "System Settings" },
  // Special permissions
  { key: "admin_only", label: "User Management (Admin)" },
] as const;
