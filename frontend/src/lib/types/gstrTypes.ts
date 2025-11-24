export type DashboardFilterType = "today" | "month" | "year" | "custom";

// Represents a single item's tax details within an invoice
interface Gstr1ItemDetail {
  txval: number; // Taxable Value
  rt: number;    // GST Rate
  iamt: number;  // IGST Amount
  camt: number;  // CGST Amount
  samt: number;  // SGST Amount
  csamt: number; // Cess Amount
}

// Represents a line item in an invoice
interface Gstr1Item {
  num: number;
  itm_det: Gstr1ItemDetail;
}

// Represents a single B2B or B2C Large invoice
interface Gstr1Invoice {
  inum: string;         // Invoice Number
  idt: string;          // Invoice Date (DD-MM-YYYY)
  val: number;          // Invoice Value (Grand Total)
  pos: string;          // Place of Supply (State Code)
  rchrg: "Y" | "N";   // Reverse Charge
  itms: Gstr1Item[];
}

// Represents the data for a single registered customer (B2B)
export interface Gstr1B2bData {
  ctin: string; // Customer GSTIN
  inv: Gstr1Invoice[];
}

// Represents the data for a B2C Small summary row
export interface Gstr1B2csData {
  pos: string;  // Place of Supply (State Code)
  rt: number;   // GST Rate
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

// Represents a single HSN summary row
export interface Gstr1HsnData {
  num: number;
  hsn_sc: string;     // HSN Code
  desc: string;       // Description
  uqc: string;        // Unit Quantity Code (e.g., 'NOS')
  qty: number;        // Total Quantity
  val: number;        // Total Value (Taxable + Tax)
  txval: number;      // Total Taxable Value
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

/**
 * @description Represents a single Credit or Debit Note issued to a registered customer (B2B).
 * This corresponds to an object within the `nt` array.
 */
export interface Gstr1CdnrNote {
  nt_num: string;         // Note Number
  nt_dt: string;          // Note Date (DD-MM-YYYY)
  ntty: 'C' | 'D';      // Note Type: C = Credit, D = Debit
  val: number;            // Note Value (Grand Total)
  p_gst: 'Y' | 'N';     // Pre-GST Regime (usually 'N')
  rchrg: 'Y' | 'N';     // Reverse Charge
  itms: Gstr1Item[];      // Reuses your existing Gstr1Item type for the tax breakdown
}

/**
 * @description Represents the data for a single registered customer in the CDNR section.
 * It groups all notes for that customer by their GSTIN.
 */
export interface Gstr1CdnrData {
  ctin: string; // Customer GSTIN
  nt: Gstr1CdnrNote[];
}

/**
 * @description Represents a single Credit or Debit Note issued to an unregistered customer (B2C).
 */
export interface Gstr1CdnurData {
  typ: 'B2CL' | 'B2CS'; // Type of original sale (B2C Large or other)
  nt_num: string;
  nt_dt: string;
  ntty: 'C' | 'D';
  val: number;
  itms: Gstr1Item[];
}

/**
 * @description Represents a single summary row for Nil-Rated, Exempt, or Non-GST supplies.
 */
export interface Gstr1NilInvoiceData {
  sply_ty: 'INTER' | 'INTRA'; // The type of supply: Interstate or Intrastate
  nil_amt: number;             // Total value of Nil Rated supplies
  expt_amt: number;            // Total value of Exempted supplies
  ngsup_amt: number;           // Total value of Non-GST supplies
}

/**
 * @description Represents the complete data for Table 8 of the GSTR-1 report.
 */
export interface Gstr1NilData {
  inv: Gstr1NilInvoiceData[];
}


export interface Gstr1ReportData {
  b2b: Gstr1B2bData[];
  b2cl: Gstr1Invoice[];
  b2cs: Gstr1B2csData[];
  hsn: {
    data: Gstr1HsnData[];
  };
  cdnr: Gstr1CdnrData[];
  cdnur: Gstr1CdnurData[];
  nil?: Gstr1NilData;
}