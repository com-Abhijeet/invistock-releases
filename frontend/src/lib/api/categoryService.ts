import { api } from "./api"; 

export async function getCategories() {
  try {
    // ✅ Use api.get and await the response
    const res = await api.get("/api/categories");
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch categories",
    );
  }
}

// Add a new category
export async function createCategory(payload: { name: string; code: string }) {
  try {
    const res = await api.post("/api/categories", payload);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create category",
    );
  }
}

// Update a category by ID
export async function updateCategory(
  id: number,
  payload: { name: string; code: string },
) {
  try {
    const res = await api.put(`/api/categories/${id}`, payload);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update category",
    );
  }
}

// Delete a category by ID
export async function deleteCategory(id: number) {
  try {
    await api.delete(`/api/categories/${id}`);
    return true;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete category",
    );
  }
}
