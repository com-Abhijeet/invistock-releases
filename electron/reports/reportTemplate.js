const formatCurrency = (amount) => {
  return (Number(amount) || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// --- UPGRADED PREMIUM STYLES ---
const getBaseStyle = () => `
  @page { margin: 15mm 15mm 20mm 15mm; size: A4 portrait; }
  body {
    font-family: 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif;
    color: #2b2b2b;
    margin: 0;
    padding: 0;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
  }
  
  /* --- HEADERS --- */
  .header {
    text-align: center;
    margin-bottom: 25px;
    border-bottom: 3px solid #1a237e;
    padding-bottom: 15px;
  }
  .shop-name { 
    font-size: 26px; 
    font-weight: 800; 
    color: #1a237e; 
    margin: 0; 
    text-transform: uppercase; 
    letter-spacing: 1.5px; 
  }
  .report-title { 
    font-size: 16px; 
    font-weight: 700; 
    margin: 8px 0 0 0; 
    color: #424242; 
    text-transform: uppercase; 
    letter-spacing: 0.5px; 
  }
  .report-meta { 
    display: inline-block;
    font-size: 11px; 
    color: #616161; 
    margin-top: 8px; 
    background: #f5f5f5; 
    padding: 4px 12px; 
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }
  
  /* --- SUMMARY CARDS --- */
  .summary-box { 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 25px; 
    gap: 15px; 
  }
  .summary-card { 
    flex: 1; 
    padding: 15px; 
    background: #ffffff; 
    border: 1px solid #e0e0e0; 
    border-radius: 6px; 
    border-top: 4px solid #1a237e; 
  }
  .summary-card.success { border-top-color: #2e7d32; }
  .summary-card.danger { border-top-color: #d32f2f; }
  .summary-card.warning { border-top-color: #f57c00; }
  
  .summary-label { 
    font-size: 9px; 
    color: #757575; 
    text-transform: uppercase; 
    font-weight: 700; 
    margin-bottom: 6px; 
    letter-spacing: 0.5px; 
  }
  .summary-value { 
    font-size: 18px; 
    font-weight: 800; 
    color: #212121; 
  }
  
  /* --- TABLES --- */
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin-top: 5px; 
    font-size: 11px; 
  }
  th { 
    background-color: #f8f9fa; 
    color: #424242; 
    font-weight: 700; 
    text-align: left; 
    padding: 10px 10px; 
    border-bottom: 2px solid #bdbdbd; 
    text-transform: uppercase; 
    letter-spacing: 0.5px; 
    font-size: 10px;
  }
  td { 
    padding: 10px; 
    border-bottom: 1px solid #eeeeee; 
    color: #424242; 
  }
  tbody tr:nth-child(even) { background-color: #fafafa; }
  
  /* --- TYPOGRAPHY & UTILS --- */
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; color: #212121; }
  .text-success { color: #2e7d32; }
  .text-danger { color: #d32f2f; }
  .text-warning { color: #f57c00; }
  .text-primary { color: #1a237e; }
  
  .section-title { 
    margin-top: 30px; 
    font-size: 12px; 
    font-weight: 800; 
    color: #1a237e; 
    border-bottom: 2px solid #e0e0e0; 
    padding-bottom: 6px; 
    margin-bottom: 10px; 
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .row-highlight { background-color: #e8eaf6 !important; }
  .row-total { background-color: #f5f5f5 !important; border-top: 2px solid #bdbdbd; }
  
  /* --- FOOTER --- */
  .footer { 
    position: fixed; 
    bottom: 0; 
    width: 100%; 
    text-align: center; 
    font-size: 9px; 
    color: #9e9e9e; 
    border-top: 1px solid #e0e0e0; 
    padding-top: 10px; 
    margin-top: 40px;
  }
`;

const renderHeader = (title, period, shopName = "KOSH BUSINESS") => `
  <div class="header">
    <h1 class="shop-name">${shopName}</h1>
    <h2 class="report-title">${title}</h2>
    ${period ? `<div class="report-meta">Period: ${formatDate(period.start)} &nbsp;&mdash;&nbsp; ${formatDate(period.end)}</div>` : ""}
  </div>
`;

const renderFooter = () => `
  <div class="footer">
    System Generated Report by Kosh Business &nbsp;|&nbsp; Generated on: ${new Date().toLocaleString("en-IN")} &nbsp;|&nbsp; Page 1 of 1
  </div>
`;

module.exports = {
  generatePnLTemplate: (data, period, shopName) => {
    return `
      <!DOCTYPE html><html><head><style>${getBaseStyle()}</style></head><body>
      ${renderHeader("Profit & Loss Statement", period, shopName)}
      
      <div class="summary-box">
        <div class="summary-card success">
          <div class="summary-label">Total Revenue</div>
          <div class="summary-value text-success">${formatCurrency(data.totalRevenue)}</div>
        </div>
        <div class="summary-card warning">
          <div class="summary-label">Cost of Goods (COGS)</div>
          <div class="summary-value">${formatCurrency(data.totalCogs)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Gross Profit</div>
          <div class="summary-value text-primary">${formatCurrency(data.grossProfit)}</div>
        </div>
        <div class="summary-card ${data.netProfit >= 0 ? "success" : "danger"}">
          <div class="summary-label">Net Profit / (Loss)</div>
          <div class="summary-value ${data.netProfit >= 0 ? "text-success" : "text-danger"}">${formatCurrency(data.netProfit)}</div>
        </div>
      </div>

      <div class="section-title">Income & Expenses Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Ledger Account</th>
            <th class="text-right" style="width: 30%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <!-- INCOME SECTION -->
          <tr class="row-highlight">
            <td class="font-bold text-primary" colspan="2">INDIRECT INCOMES</td>
          </tr>
          ${
            data.stockGain > 0
              ? `
            <tr>
              <td style="padding-left: 20px;">Inventory Gain (Positive Adjustments)</td>
              <td class="text-right text-success font-bold">+ ${formatCurrency(data.stockGain)}</td>
            </tr>
          `
              : `
            <tr>
              <td style="padding-left: 20px; color: #999;">No indirect incomes recorded</td>
              <td class="text-right text-success font-bold">-</td>
            </tr>
          `
          }
          
          <!-- EXPENSES SECTION -->
          <tr class="row-highlight">
            <td class="font-bold text-primary" colspan="2" style="border-top: 1px solid #ddd;">OPERATING EXPENSES & LOSSES</td>
          </tr>
          ${
            data.expenses.length === 0 && data.stockLoss === 0
              ? `
            <tr>
              <td colspan="2" class="text-center" style="color: #999;">No operating expenses recorded</td>
            </tr>
          `
              : ""
          }
          
          ${data.expenses
            .map(
              (e) => `
            <tr>
              <td style="padding-left: 20px;">${e.category}</td>
              <td class="text-right text-danger">- ${formatCurrency(e.total)}</td>
            </tr>
          `,
            )
            .join("")}

          ${
            data.stockLoss > 0
              ? `
            <tr>
              <td style="padding-left: 20px;">Inventory Loss (Negative Adjustments / Damages)</td>
              <td class="text-right text-danger font-bold">- ${formatCurrency(data.stockLoss)}</td>
            </tr>
          `
              : ""
          }

          <!-- TOTALS -->
          <tr class="row-total">
            <td class="font-bold" style="font-size: 12px; padding-top: 15px;">TOTAL OPERATING OUTFLOWS</td>
            <td class="text-right font-bold text-danger" style="font-size: 12px; padding-top: 15px;">
              ${formatCurrency(data.totalExpenses + data.stockLoss)}
            </td>
          </tr>
        </tbody>
      </table>
      ${renderFooter()}
      </body></html>
    `;
  },

  generateLedgerTemplate: (data, title, entityName, period, shopName) => {
    return `
      <!DOCTYPE html><html><head><style>${getBaseStyle()}</style></head><body>
      ${renderHeader(`${title} <br/> <span style="font-size: 20px; color: #1a237e;">${entityName}</span>`, period, shopName)}
      
      <div class="summary-box" style="justify-content: flex-start;">
        <div class="summary-card" style="flex: none; width: 220px;">
          <div class="summary-label">Opening Balance</div>
          <div class="summary-value">${formatCurrency(data.openingBalance)}</div>
        </div>
        <div class="summary-card ${data.closingBalance > 0 ? "danger" : "success"}" style="flex: none; width: 220px;">
          <div class="summary-label">Closing Balance</div>
          <div class="summary-value font-bold ${data.closingBalance > 0 ? "text-danger" : "text-success"}">
            ${formatCurrency(data.closingBalance)}
          </div>
        </div>
      </div>

      <div class="section-title">Transaction History</div>
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Date</th>
            <th style="width: 18%;">Voucher Type</th>
            <th style="width: 25%;">Ref / Particulars</th>
            <th class="text-right" style="width: 15%;">Debit (+)</th>
            <th class="text-right" style="width: 15%;">Credit (-)</th>
            <th class="text-right" style="width: 15%;">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #f8f9fa;">
            <td colspan="5" class="text-right font-bold">Opening Balance Brought Forward</td>
            <td class="text-right font-bold">${formatCurrency(data.openingBalance)}</td>
          </tr>
          ${data.transactions.length === 0 ? '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #999;">No transactions found for this period</td></tr>' : ""}
          ${data.transactions
            .map(
              (t) => `
            <tr>
              <td>${formatDate(t.date)}</td>
              <td>
                <span style="display: inline-block; background: #e3f2fd; color: #1a237e; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;">
                  ${t.record_type}
                </span>
              </td>
              <td>
                <div class="font-bold">${t.reference_no}</div>
                ${t.note ? `<div style="font-size: 9px; color: #757575; margin-top: 3px;">${t.note}</div>` : ""}
              </td>
              <td class="text-right ${t.debit || t.inflow ? "font-bold text-success" : ""}">${t.debit || t.inflow ? formatCurrency(t.debit || t.inflow) : "-"}</td>
              <td class="text-right ${t.credit || t.outflow ? "font-bold text-danger" : ""}">${t.credit || t.outflow ? formatCurrency(t.credit || t.outflow) : "-"}</td>
              <td class="text-right font-bold">${formatCurrency(t.balance)}</td>
            </tr>
          `,
            )
            .join("")}
          <tr class="row-total">
            <td colspan="5" class="text-right font-bold" style="padding-top: 15px;">Closing Balance Carried Forward</td>
            <td class="text-right font-bold" style="padding-top: 15px; font-size: 13px;">${formatCurrency(data.closingBalance)}</td>
          </tr>
        </tbody>
      </table>
      ${renderFooter()}
      </body></html>
    `;
  },

  generateStockSummaryTemplate: (data, period, shopName) => {
    return `
      <!DOCTYPE html><html><head><style>${getBaseStyle()}</style></head><body>
      ${renderHeader("Stock Movement Summary", period, shopName)}
      
      <div class="section-title">Item-wise Stock Reconciliation</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Item Name</th>
            <th class="text-right">Opening Qty</th>
            <th class="text-right">Inward (+)</th>
            <th class="text-right">Outward (-)</th>
            <th class="text-right">Adjustments</th>
            <th class="text-right">Net Change</th>
            <th class="text-right">Closing Qty</th>
          </tr>
        </thead>
        <tbody>
          ${data.records.length === 0 ? '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #999;">No stock data found</td></tr>' : ""}
          ${data.records
            .map(
              (r) => `
            <tr>
              <td class="font-bold">${r.product_name}</td>
              <td class="text-right">${r.opening_qty}</td>
              <td class="text-right text-success font-bold">${r.purchased_qty || "-"}</td>
              <td class="text-right text-danger font-bold">${r.sold_qty || "-"}</td>
              <td class="text-right ${r.adjusted_qty !== 0 ? "font-bold" : ""}">${r.adjusted_qty || "-"}</td>
              <td class="text-right font-bold ${r.net_change > 0 ? "text-success" : r.net_change < 0 ? "text-danger" : ""}">
                ${r.net_change > 0 ? "+" : ""}${r.net_change}
              </td>
              <td class="text-right font-bold text-primary" style="font-size: 13px;">${r.closing_qty}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${renderFooter()}
      </body></html>
    `;
  },

  generateStockValuationTemplate: (data, shopName) => {
    return `
      <!DOCTYPE html><html><head><style>${getBaseStyle()}</style></head><body>
      ${renderHeader("Inventory Asset Valuation", null, shopName)}
      
      <div class="summary-box" style="justify-content: center; margin-top: 50px;">
        <div class="summary-card" style="text-align: center; max-width: 350px;">
          <div class="summary-label">Master Inventory Value</div>
          <div class="summary-value text-primary" style="font-size: 32px; margin-top: 10px;">${formatCurrency(data.masterValuation)}</div>
          <div class="report-meta" style="margin-top: 15px;">Calculated via Product Quantities × Avg Purchase Price</div>
        </div>
        
        <div class="summary-card" style="text-align: center; max-width: 350px;">
          <div class="summary-label">Batch-wise Asset Value</div>
          <div class="summary-value text-success" style="font-size: 32px; margin-top: 10px;">${formatCurrency(data.batchValuation)}</div>
          <div class="report-meta" style="margin-top: 15px;">Calculated via active Batch Quantities × Direct Batch Cost</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 40px; color: #757575; font-size: 12px; line-height: 1.6;">
        <strong>Note for Auditing:</strong><br/>
        Discrepancies between Master Value and Batch Value usually indicate items sold without active batch assignments<br/> 
        or stock adjustments performed on the master product without allocating to specific batches.
      </div>
      
      ${renderFooter()}
      </body></html>
    `;
  },

  // --- NEW AGING TEMPLATE WITH BILL-BY-BILL BREAKDOWN ---
  generateAgingTemplate: (data, type, shopName) => {
    const isReceivable = type === "receivables_aging";
    const title = isReceivable
      ? "Accounts Receivable (A/R) Aging"
      : "Accounts Payable (A/P) Aging";
    const accentColor = isReceivable ? "#2e7d32" : "#d32f2f"; // Green for AR, Red for AP

    return `
      <!DOCTYPE html><html><head><style>${getBaseStyle()}</style></head><body>
      ${renderHeader(title, null, shopName)}
      
      <div class="section-title" style="margin-top: 10px;">Detailed Outstanding Breakdown</div>
      
      ${data.length === 0 ? '<div class="text-center" style="padding: 30px; color: #999;">No outstanding balances found</div>' : ""}
      
      ${data
        .map(
          (row) => `
        <div style="margin-bottom: 25px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; page-break-inside: avoid;">
          
          <!-- Summary Header for the Entity -->
          <div style="background-color: #f8f9fa; padding: 12px 15px; border-bottom: 2px solid ${accentColor}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #1a237e;">${isReceivable ? row.customer_name : row.supplier_name}</div>
              <div style="font-size: 10px; color: #757575; margin-top: 3px;">${isReceivable ? row.customer_phone : row.supplier_phone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #757575; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Total Outstanding</div>
              <div style="font-size: 16px; font-weight: 800; color: ${accentColor};">${formatCurrency(row.total_outstanding)}</div>
            </div>
          </div>

          <!-- Aging Buckets -->
          <div style="display: flex; background: #fff; border-bottom: 1px solid #eee; padding: 10px 15px; gap: 15px;">
            <div style="flex: 1;"><div style="font-size: 9px; color: #999; margin-bottom: 2px;">0-30 Days</div><div class="font-bold">${formatCurrency(row.days_0_30)}</div></div>
            <div style="flex: 1;"><div style="font-size: 9px; color: #999; margin-bottom: 2px;">31-60 Days</div><div class="font-bold text-warning">${formatCurrency(row.days_31_60)}</div></div>
            <div style="flex: 1;"><div style="font-size: 9px; color: #999; margin-bottom: 2px;">61-90 Days</div><div class="font-bold" style="color: #e53935;">${formatCurrency(row.days_61_90)}</div></div>
            <div style="flex: 1;"><div style="font-size: 9px; color: #999; margin-bottom: 2px;">> 90 Days</div><div class="font-bold text-danger">${formatCurrency(row.days_90_plus)}</div></div>
          </div>

          <!-- Nested Bill by Bill Table -->
          ${
            row.bills && row.bills.length > 0
              ? `
            <table style="margin-top: 0; font-size: 10px;">
              <thead>
                <tr>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;">Date</th>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;">Invoice / Ref No</th>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;">Age</th>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;" class="text-right">Invoice Total</th>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;" class="text-right">Paid</th>
                  <th style="background: #ffffff; padding: 8px 15px; border-bottom: 1px solid #eee; font-size: 9px;" class="text-right">Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                ${row.bills
                  .map(
                    (bill) => `
                  <tr>
                    <td style="padding: 6px 15px;">${formatDate(bill.date)}</td>
                    <td style="padding: 6px 15px; font-weight: 600;">${bill.reference_no || bill.internal_ref_no}</td>
                    <td style="padding: 6px 15px; color: ${bill.age_days > 30 ? "#d32f2f" : "#333"};">${bill.age_days} Days</td>
                    <td style="padding: 6px 15px;" class="text-right">${formatCurrency(bill.invoice_amount)}</td>
                    <td style="padding: 6px 15px; color: #757575;" class="text-right">${formatCurrency(bill.paid_amount)}</td>
                    <td style="padding: 6px 15px; font-weight: 700; color: #111;" class="text-right">${formatCurrency(bill.pending_amount)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : `<div style="padding: 10px 15px; color: #999; font-size: 10px;">No pending bills detail found.</div>`
          }
        </div>
      `,
        )
        .join("")}
      
      ${renderFooter()}
      </body></html>
    `;
  },
};
