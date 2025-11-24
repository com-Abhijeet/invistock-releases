import * as service from "../services/categoryService.mjs";

export async function getAllCategoriesController(req, res) {
  try {
    const data = await service.fetchAllCategories();
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error(
      `[BACKEND] - CATEGORY CONTROLLER - ERROR IN GETTING ALL CATEGORIES ${err}`
    );
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function createCategoryController(req, res) {
  try {
    const result = await service.createCategoryWithSubcategories(req.body);
    res.status(201).json({ status: "success", data: result });
  } catch (err) {
    console.error(
      `[BACKEND] - CATEGORY CONTROLLER - ERROR IN CREATING CATEGORY  ${err}`
    );
    res.status(400).json({ status: "error", message: err.message });
  }
}

export async function updateCategoryController(req, res) {
  try {
    const { id } = req.params;
    await service.updateCategoryWithSubcategories(Number(id), req.body);
    res
      .status(200)
      .json({ status: "success", message: "Updated successfully" });
  } catch (err) {
    console.error(
      `[BACKEND] - CATEGORY CONTROLLER - ERROR IN UPDATING CATEGORY ${err}`
    );
    res.status(400).json({ status: "error", message: err.message });
  }
}

export async function deleteCategoryController(req, res) {
  try {
    const { id } = req.params;
    await service.removeCategory(Number(id));
    res
      .status(200)
      .json({ status: "success", message: "Deleted successfully" });
  } catch (err) {
    console.error(
      `[BACKEND] - CATEGORY CONTROLLER - ERROR IN DELETING CATEGORY ${err}`
    );
    res.status(500).json({ status: "error", message: err.message });
  }
}
