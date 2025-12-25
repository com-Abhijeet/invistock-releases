import express from "express";
import { globalSearch } from "../controllers/searchController.mjs";

const router = express.Router();

// Protected route - only logged in users can search
router.get("/", globalSearch);

export default router;
