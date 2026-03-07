const { getTemplate } = require("./templateManager.js");

const DUMMY_DATA = {
  shop: {
    shop_name: "Demo Shop Enterprises",
    address_line1: "123, Market Street",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    contact_number: "9876543210",
    email: "demo@shop.com",
    gstin: "27ABCDE1234F1Z5",
    gst_enabled: true,
    show_discount_column: true,
    inclusive_tax_pricing: false,
    currency_symbol: "₹",

    // --- Added Bank Details ---
    bank_name: "HDFC Bank",
    bank_account_no: "50100198765432",
    bank_account_ifsc_code: "HDFC0001234",
    bank_account_holder_name: "Demo Shop Enterprises",

    // --- Added UPI Details ---
    upi_id: "demoshop@hdfcbank",
    upi_banking_name: "Demo Enterprises",
    // Placeholder QR for preview (Public QR API for demo)
    generated_upi_qr:
      "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=demoshop@hdfcbank&pn=DemoShopEnterprises",
  },
  sale: {
    reference_no: "INV-2024-001",
    created_at: new Date().toISOString(),
    customer_name: "John Doe",
    customer_phone: "9123456789",
    customer_address: "Flat 101, Residency Park",
    customer_state: "Maharashtra", // Added for place of supply logic
    payment_mode: "UPI",
    total_amount: 1500,
    paid_amount: 1500,
    status: "paid",
    items: [
      {
        product_name: "Wireless Mouse",
        quantity: 2,
        rate: 500,
        discount: 0,
        price: 1000,
        gst_rate: 18,
        hsn: "8471", // Added HSN
      },
      {
        product_name: "USB Keyboard",
        quantity: 1,
        rate: 500,
        discount: 0,
        price: 500, // 500 - 10% = 450
        gst_rate: 18,
        hsn: "8471",
      },
    ],
  },
  // --- ADDED DUMMY PREFERENCES HERE ---
  localSettings: {
    columns: {
      showHsnSac: true,
      showGstRateCol: true,
      showGstAmtCol: true,
      showDiscountCol: true,
    },
    display: {
      showGstBreakdownBottom: true,
    },
    legal: {
      jurisdiction: "Subject to Jalna Jurisdiction only",
      disclaimer:
        "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      termsAndConditions:
        "1. Payment must be made within 15 days.\n2. Interest @ 18% p.a. will be charged on delayed payments.\n3. Goods once sold will not be taken back.",
    },
  },
};

function registerTemplateHandlers(ipcMain) {
  ipcMain.handle("generate-template-preview", async (event, templateId) => {
    try {
      // Generate HTML using the manager and dummy data
      // We pass DUMMY_DATA which now includes bank/UPI info and local print settings required by the templates
      const html = getTemplate(templateId || "a4_standard", DUMMY_DATA);
      return { success: true, html };
    } catch (error) {
      console.error("Preview Generation Error:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTemplateHandlers };
