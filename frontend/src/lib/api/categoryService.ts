import { api } from "./api"; // ✅ Import your central api instance

const CATEGORY_CACHE_KEY = "categories";
// ❌ The baseUrl constant is no longer needed; it's in api.ts

// Get categories with localStorage caching
export async function getCategories() {
  const cached = localStorage.getItem(CATEGORY_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    // ✅ Use api.get and await the response
    const res = await api.get("/api/categories");

    // ✅ Axios puts the JSON data in res.data
    localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(res.data.data));
    return res.data.data;
  } catch (error: any) {
    // ✅ Axios automatically throws on non-2xx status
    throw new Error(
      error.response?.data?.message || "Failed to fetch categories"
    );
  }
}

// Clear category cache manually
export function clearCategoryCache() {
  localStorage.removeItem(CATEGORY_CACHE_KEY);
}

// Add a new category
export async function createCategory(payload: { name: string; code: string }) {
  try {
    // ✅ Use api.post. No headers or JSON.stringify needed.
    const res = await api.post("/api/categories", payload);

    clearCategoryCache();
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create category"
    );
  }
}

// Update a category by ID
export async function updateCategory(
  id: number,
  payload: { name: string; code: string }
) {
  try {
    // ✅ Use api.put
    const res = await api.put(`/api/categories/${id}`, payload);

    clearCategoryCache();
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update category"
    );
  }
}

// Delete a category by ID
export async function deleteCategory(id: number) {
  try {
    // ✅ Use api.delete
    await api.delete(`/api/categories/${id}`);

    clearCategoryCache();
    return true; // Keep the same return signature as the original
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete category"
    );
  }
}
