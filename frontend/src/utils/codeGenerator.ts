// A simple type definition for categories used in validation
type CategoryStub = {
  id?: number | null;
  code: string;
};

/**
 * Generates a code from a name string with a specified length.
 * @param name The name to generate a code from.
 * @param length The desired length of the code (defaults to 3).
 * @returns {string} The generated code.
 */
export function generateCodeFromName(name: string, length: number = 3): string {
  if (!name) return "";
  return name.trim().toUpperCase().slice(0, length);
}

/**
 * Checks if a category code is a duplicate among existing categories,
 * correctly ignoring the category being edited.
 * @param code The code to check.
 * @param existingCategories An array of all existing category objects.
 * @param editingId The ID of the category currently being edited.
 * @returns {boolean} True if the code is a duplicate.
 */
export function isDuplicateCategoryCode(
  code: string,
  existingCategories: CategoryStub[],
  editingId?: number | null
): boolean {
  if (!code) return false; // An empty code is not a duplicate.
  const upperCaseCode = code.trim().toUpperCase();

  return existingCategories.some(
    // A duplicate is another item (with a different ID) that has the same code.
    (category) =>
      category.code.trim().toUpperCase() === upperCaseCode &&
      category.id !== editingId
  );
}

/**
 * Checks if a subcategory code is a duplicate within the current list being edited.
 * @param code The code to check.
 * @param subcategories The current array of subcategories in the form.
 * @param index The index of the subcategory being checked.
 * @returns {boolean} True if the code is a duplicate.
 */
export function isDuplicateSubCode(
  code: string,
  subcategories: { code: string }[],
  index: number
): boolean {
  if (!code) return false;
  const upperCaseCode = code.trim().toUpperCase();

  return subcategories.some(
    // A duplicate is another subcategory (at a different index) with the same code.
    (sub, i) => i !== index && sub.code.trim().toUpperCase() === upperCaseCode
  );
}
