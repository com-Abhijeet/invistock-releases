import type { Product } from "../lib/types/product";
import type { Category } from "../lib/types/categoryTypes";

export const generateProductCode = (
  categoryId: number | null,
  subcategoryId: number | null,
  availableCategories: Category[],
  products: Product[]
): string => {
  if (!categoryId || !subcategoryId) {
    return "";
  }

  const category = availableCategories.find((cat) => cat.id === categoryId);
  const subcategory = category?.subcategories.find(
    (sub) => sub.id === subcategoryId
  );

  if (!category || !subcategory || !category.code || !subcategory.code) {
    return "";
  }

  const prefix = `${category.code}_${subcategory.code}`;
  
  const matchingProducts = products.filter((p) =>
    p.product_code.startsWith(prefix)
  );
  
  let nextIndex = 1;
  if (matchingProducts.length > 0) {
    const lastProduct = matchingProducts.sort((a, b) => {
      const numA = Number(a.product_code.split('_').pop());
      const numB = Number(b.product_code.split('_').pop());
      return numA - numB;
    }).pop();
    
    if (lastProduct) {
      const lastNumber = parseInt(lastProduct.product_code.split('_').pop() || '0', 10);
      if (!isNaN(lastNumber)) {
        nextIndex = lastNumber + 1;
      }
    }
  }

  const codeSuffix = String(nextIndex).padStart(3, '0');
  
  return `${prefix}_${codeSuffix}`;
};