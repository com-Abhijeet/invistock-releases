import express from "express";
import {
  getAllCategoriesController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "../controllers/categoryController.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";
import { categorySchema } from "../validations/categorySchema.mjs";

const router = express.Router();

router.get("/", getAllCategoriesController);
router.post("/", validateRequest(categorySchema), createCategoryController);
router.put("/:id", validateRequest(categorySchema), updateCategoryController);
router.delete("/:id", deleteCategoryController);

export default router;
