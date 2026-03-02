import express from "express";
import {
  getGstr1ReportController,
  getGstr2ReportController,
  getGstr3bReportController,
} from "../controllers/gstrController.mjs";

const gstrRoutes = express.Router();

// --- GST Reports ---

// GET /api/reports/gstr1?periodType=month&month=9&year=2025
// Fetches and categorizes all outward supply data required for a GSTR-1 report.
gstrRoutes.get("/gstr1", getGstr1ReportController);

// GET /api/reports/gstr2?periodType=month&month=9&year=2025
// Fetches and categorizes all inward supply (purchase) data required for a GSTR-2 report.
gstrRoutes.get("/gstr2", getGstr2ReportController);

// GET /api/reports/gstr3b?periodType=month&month=9&year=2025
// Fetches and aggregates liability and ITC summary data for a GSTR-3B report.
gstrRoutes.get("/gstr3b", getGstr3bReportController);

export default gstrRoutes;
