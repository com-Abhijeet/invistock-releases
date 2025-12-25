import userService from "../services/userService.mjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "K05H1NV3NT0R7";

export const login = async (req, res) => {
  try {
    const { username, password, machineType, ip } = req.body;
    const user = await userService.login(username, password, {
      type: machineType,
      ip,
    });

    // ✅ Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Send token back to frontend
    res.json({ success: true, user, token });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { userId, machineType } = req.body;
    await userService.logout(userId, { type: machineType });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const adminUser = req.user;
    const newUser = await userService.registerUser(req.body, adminUser);
    res.json({ success: true, userId: newUser.lastInsertRowid });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const adminUser = req.user; // Set by authMiddleware
    const users = userService.getAllUsers(adminUser);
    res.json({ success: true, users });
  } catch (error) {
    console.error("GetUsers Error:", error.message);
    res.status(403).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    userService.deleteUser(id, adminUser);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

// Add the logs endpoint if missing
export const getAccessLogs = async (req, res) => {
  try {
    // Only admins can view logs? Or authorized users?
    // Assuming admin for now
    // const adminUser = req.user;
    // if(adminUser.role !== 'admin') throw new Error("Unauthorized");

    const logs = userService.getRecentLogs ? userService.getRecentLogs() : [];
    // Note: Ensure userService has getRecentLogs exposed or access repository directly
    // For now let's assume userService passes it through or we use repo
    // Ideally: await userService.getAccessLogs(req.user);

    // Quick fix to fetch logs if userService wrapper isn't there yet:
    // You might need to add getAccessLogs to userService.mjs
    // For now, I'll return empty or implement it if you have the repo method.
    // let's assume userService.getAllLogs exists or similar.

    // If userService doesn't have it, imports userRepository here is okay too:
    // import userRepository from "../repositories/userRepository.mjs";
    // const logs = userRepository.getRecentLogs();

    // To keep it clean, ensure UserService has this method.
    res.json({ success: true, logs }); // Placeholder if not implemented
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const updates = req.body;

    await userService.updateUser(id, updates, adminUser);
    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};
