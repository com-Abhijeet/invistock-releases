import {
  getAllCategories,
  getCategoryByCode,
  insertCategory,
  updateCategory,
  deleteCategory,
  insertSubcategory,
  deleteSubcategoriesByCategoryId,
  getSubcategoryByCode,
} from "../repositories/categoryRepository.mjs";

export async function fetchAllCategories() {
  return getAllCategories();
}

export async function createCategoryWithSubcategories({
  name,
  code,
  subcategories,
}) {
  // Validate no duplicate category code
  const existing = getCategoryByCode(code);
  if (existing) {
    throw new Error("Category code must be unique");
  }

  const categoryId = insertCategory({ name, code });

  const usedCodes = new Set();
  for (const sub of subcategories) {
    if (usedCodes.has(sub.code))
      throw new Error("Duplicate subcategory code in request");
    usedCodes.add(sub.code);

    const existingSub = getSubcategoryByCode(categoryId, sub.code);
    if (existingSub)
      throw new Error("Subcategory code already exists in category");

    insertSubcategory(categoryId, sub);
  }

  return { id: categoryId };
}

export async function updateCategoryWithSubcategories(
  id,
  { name, code, subcategories }
) {
  const existing = getCategoryByCode(code);
  if (existing && existing.id !== id) {
    throw new Error("Another category with same code exists");
  }

  updateCategory(id, { name, code });

  deleteSubcategoriesByCategoryId(id);

  const usedCodes = new Set();
  for (const sub of subcategories) {
    if (usedCodes.has(sub.code))
      throw new Error("Duplicate subcategory code in request");
    usedCodes.add(sub.code);

    insertSubcategory(id, sub);
  }
}

export async function removeCategory(id) {
  deleteCategory(id);
}
