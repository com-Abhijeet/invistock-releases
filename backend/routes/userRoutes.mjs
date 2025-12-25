import express from "express";
import * as userController from "../controllers/userController.mjs";
import { requireAuth } from "../middlewares/authMiddleware.mjs"; // ✅ Import the middleware

const router = express.Router();

// --- Public Routes (No Token Required) ---
router.post("/login", userController.login);
router.post("/logout", userController.logout);

// --- Protected Routes (Token Required) ---
// These routes will now check for a valid JWT token in the Authorization header.
// If valid, req.user will be populated for the controller to use.

router.post("/create", requireAuth, userController.createUser);
router.put("/:id", requireAuth, userController.updateUser);
router.get("/list", requireAuth, userController.getUsers);
router.delete("/:id", requireAuth, userController.deleteUser);

// ✅ Add the Logs endpoint (Missing in your snippet)
// This matches the userApiService.getAccessLogs() call: GET /api/users/logs
router.get("/logs", requireAuth, userController.getAccessLogs);

export default router;
