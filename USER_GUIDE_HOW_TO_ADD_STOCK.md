# Invistock / Kosh ERP — How to Add Stock (Complete Guide)

This guide covers **every method and scenario** for adding stock into Invistock / Kosh ERP. Whether you are onboarding new items, recording vendor purchases, scanning serial numbers, or adjusting physical stock after an inventory count, follow the step-by-step workflows below.

---

## Quick Reference: Ways to Add Stock

| Method | Primary Page | Shortcut / Menu | Best Used For |
| :--- | :--- | :--- | :--- |
| **1. Direct Product Creation** | Stock Items | **F7** -> `+ Add Product` | Initial item setup, entering opening stock, new product registration |
| **2. Purchase Voucher Entry** | Purchase Voucher | **F4** -> `Purchase` | Receiving vendor shipments, updating supplier ledgers, invoice-based stock entry |
| **3. Manual Stock Adjustments** | Stock Adjustments | `Inventory Books` -> `Stock Adjustments` | Correcting audit discrepancies, adding found stock, damaged item write-offs |
| **4. Bulk Excel / CSV Import** | Stock Items | **F7** -> `Import` | Initial bulk onboarding of hundreds of items at once |

---

## Section 1: Understanding Product Tracking Modes

Before adding stock, understand how Invistock tracks your product. Each product is configured under one of **3 Tracking Modes**:

1. **Standard Mode (`standard`)**
   - Stock is tracked purely by quantity (e.g., 50 Pcs of Soap, 100 Bags of Cement).
   - No batch numbers or serial numbers required.

2. **Batch Mode (`batch`)**
   - Stock is tracked in specific batches with **Batch Numbers**, **Mfg Date**, **Expiry Date**, and **Batch MRP**.
   - Critical for Pharmaceuticals, Food & FMCG, Cosmetics, Chemicals, and perishable items.

3. **Serial Mode (`serial`)**
   - Every single unit has a unique individual **Serial Number** / **IMEI** / **Barcode** (e.g., Laptops, Mobile Phones, Electronics, Machinery).
   - Stock quantity automatically matches the total number of valid serial numbers registered.

---

## Section 2: Method 1 — Adding Stock via "Add Product" (Opening Stock)

Use this method when registering a new product into the system along with its starting physical inventory balance.

### Step-by-Step Procedure:

1. **Open the Add Product Window:**
   - Press **F7** on your keyboard (or click **Stock Items** from the sidebar).
   - Click the **+ Add Product** button in the top right.

2. **Smart Barcode Lookup (Optional Speed Workflow):**
   - Place your cursor in the **Barcode Lookup** field.
   - Scan the product's barcode with your barcode scanner (or type it and press `Enter`).
   - If the item exists in the central product catalog database, the **Product Name**, **Category**, **HSN Code**, and **Brand** will populate automatically!

3. **Fill Required Product & Stock Details:**
   - **Product Name:** Full name of the product.
   - **Category & Subcategory:** Select existing or type to create a new category on the fly.
   - **Tracking Type:** Choose `Standard`, `Batch`, or `Serial`.
   - **Barcode / SKU:** Scan or type barcode. Click **Auto-Generate** if the product doesn't have a manufacturer barcode.
   - **Opening Quantity:** Enter your current in-stock balance (e.g., `25`).
   - **Base Unit & Pricing Unit:** Choose base stock unit (`pcs`, `kg`, `g`, `m`, `box`) and sales unit.
   - **Pricing & Tax:** Enter **MRP**, **Sales Price (MOP)**, **Purchase Price**, **GST Rate (%)**, and **HSN Code**.

4. **Handling Batch / Serial Opening Stock:**
   - **If Batch Mode:** The system prompts you to enter initial batch details:
     - `Batch Number` (e.g. `BATCH-2026-01`)
     - `Mfg Date` & `Expiry Date`
     - `Batch Qty` (matches Opening Qty)
   - **If Serial Mode:** The system opens the serial entry window:
     - Scan serial barcodes one by one using a scanner, or paste a list of serial numbers line by line.
     - The quantity automatically updates to match the count of entered serial numbers.

5. **Save Product:**
   - Click **Save Product** (or press `Enter` through all fields).
   - **Result:** Product is created and opening stock is instantly updated in your inventory register.

---

## Section 3: Method 2 — Adding Stock via Purchase Vouchers (F4)

*This is the standard business process for adding stock when receiving stock shipments from vendors or suppliers.*

### Step-by-Step Procedure:

1. **Open Purchase Voucher:**
   - Press **F4** on your keyboard (or click **Purchase Voucher** under *Purchase Vouchers* in the sidebar).

