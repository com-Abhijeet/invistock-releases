export type ShopSetupForm = {
  shop_name: string;
  owner_name: string;
  contact_number: string;
  email: string;
  shop_alias: string;
  use_alias_on_bills: boolean;

  //ADDRESS
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;

  // GSTIN
  gstin: string;
  gst_registration_type: "regular" | "composition" | "unregistered";
  pan_number: string;

  // Other details
  website_url: string;
  logo_url: string;
  invoice_prefix: string;
  invoice_start_number: number;
  financial_year_start: string;

  // Tax and billing preferences
  gst_enabled: boolean;
  inclusive_tax_pricing: boolean;
  default_gst_rate: number;
  hsn_required: boolean;
  gst_invoice_format: string;
  show_gst_breakup: boolean;

  //Other preferences
  currency_symbol: string;
  currency_position: "before" | "after";
  date_format: string;
  time_format: "12h" | "24h";
  default_payment_mode: string;
  allow_negative_stock: boolean;
  low_stock_threshold: number;

  //print and application preferences
  label_printer_name: string;
  invoice_printer_name: string;
  invoice_printer_width_mm: string;
  invoice_template_id: string;
  silent_printing: boolean;
  print_after_save: boolean;
  default_printer: string;

  label_printer_width_mm: number;
  label_template_default: string;
  label_template_id: string;

  theme: "light" | "dark";
  language: string;
  round_off_total: boolean;
  show_discount_column: boolean;
  barcode_prefix: string;
  enable_auto_backup: boolean;
  backup_path: string;

  //banking Details
  bank_account_no: number;
  bank_account_ifsc_code: string;
  bank_account_holder_name: string;
  bank_account_type: "savings" | "current";
  bank_account_branch: string;
  bank_name: string;

  //upi Details
  upi_id: string;
  upi_banking_name: string;

  last_reset_fy: string;
};
