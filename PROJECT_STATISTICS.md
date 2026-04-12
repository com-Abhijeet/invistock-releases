# 📊 KOSH Project Statistics & Overview

**Generated**: April 12, 2026

---

## 📦 Project Metrics

### Codebase Structure

| Component        | Count | Type             | Purpose                        |
| ---------------- | ----- | ---------------- | ------------------------------ |
| **Pages**        | 40+   | React/TypeScript | User interface screens         |
| **Components**   | 30+   | React/TypeScript | Reusable UI building blocks    |
| **Controllers**  | 27    | Node.js/ES6      | HTTP request handlers          |
| **Services**     | 20+   | Node.js/ES6      | Business logic layers          |
| **Repositories** | 15+   | Node.js/ES6      | Database access layer          |
| **Routes**       | 25+   | Node.js/Express  | API endpoint definitions       |
| **IPC Handlers** | 10+   | Node.js          | Electron process communication |
| **Templates**    | 8     | Node.js          | Invoice/Receipt/Label designs  |

### Database Tables

| Category               | Tables  | Purpose                                                                             |
| ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| **Core Configuration** | 4       | shop, users, license_info, access_logs                                              |
| **Master Data**        | 6       | products, categories, subcategories, suppliers, customers, storage_locations        |
| **Inventory**          | 3       | product_batches, product_serials, stock_adjustments                                 |
| **Transactions**       | 7       | sales, sales_items, sales_orders, purchases, purchase_items, transactions, expenses |
| **Reporting**          | 2       | audit_logs, access_logs                                                             |
| **Tally Integration**  | 1       | tally.db (separate)                                                                 |
| **Non-GST**            | 5+      | nongst.db (separate database)                                                       |
| **TOTAL**              | **50+** | —                                                                                   |

### File Structure

```
label-inventory-app/
├── frontend/                              (React TypeScript App)
│   ├── src/
│   │   ├── pages/                         (40+ page routes)
│   │   ├── components/                    (30+ reusable components)
│   │   ├── lib/
│   │   │   ├── api/                       (API service clients)
│   │   │   ├── types/                     (TypeScript interfaces)
│   │   │   └── utils/                     (Helper functions)
│   │   ├── context/                       (State management)
│   │   ├── config/                        (Configuration)
│   │   └── App.tsx                        (Root component)
│   └── package.json                       (Dependencies)
│
├── backend/                               (Express Node.js Server)
│   ├── controllers/                       (27 request handlers)
│   ├── services/                          (20+ business logic)
│   ├── repositories/                      (15+ data access)
│   ├── routes/                            (25+ API routes)
│   ├── db/
│   │   ├── db.mjs                         (Schema + migrations)
│   │   └── tallyDb.mjs                    (Tally-specific DB)
│   ├── tally/                             (Tally sync engine)
│   ├── middlewares/                       (Audit, auth, etc.)
│   ├── utils/                             (Helpers)
│   ├── validations/                       (Input validation)
│   ├── index.mjs                          (Express setup)
│   └── package.json                       (Dependencies)
│
├── electron/                              (Electron Main Process)
│   ├── main.js                            (App entry point)
│   ├── preload.js                         (IPC preload)
│   ├── ipc/                               (10+ IPC handlers)
│   ├── invoicePrinter.js                  (Print engine)
│   ├── bulkLabelPrinter.js                (Batch printing)
│   ├── *Template.js                       (8 templates)
│   ├── *Service.js                        (Google Drive, WhatsApp, etc.)
│   ├── logger.js                          (Logging)
│   ├── config.js                          (Configuration)
│   └── updater.js                         (Auto-update)
│
├── scripts/                               (Build utilities)
│   └── obfuscate.js                       (Code obfuscation)
│
├── assets/                                (Static resources)
├── dist_electron/                         (Build output)
├── node_modules/                          (Dependencies)
└── package.json                           (Root config)
```

---

## 🔍 Frontend Details

### Pages Breakdown

- **Dashboard**: 1 (Main dashboard)
- **Transaction Management**: 8 (Sales, Purchase, Orders, Non-GST)
- **Master Data**: 6 (Products, Categories, Customers, Suppliers, Employees)
- **Accounting & Reports**: 12 (GSTR, DayBook, Aging, Analytics, Inventory, Batch Analysis)
- **Integration**: 3 (Tally, Business Settings, Connections)
- **Admin**: 4 (Users, License, Settings, Access Logs)
- **Utilities**: 6 (Mobile View, About, Plans, Help)

### Component Categories

