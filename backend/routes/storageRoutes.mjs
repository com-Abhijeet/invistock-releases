import express from "express";
import { addStorageLocation } from "../controllers/storageController.mjs";

const storageRoutes = express.Router();

storageRoutes.post("/", addStorageLocation);

export default storageRoutes;
