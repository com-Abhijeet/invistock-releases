export type SupplierType = {
  id?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  
  address?: string; // For street address / line 1
  city?: string;
  state?: string;
  pincode?: string;

  gst_number?: string;
  supplier_type?: 'local' | 'wholeseller' | 'manufacturer' | 'distributor';
  
  bank_account?: string;
  ifsc_code?: string;
  upi_id?: string;

  notes?: string;

  created_at?: string | Date;
  updated_at?: string | Date;

};