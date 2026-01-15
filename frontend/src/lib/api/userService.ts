import {
  AccessLog,
  CreateUserPayload,
  LoginPayload,
  LoginResponse,
  User,
} from "../types/UserTypes";

// Default fallback URL.
// NOTE: Since your snippet showed 5000, I've updated the default here,
// but the 'serverUrl' from localStorage usually takes precedence in Electron.
const BASE_URL = "http://localhost:5000/api/users";

class UserApiService {
  /**
   * Helper to get the dynamic base URL if your app sets it at runtime (Electron)
   */
  private getBaseUrl(): string {
    const storedUrl = localStorage.getItem("serverUrl");
    return storedUrl ? `${storedUrl}/api/users` : BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;

    // ✅ 1. Retrieve the token from LocalStorage
    const token = localStorage.getItem("authToken");

    // ✅ 2. Attach the Authorization header
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Optional: If 401, you might want to trigger a logout in the UI eventually
        if (response.status === 401) {
          console.warn("Unauthorized request to", endpoint);
        }
        throw new Error(data.message || "API Request Failed");
      }

      return data;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // --- Auth Methods ---

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return this.request<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async logout(
    userId: number,
    machineType: "server" | "client"
  ): Promise<void> {
    await this.request("/logout", {
      method: "POST",
      body: JSON.stringify({ userId, machineType }),
    });
  }

  // --- User Management Methods ---

  async getAllUsers(): Promise<User[]> {
    const response = await this.request<{ success: boolean; users: any[] }>(
      "/list"
    );

    // Parse permissions if they come back as strings from SQLite
    return response.users.map((u) => ({
      ...u,
      permissions:
        typeof u.permissions === "string"
          ? JSON.parse(u.permissions)
          : u.permissions,
    }));
  }

  async createUser(
    payload: CreateUserPayload
  ): Promise<{ success: boolean; userId: number }> {
    return this.request("/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request(`/${id}`, {
      method: "DELETE",
    });
  }

  async getAccessLogs(): Promise<AccessLog[]> {
    const response = await this.request<{
      success: boolean;
      logs: AccessLog[];
    }>("/logs");
    return response.logs;
  }
  async updateUser(
    id: number,
    payload: Partial<CreateUserPayload>
  ): Promise<{ success: boolean }> {
    return this.request(`/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
}

export default new UserApiService();
