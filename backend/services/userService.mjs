import userRepository from "../repositories/userRepository.mjs";
import bcrypt from "bcrypt";

class UserService {
  async registerUser(data, adminUser) {
    // Only admins can create users
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Unauthorized: Only admins can create users.");
    }

    const existing = userRepository.findUserByUsername(data.username);
    if (existing) {
      throw new Error("Username/ID already exists.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const permissions = JSON.stringify(data.permissions || []); // e.g. ["view_dashboard", "create_invoice"]

    return userRepository.createUser({
      name: data.name,
      username: data.username,
      password: hashedPassword,
      role: data.role || "employee",
      permissions,
    });
  }

  async login(username, password, machineInfo) {
    const user = userRepository.findUserByUsername(username);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // Log the successful login
    userRepository.logActivity({
      user_id: user.id,
      user_name: user.name,
      action: "LOGIN",
      details: "User logged in successfully",
      machine_type: machineInfo.type || "unknown", // 'server' or 'client'
      ip_address: machineInfo.ip || "127.0.0.1",
    });

    // Return user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async logout(userId, machineInfo) {
    const user = userRepository.findUserById(userId);
    if (user) {
      userRepository.logActivity({
        user_id: user.id,
        user_name: user.name,
        action: "LOGOUT",
        details: "User logged out",
        machine_type: machineInfo.type,
        ip_address: machineInfo.ip,
      });
    }
  }

  checkAccess(userId, requiredPermission) {
    const user = userRepository.findUserById(userId);
    if (!user) return false;
    if (user.role === "admin") return true; // Admin has all access

    const permissions = JSON.parse(user.permissions || "[]");
    return permissions.includes(requiredPermission);
  }

  getAllUsers(adminUser) {
    if (!adminUser || adminUser.role !== "admin")
      throw new Error("Unauthorized");
    return userRepository.getAllUsers();
  }

  async updateUser(id, updates, adminUser) {
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Unauthorized: Only admins can update users.");
    }

    // Check if user exists
    const existingUser = userRepository.findUserById(id);
    if (!existingUser) {
      throw new Error("User not found.");
    }

    // If username is being changed, check for uniqueness
    if (updates.username && updates.username !== existingUser.username) {
      const duplicate = userRepository.findUserByUsername(updates.username);
      if (duplicate) {
        throw new Error("Username already taken.");
      }
    }

    const safeUpdates = { ...updates };

    // Handle Password Update
    if (safeUpdates.password && safeUpdates.password.trim() !== "") {
      safeUpdates.password = await bcrypt.hash(safeUpdates.password, 10);
    } else {
      // If password is empty/undefined, remove it from updates so we don't overwrite with blank
      delete safeUpdates.password;
    }

    // Handle Permissions
    if (safeUpdates.permissions) {
      safeUpdates.permissions = JSON.stringify(safeUpdates.permissions);
    }

    return userRepository.updateUser(id, safeUpdates);
  }

  deleteUser(targetId, adminUser) {
    if (!adminUser || adminUser.role !== "admin")
      throw new Error("Unauthorized");
    if (targetId === adminUser.id) throw new Error("Cannot delete yourself");
    return userRepository.deleteUser(targetId);
  }

  // ✅ ADDED: Get Recent Logs Method
  getRecentLogs(limit = 100) {
    return userRepository.getRecentLogs(limit);
  }
}

export default new UserService();
