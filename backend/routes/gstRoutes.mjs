import express from "express";
import { getGstr1ReportController } from "../controllers/gstrController.mjs";

const gstrRoutes = express.Router();

// --- GST Reports ---

// GET /api/reports/gstr1?month=9&year=2025
// Fetches and categorizes all data required for a GSTR-1 report.
gstrRoutes.get("/gstr1", getGstr1ReportController);

export default gstrRoutes;
