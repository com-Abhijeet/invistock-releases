export interface Subcategory {
  id?: number;
  name: string;
  code: string;
}

export interface Category {
  id?: number;
  name: string;
  code: string;
  subcategories: Subcategory[];
}