2. **Select Vendor & Invoice Details:**
   - **Supplier (F5):** Select supplier from drop-down or press `F5` to create a new supplier.
   - **Invoice Number:** Enter supplier's invoice/bill number.
   - **Purchase Date:** Select billing date.

3. **Adding Items to the Purchase Order:**
   - **Barcode Scanner Lookup:** Click in the barcode box and scan the item. It is instantly added to the purchase table.
   - **Name / SKU Lookup:** Type the product name or SKU in the search box and press `Enter`.
   - **Quick Add Missing Item:** If the supplier sends a brand-new item not yet registered in your software, click **+ Quick Add Product** right inside the Purchase screen without leaving your bill!

4. **Entering Quantities & Tracking Details:**

   - **For Standard Items:**
     - Enter **Received Quantity**.
     - Enter **Purchase Price per Unit** (excl. or incl. GST).
     - Apply item-level discounts if applicable.

   - **For Batch Items (Assign / Create Batch Modal):**
     - Click **Assign / Create Batch**.
     - You can **Select an existing batch** or **Create a new batch**.
     - Enter **Batch Number**, **Mfg Date**, **Expiry Date**, and **Batch MRP**.
     - Enter quantity received for this batch.

   - **For Serial Items (Fast Serial Scanner):**
     - Click **Add / Scan Serials**.
     - Use the **Fast Serial Scanner Input**:
       - Scan continuous barcodes; duplicate scans trigger an audio alert and prevent duplicate entries.
       - Alternatively, copy-paste multi-line text containing all serial numbers.
     - Click **Confirm Serials**.

5. **Review Tax, Additional Charges & Save:**
   - Verify GST breakdown (CGST + SGST or IGST).
   - Add freight/transport charges or round-off if applicable.
   - Select Payment Type: **Credit (On Account)**, **Cash**, or **Bank/UPI**.
   - Click **Save Purchase Voucher**.

6. **System Effect:**
   - Inventory stock counts increase immediately.
   - Batch numbers and serial items become available for POS billing.
   - Supplier ledger balance updates automatically.

---

## Section 4: Method 3 — Adding Stock via Stock Adjustments (Manual Audits)

Use this method when you find extra unrecorded stock during physical inventory counts, receive free promotional samples, or need to correct opening balance discrepancies.

### Step-by-Step Procedure:

1. **Navigate to Stock Adjustments:**
   - Go to **Inventory Books** -> **Stock Adjustments** (`/adjustments`).
2. **Create New Adjustment:**
   - Click **+ New Stock Adjustment**.
3. **Configure Adjustment Parameters:**
   - **Adjustment Type:** Select **ADD / INCREASE STOCK (+)**.
   - **Date:** Select date of physical audit.
   - **Reason:** Select reason from drop-down:
     - *Physical Audit Count*
     - *Found Unrecorded Stock*
     - *Opening Balance Adjustment*
     - *Supplier Free Sample*
4. **Select Product & Quantities:**
   - Search and select the item.
   - Enter **Quantity to Add**.
   - If Batch/Serial item, assign batch details or input serial numbers.
5. **Save Adjustment:**
   - Click **Save Adjustment**.
   - An immutable stock audit trail log is recorded under **Access Logs** and **Stock Adjustment Register**.

---

## Section 5: Method 4 — Bulk Adding Stock via Excel / CSV Import

Use this method when setting up Invistock for the first time or onboarding large inventory catalogs from spreadsheets.

### Step-by-Step Procedure:

1. Press **F7** to go to **Stock Items**.
2. Click **Import / Export** -> **Import Products**.
3. Click **Download Excel Template**.
4. Fill out the template columns:
   - `Product Name`, `SKU / Barcode`, `Category`, `HSN Code`, `GST Rate`, `Quantity` (Opening Stock), `Purchase Rate`, `MRP`, `Sale Price (MOP)`, `Tracking Type` (`standard`/`batch`/`serial`).
5. Save spreadsheet as `.xlsx` or `.csv`.
6. Click **Upload File** -> Preview parsed rows -> Click **Confirm Import**.
7. System imports all items and updates initial stock balances in bulk.

---

## Summary Checklist for Accurate Stock Entry

- [x] **Verify Tracking Mode:** Ensure product tracking type (`standard`, `batch`, `serial`) is chosen correctly before saving.
- [x] **Check Base vs Pricing Units:** Ensure pricing multiplier matches your unit setup (e.g. stocking in `grams`, pricing per `kg`).
- [x] **Input Expiry Dates:** Always input accurate expiry dates for batch items so the system can trigger alerts in the **Expiry Report**.
- [x] **Audit Balance:** Verify updated totals in **Stock Summary (F6)** after completing stock entry.