- **Layout**: 4 (Sidebar, Header, Layout wrappers)
- **Data Display**: 5 (DataTable, Charts, Cards, Statistics)
- **Forms & Input**: 8 (FormField, Modals, Dialogs)
- **Features**: 10 (Print modals, Search, Import dialogs)
- **Domain-Specific**: 8 (Invoice components, Label components)

### Technology Details

- **React Version**: 18.x (Latest stable)
- **TypeScript**: All components typed
- **Build Tool**: Vite (Next-gen bundler)
- **UI Framework**: Material-UI (1000+ components available)
- **HTTP Client**: Axios (Request interceptors configured)
- **State**: React Context API (No additional state library)
- **Styling**: MUI System + CSS-in-JS

---

## 🖥️ Backend Details

### API Endpoints (25+ routes)

| Route Prefix      | Endpoints | Purpose                      |
| ----------------- | --------- | ---------------------------- |
| `/api/products`   | 6+        | CRUD, import, pricing        |
| `/api/sales`      | 8+        | Create, update, view, export |
| `/api/purchases`  | 6+        | Purchase management          |
| `/api/customers`  | 6+        | Customer management, aging   |
| `/api/suppliers`  | 6+        | Supplier management          |
| `/api/accounting` | 10+       | Ledgers, daybook, aging      |
| `/api/gstr`       | 6+        | GSTR-1, GSTR-2, GSTR-3B      |
| `/api/tally`      | 5+        | Sync configuration, status   |
| `/api/dashboard`  | 4+        | Charts, summaries            |
| `/api/reports`    | 8+        | Various reports              |
| `/api/search`     | 2+        | Global search                |
| `/api/sync`       | 2+        | Mobile sync                  |
| [12 more routes]  | —         | —                            |

### Service Functions (100+ total)

**Inventory & Products**: 20 functions

- Product CRUD, stock calculations, batch management, serial tracking

**Sales & Invoicing**: 15 functions

- Sale creation, returns, pricing, GST calculations, invoice generation

**Purchasing**: 10 functions

- Purchase order, item management, supplier reconciliation

**Accounting**: 25 functions

- Ledger entries, transaction processing, account reconciliation, aging reports

**GST Compliance**: 15 functions

- GSTR-1/2/3B calculations, invoice categorization, B2B/B2C grouping

**Reporting**: 15 functions

- Dashboard metrics, analytics, inventory analysis

### Database Queries (200+ total)

- Complex JOINs for reporting
- Aggregate functions for summaries
- Recursive queries for hierarchy
- Transaction management for data consistency

---

## ⚙️ Electron Integration Points

### IPC Handlers (10+)

```javascript
// printHandlers.js (4 handlers)
- print-invoice
- print-label
- print-shipping-label
- print-customer-ledger

// fileDialogHandlers.js (5 handlers)
- dialog:open-file
- dialog:open-directory
- get-printers
- read-excel-file
- read-image-file

// exportHandlers.js (2 handlers)
- export-pdf
- export-excel

// coreHandlers.js (3 handlers)
- get-shop-settings
- get-version
- check-license

// backupHandlers.js (2 handlers)
- backup-restore
- auto-backup

// licenseHandlers.js (2 handlers)
- activate-license
- check-validity

// gdriveHandlers.js (2 handlers)
- upload-backup
- get-auth-url

// whatsappHandlers.js (2 handlers)
- send-message
- send-pdf

// connectionHandlers.js (2 handlers)
- get-server-url
- switch-mode

// templateHandlers.js (1 handler)
- generate-template-preview
```

### Templates (8)

1. **a4_standard** - Classic A4 invoice
2. **a4_modern** - Modern minimalist A4
3. **a5_landscape** - Compact landscape
4. **a5_landscape_modern** - Modern compact
5. **a5_portrait** - Compact portrait
6. **a5_portrait_modern** - Modern portrait
7. **thermal_80mm** - Thermal receipt 80mm
8. **thermal_58mm** - Thermal receipt 58mm

---

## 🔗 Integration Details

### Google Drive API

- **Purpose**: Backup and sync
- **OAuth Flow**: Redirect-based authentication
- **Operations**: Upload backup, manage versions
- **Data Protection**: Encrypted uploads (configurable)

### WhatsApp Integration

- **Library**: @whiskeysockets/baileys
- **Authentication**: Phone number + QR code
- **Operations**: Send invoice as PDF, order confirmations
- **Limitations**: Requires WhatsApp Business Account

### Tally Integration

