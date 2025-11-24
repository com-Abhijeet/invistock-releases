import db from "../db/db.mjs";

// GET all categories with subcategories
export async function getAllCategories() {
  const categoryStmt = db.prepare("SELECT * FROM categories");
  const categories = categoryStmt.all();

  const subStmt = db.prepare("SELECT * FROM subcategories");
  const subcategories = subStmt.all();

  return categories.map((cat) => ({
    ...cat,
    subcategories: subcategories.filter((sub) => sub.category_id === cat.id),
  }));
}

// GET category by code
export function getCategoryByCode(code) {
  const stmt = db.prepare("SELECT * FROM categories WHERE code = ?");
  return stmt.get(code);
}

// CREATE category
export function insertCategory({ name, code }) {
  const stmt = db.prepare("INSERT INTO categories (name, code) VALUES (?, ?)");
  const info = stmt.run(name, code);
  return info.lastInsertRowid;
}

// UPDATE category
export function updateCategory(id, { name, code }) {
  const stmt = db.prepare(
    "UPDATE categories SET name = ?, code = ? WHERE id = ?"
  );
  stmt.run(name, code, id);
}

// DELETE category (and subcategories)
export function deleteCategory(id) {
  db.prepare("DELETE FROM subcategories WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

// SUBCATEGORY related
export function insertSubcategory(categoryId, { name, code }) {
  const stmt = db.prepare(
    "INSERT INTO subcategories (name, code, category_id) VALUES (?, ?, ?)"
  );
  stmt.run(name, code, categoryId);
}

export function deleteSubcategoriesByCategoryId(categoryId) {
  const stmt = db.prepare("DELETE FROM subcategories WHERE category_id = ?");
  stmt.run(categoryId);
}

export function getSubcategoryByCode(categoryId, code) {
  const stmt = db.prepare(
    "SELECT * FROM subcategories WHERE category_id = ? AND code = ?"
  );
  return stmt.get(categoryId, code);
}
