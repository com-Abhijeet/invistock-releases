export interface Subcategory {
  id?: number;
  name: string;
  code: string;
}

export interface Category {
  id?: number;
  name: string;
  code: string;
  default_preset_id?: number | null;
  subcategories: Subcategory[];
}
