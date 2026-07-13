/**
 * Intermediate Voucher Model for ERP Sync
 * This model defines a standard schema that can be translated into XML for Tally, BUSY, etc.
 */

export class AccountingDocument {
  constructor() {
    this.id = null;
    this.voucherType = ""; // Sales, Purchase, Receipt, Payment
    this.action = "Create"; // Create, Alter, Cancel
    this.date = ""; // YYYY-MM-DD
    this.referenceNo = "";
    
    // Ledger details
    this.partyLedgerName = "";
    this.partyState = "";
    this.isInterstate = false;
    
    // Financial details
    this.totalAmount = 0;
    this.taxableAmount = 0;
    this.cgstAmount = 0;
    this.sgstAmount = 0;
    this.igstAmount = 0;
    this.discountAmount = 0;
    this.roundOffAmount = 0;
    
    // Transaction details
    this.paymentMode = "cash";
    this.narration = "";
    
    // Items (for Inventory Mode)
    this.items = []; // Array of { name, quantity, rate, amount, unit, gstRate }
    
    // View flags
    this.isItemized = false;
  }
}
