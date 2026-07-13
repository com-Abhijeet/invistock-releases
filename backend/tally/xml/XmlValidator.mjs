/**
 * Validates AccountingDocument objects before XML generation.
 * Prevents malformed XML or rejected vouchers by Tally.
 */
export class XmlValidator {
  /**
   * @param {import("../models/AccountingDocument.mjs").AccountingDocument} doc 
   */
  static validate(doc) {
    if (doc.action === "Delete") return { isValid: true };

    const errors = [];

    if (!doc.date) errors.push("Missing Voucher Date.");
    if (!doc.voucherType) errors.push("Missing Voucher Type (Sales, Purchase, etc).");
    if (!doc.partyLedgerName) errors.push("Missing Party Ledger Name.");

    // Math validation (only for standard invoices)
    if (doc.voucherType === "Sales" || doc.voucherType === "Purchase") {
      const totalTax = (doc.cgstAmount || 0) + (doc.sgstAmount || 0) + (doc.igstAmount || 0);
      const calculatedTotal = (doc.taxableAmount || 0) + totalTax + (doc.roundOffAmount || 0) - (doc.discountAmount || 0);
      
      // Allow slight fractional differences (e.g., 0.01) due to JS float precision
      if (Math.abs(calculatedTotal - doc.totalAmount) > 0.1) {
        errors.push(`Mathematical Mismatch: Total Amount (${doc.totalAmount}) does not match Taxable + Tax + RoundOff - Discount (${calculatedTotal}).`);
      }

      if (doc.isItemized && (!doc.items || doc.items.length === 0)) {
        errors.push("Itemized voucher has no items.");
      }
    } else {
      if (!doc.totalAmount) errors.push("Voucher must have a total amount.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
