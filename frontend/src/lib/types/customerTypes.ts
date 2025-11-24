export interface CustomerType {
  id?: number;
  name: string;
  phone: string;
  
  // ✅ Updated for structured address
  address?: string; // Represents street address / line 1
  city?: string;
  state?: string;
  pincode?: string;
  
  gst_no?: string;
  credit_limit?: number;
  additional_info?: string; // ✅ Corrected from 'additional_details' for consistency
  
  // ✅ Timestamps
  created_at?: string | number | Date;
  updated_at?: string | number | Date; // ✅ Added to match database schema
}