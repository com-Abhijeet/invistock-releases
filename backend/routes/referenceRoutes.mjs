import express from "express";
import { generateReferenceController } from "../controllers/referenceController.mjs";

const referenceRoutes = express.Router();

// GET /reference/generate?type=S
// Generates the next sequential reference number for a given type.
referenceRoutes.get("/generate", generateReferenceController);

export default referenceRoutes;
