import express from "express";
import {
  createShop,
  getShop,
  setupShop,
  updateShop,
} from "../controllers/shopController.mjs";
import { createShopSchema, shopSchema } from "../validations/shopSchema.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";

const shopRoutes = express.Router();

shopRoutes.post("/", validateRequest(createShopSchema), createShop);
shopRoutes.get("/", getShop);
shopRoutes.put("/", updateShop);

export default shopRoutes;