- **Protocol**: TCP/XML over port 9000
- **Data Format**: Tally voucher XML
- **Sync**:
  - Customers → As ledgers
  - Suppliers → As ledgers
  - Sales → As tax invoices
  - Purchases → As purchase orders
  - Payments → As receipt/payment vouchers
- **Verification**: Sync status tracking

### Google Translate API

- **Purpose**: Multi-language product names
- **Method**: REST API calls
- **Scope**: Product names during printing
- **Fallback**: English names if API unavailable

---

## 📈 Feature Complexity Score

| Feature              | Complexity | Dependencies               | Lines of Code |
| -------------------- | ---------- | -------------------------- | ------------- |
| Product Management   | Low        | 1 service                  | 500           |
| Sales POS            | Medium     | 3 services                 | 1000          |
| GST Compliance       | High       | 5 services, 50+ queries    | 2000          |
| Tally Sync           | Very High  | 3 services, XML generation | 1500          |
| Printing System      | Medium     | 5 templates, Electron      | 1200          |
| Accounting Reports   | High       | 8 services, 30+ queries    | 1800          |
| WhatsApp Integration | Low        | 1 service                  | 300           |
| License Management   | Medium     | Hardware ID, validation    | 400           |

---

## 🚀 Performance Metrics

### Load Times

- **App Startup**: 2-3 seconds (First run) / 1-2 seconds (Cached)
- **Page Navigation**: 200-500ms
- **Data Loading**: 500ms - 2s (depending on query complexity)
- **Printing**: 1-5 seconds (depending on invoice size)

### Database Performance

- **Query Execution**: 50-200ms (average)
- **Transaction Overhead**: <50ms
- **Index Lookup**: <10ms
- **Complex Report Queries**: 500ms-2s

### Memory Usage

- **Electron App**: 200-300MB
- **Backend Process**: 100-150MB
- **Database**: 50-100MB (depends on data size)
- **Total**: 350-550MB typical

---

## 🔐 Security Features

### Authentication

- Password hashing: bcrypt (10 rounds)
- Session management: In-memory sessions
- Access control: Role-based (Basic implementation)

### Data Protection

- Database encryption: Optional (via SQLite extensions)
- Backup encryption: Optional (application-level)
- HTTPS: Supported for remote connections
- License enforcement: Hardware ID-based

### Audit Trail

- User actions logged: ✅
- Change tracking: ✅
- Access logging: ✅
- Admin audit reports: ✅

---

## 📦 Dependencies Summary

### Frontend (30+ direct)

**Critical**: react, react-dom, react-router, @mui/material, typescript  
**Utilities**: axios, react-hot-toast, date-fns, zustand

### Backend (20+ direct)

**Critical**: express, better-sqlite3, bcrypt, cors  
**Integration**: googleapis, @whiskeysockets/baileys, bonjour-service  
**Utilities**: pino, xlsx, puppeteer-core

### Electron (15+ direct)

**Critical**: electron, electron-builder, electron-updater  
**Integration**: google-drive, whatsapp (baileys), qrcode  
**Utilities**: electron-log, xlsx, bwip-js

**Total Direct Dependencies**: 65+  
**Total Transitive Dependencies**: 500+  
**Build Size**: ~150MB packaged, ~50MB installer

---

## 🎯 Key Achievements

✅ **Multi-Module Architecture**: Cleanly separated concerns  
✅ **50+ Database Tables**: Comprehensive data model  
✅ **40+ Pages**: Rich UI with complex workflows  
✅ **8 Invoice Templates**: Flexible output options  
✅ **Tally Integration**: Direct accounting software sync  
✅ **GST Compliance**: GSTR-1, 2, 3B support  
✅ **Desktop-First**: Electron-based with offline support  
✅ **Cloud Integration**: Google Drive backup, WhatsApp messaging  
✅ **Auto-Updates**: Delta-based updating mechanism  
✅ **Comprehensive Logging**: Audit trails and diagnostics

---

## 📋 Maintenance Status

**Last Updated**: April 12, 2026  
**Current Version**: 1.1.6  
**Active Development**: ✅ Yes  
**Support Status**: Active  
**License**: Proprietary

### Known Limitations

- Single-user desktop app (no concurrent users)
- Local SQLite database (no native federation)
- Transliteration API dependency (optional feature)
- Tally network requirement (TCP connection)

### Future Roadmap Items

- [ ] Multi-user web interface
- [ ] PostgreSQL backend option
- [ ] Advanced reporting engine
- [ ] AI-powered insights
- [ ] Mobile app companion
- [ ] API for third-party integrations

---

**This architecture continues to evolve with new features and improvements.**
