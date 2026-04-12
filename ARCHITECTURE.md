# 🏗️ KOSH Application Architecture

**Version**: 1.1.6  
**Build Type**: Electron Desktop App  
**Date**: April 12, 2026

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Layer Architecture](#layer-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Model](#data-model)
5. [Module Organization](#module-organization)
6. [Communication Patterns](#communication-patterns)
7. [Key Features](#key-features)
8. [Integration Points](#integration-points)
9. [Deployment](#deployment)

---

## 🎯 System Overview

**KOSH** is a desktop-based inventory management and accounting system built with Electron, React, and Node.js. It's designed for Indian businesses with specific focus on GST compliance, Tally integration, and multi-store management.

### Core Characteristics

- **Desktop-First**: Electron-based Windows application
- **Offline-Capable**: Local SQLite database with optional cloud sync
- **Multi-Tier Architecture**: Frontend (React) → Backend (Express) → Database (SQLite)
- **IPC Communication**: Electron IPC for system-level operations
- **Modular Design**: Clear separation of concerns across layers

### Key Statistics

- **40+ Pages**: Main UI pages (Dashboard, Sales, Purchase, Accounting, etc.)
- **30+ Controllers**: Backend request handlers
- **20+ Services**: Business logic modules
- **15+ Repositories**: Data access layer
- **50+ Database Tables**: Comprehensive data model
- **10+ IPC Handlers**: System integration points

---

## 🏢 Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  React Components + Material-UI + TypeScript                │
│  (40+ Pages, 30+ Component Types, Context State Management) │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP (Axios)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│         Express.js REST API Server (Port 5000)              │
│  Controllers → Services → Repositories                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SQL
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  SQLite3 Database (better-sqlite3)                          │
│  - main.db (Primary)                                        │
│  - tally.db (Tally Sync)                                    │
│  - nongst.db (Non-GST Sales)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ELECTRON LAYER (Parallel)                  │
│  Main Process + IPC Communication                           │
│  - Print Handling                                           │
│  - File I/O                                                 │
│  - Google Drive Sync                                        │
│  - WhatsApp Integration                                     │
│  - License Management                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (Fast development + production builds)
- **UI Library**: Material-UI (MUI v5+)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Forms**: React Hook Form (implicit through components)

### Runtime

- **Desktop Framework**: Electron 37.x
- \*\*Runtime": Node.js 18+ (bundled with Electron)
- **IPC**: Built-in Electron IPC for main/renderer process communication

### Backend

- **Framework**: Express.js
- **Database**: SQLite 3 (better-sqlite3 driver)
- **ORM**: None (Direct SQL queries)
- **Authentication**: bcrypt for password hashing
- **Middleware**: CORS, Custom audit logging

### Critical Libraries

| Library                   | Purpose                  | Version    |
| ------------------------- | ------------------------ | ---------- |
| `bwip-js`                 | Barcode generation (SVG) | 4.7.0      |
| `qrcode`                  | QR code generation       | Latest     |
| `xlsx`                    | Excel file export        | Latest     |
| `puppeteer-core`          | PDF rendering            | 24.34.0    |
| `electron-updater`        | Auto-update mechanism    | 6.6.2      |
| `electron-log`            | Application logging      | 5.4.3      |
| `@whiskeysockets/baileys` | WhatsApp integration     | 7.0.0-rc.9 |
| `googleapis`              | Google Drive API         | 166.0.0    |
| `bonjour-service`         | Local network discovery  | 1.3.0      |

---

## 📊 Data Model

### Core Entity Groups

#### 1. **CORE CONFIGURATION**

```
- shop (1)          → Central configuration
- users (N)         → User accounts & login
- license_info (1)  → License activation
- access_logs (N)   → User activity tracking
```

#### 2. **MASTER DATA**

```
- products (N)              → Product catalog
- categories (N)            → Product categories
- subcategories (N)         → Product subcategories
- suppliers (N)             → Vendor information
- customers (N)             → Customer information
- storage_locations (N)     → Warehouse locations
- employees (N)             → Staff members
- employee_sales (N)        → Sale attribution
```

#### 3. **INVENTORY MANAGEMENT**

```
- product_batches (N)       → Batch tracking (expiry, cost)
- product_serials (N)       → Serial number tracking
- stock_adjustments (N)     → Inventory corrections
```

#### 4. **TRANSACTIONAL DATA**

```
- sales (N)                 → Sales invoices
- sales_items (N)           → Line items per sale
- sales_orders (N)          → Draft sales
- purchases (N)             → Purchase orders
- purchase_items (N)        → Line items per purchase
- transactions (N)          → Payments & receipts
- expenses (N)              → Expense records
```

#### 5. **REPORTING & AUDIT**

```
- audit_logs (N)            → Change tracking
- access_logs (N)           → Login tracking
```

### Relationships

- **Product** → Category, Subcategory, Storage Location, Batches, Serials
- **Sale** → Customer, Sales Items, Transactions, Employees, Batches, Serials
- **Purchase** → Supplier, Purchase Items, Batches
- **Transaction** → Sale, Purchase, Customer, Supplier

---

## 🏛️ Backend Module Organization

### **Routes** → **Controllers** → **Services** → **Repositories** → **Database**

#### Routes Layer (Express)

```
productRoutes          → /api/products/*
salesRoutes            → /api/sales/*
purchaseRoutes         → /api/purchases/*
customerRoutes         → /api/customers/*
supplierRoutes         → /api/suppliers/*
accountingRoutes       → /api/accounting/*
gstrRoutes             → /api/gstr/*
tallyRoutes            → /api/tally/*
dashboardRoutes        → /api/dashboard/*
[11 more routes]
```

#### Controllers Layer

- Handle HTTP requests/responses
- Input validation
- Call appropriate service methods
- Examples: `salesController.mjs`, `productController.mjs`

#### Services Layer

- **Business Logic**: Calculations, validations, transformations
- **Orchestration**: Coordinate multiple repositories
- **Pure Functions**: Stateless, testable
- Examples:
  - `salesService.mjs` - Invoice creation, returns processing
  - `accountingService.mjs` - Ledger calculations, aging reports
  - `gstrService.mjs` - GST compliance calculations
  - `tallyService.mjs` - Tally integration, XML generation

#### Repositories Layer

- **Data Access**: Direct SQLite queries
- **Query Abstraction**: Complex joins, filtering
- **Transaction Management**: Database transactions
- Examples:
  - `salesRepository.mjs` - Sale queries with customer joins
  - `accountingRepository.mjs` - Ledger views, aging reports
  - `productRepository.mjs` - Product queries with stock

---

## 🎨 Frontend Architecture

### **Pages → Components → API Services → HTTP Client**

#### Pages (40+)

Each page represents a main feature/view:

- **Dashboard Pages**: Dashboard, Sales Dashboard, Purchase Dashboard, Inventory Dashboard
- **Transaction Pages**: SalesPos, PurchasePage, NGSalesPage, SalesOrderPage
- **Master Pages**: Products, Categories, Customers, Suppliers, Employees
- **Accounting Pages**: TransactionsPage, DayBookPage, GstrReportPage, AccountingDashboard
- **Report Pages**: InventoryDashboardPage, BatchAnalysisPage, ExpensePage, etc.
- **Setup Pages**: Setting, BusinessSettingsPage, TallyDashboard, LicensePage

#### Components (30+ types)

- **Layout**: SidebarLayout, NonGstLayout, TitleBar, Topbar
- **Tables**: DataTable (reusable, with sorting/filtering)
- **Forms**: FormField, Form components for each entity type
- **Modals**: ConfirmModal, BulkLabelPrintModal, CustomLabelPrintModal
- **Features**: GlobalSearch, KeyboardShortcutModal, UpdateManager
- **Domain**: Invoice components, Label components, GSTR components

#### API Services

- `productService.ts` - Product CRUD and import
- `salesService.ts` - Sale creation, viewing, export
- `customerService.ts` - Customer management
- `accountingService.ts` - Accounting reports (aging, daybook)
- `reportService.ts` - Report generation
- `tallyService.ts` - Tally integration

#### HTTP Client

```typescript
// Configured Axios instance with:
// - Base URL (localhost:5000 or remote server)
// - Authorization headers
// - Error handling
// - Request/response interception
```

---

## 📞 Communication Patterns

### 1. **HTTP/REST (Frontend ↔ Backend)**

```
Frontend (React)
    ↓ (Axios HTTP Request)
Express Server (Port 5000)
    ↓ (Route → Controller → Service)
SQLite Database
    ↓ (Data)
Express Server
    ↓ (JSON Response)
Frontend (React)
    ↓ (setState, re-render)
User UI updated
```

### 2. **IPC (Frontend ↔ Main Process)**

```
Frontend (React)
    ↓ (ipcRenderer.invoke/send)
Main Process (Electron)
    ↓ (ipcMain.handle)
System Services (Print, File I/O, etc.)
    ↓ (ipcMain.send)
Frontend (React)
    ↓ (ipcRenderer.on)
User notification
```

### 3. **File I/O (Electron → Filesystem)**

```
Frontend: User action (Print, Export)
    → IPC Handler (printHandlers.js, exportHandlers.js)
    → Print Engine / File Writer
    → Physical printer / Local file system
    → Notification to user
```

### 4. **External APIs**

```
Backend
    ↓ (HTTPS)
Google Drive API (Backup/Sync)
Google Translate API (Multi-language)
Tally TCP Connection (Data Sync)
Bonjour Service (Local Discovery)
Electron
    ↓
WhatsApp Baileys (Message Sending)
```

---

## 🔧 Key Features Architecture

### **1. Printing System**

**Files**: `invoicePrinter.js`, `labelTemplate.js`, `shippingLabelPrinter.js`

**Flow**:

1. User clicks "Print" on invoice
2. Frontend calls IPC handler
3. Backend fetches sale data
4. Electron generates HTML template
5. BrowserWindow renders HTML
6. Chromium's print API sends to printer
7. Notification returned to UI

**Supported Outputs**:

- Thermal receipts (80mm, 58mm)
- A4 invoices (multiple designs)
- A5 labels
- Shipping labels
- Ledger printouts

### **2. GST Compliance (GSTR)**

**Files**: `gstrController.mjs`, `gstr1Repository.mjs`, `gstr2Repository.mjs`

**Reports Generated**:

- **GSTR-1**: Outward supplies (Sales)
- **GSTR-2**: Inward supplies (Purchases)
- **GSTR-3B**: Summary of tax liability

**Data Processing**:

1. Fetch sales/purchases within GST period
2. Categorize by interstate/intrastate/exempt
3. Group by GSTIN
4. Calculate tax components
5. Format as per GST JSON schema

### **3. Tally Integration**

**Files**: `tallyService.mjs`, `tallyRoutes.mjs`, `tallySyncEngine.mjs`

**Sync Mechanism**:

1. **Scan Phase**: Detect changes in KOSH database
2. **XML Generation**: Convert to Tally XML vouchers
3. **TCP Push**: Send to Tally on port 9000
4. **Verification**: Confirm sync completion
5. **Queue Management**: Track successes/failures

**Supported Entities**:

- Customers (Ledgers)
- Suppliers (Ledgers)
- Sales (Invoices)
- Purchases (Invoices)
- Payments/Receipts
- Expenses

### **4. Backup & Sync**

**Files**: `googleDriveService.js`, `backupHandlers.js`

**Mechanism**:

- Automatic backup to Google Drive
- Manual backup/restore options
- Backup versioning
- Cloud sync for multi-location access
- Encryption support

### **5. License Management**

**Files**: `licenseService.mjs`, `licenseHandlers.js`

**Validation**:

1. Hardware ID generation (machine identifier)
2. Online activation via KOSH server
3. Offline fallback mode
4. License expiry checking
5. Multiple store support

### **6. WhatsApp Integration**

**Files**: `whatsappService.js`, `whatsappHandlers.js`

**Capabilities**:

- Message sending via WhatsApp Business API (Baileys)
- PDF invoice attachment
- Customer notification
- Order confirmation messages

---

## 🔌 Integration Points

### External Services

| Service              | Purpose                 | Authentication  | Data Flow                   |
| -------------------- | ----------------------- | --------------- | --------------------------- |
| **Google Drive**     | Backup, Sync            | OAuth 2.0       | Backend ↔ GDrive            |
| **Google Translate** | Multi-language          | API Key         | Electron → Translate        |
| **Tally Prime**      | Accounting sync         | TCP Connection  | Backend ↔ Tally (Port 9000) |
| **WhatsApp**         | Message sending         | Phone + Session | Electron via Baileys        |
| **Bonjour**          | Local network discovery | mDNS            | Network broadcast           |

### Hardware Integration

| Device              | Purpose              | Method             |
| ------------------- | -------------------- | ------------------ |
| **Printers**        | Document output      | System print queue |
| **Barcode Scanner** | Product entry        | Keyboard emulation |
| **Storage**         | Database persistence | Local filesystem   |

---

## 📦 Deployment Architecture

### Build Process

```
source code
    ↓
Frontend Build (npm run build:frontend)
    ↓ npm run build (Vite)
    ↓ dist/ folder created
    ↓
Backend (No build needed, direct Node.js)
    ↓
Electron Build (npm run build:electron)
    ↓ electron-builder
    ↓ NSIS Windows installer generated
    ↓ KoshInventory-Setup-1.1.6.exe
    ↓
GitHub Release
    ↓
Auto-updater (delta updates)
```

### Application Structure (Post-Deployment)

```
C:\Program Files\KOSH\
├── resources/
│   ├── app/
│   │   ├── frontend/ (React build)
│   │   ├── backend/ (Node modules + code)
│   │   ├── electron/ (Electron code)
│   │   └── package.json
│   └── buildResources/
└── KOSH.exe (Electron app)

User Data:
C:\Users\[user]\AppData\Local\KOSH\
├── main.db (Primary database)
├── tally.db (Tally sync)
├── images/
│   ├── logo/
│   └── products/
├── backup/ (Local backups)
└── logs/ (Application logs)
```

### Update Mechanism

- **Delta Updates**: Only changed files downloaded
- **Automatic Check**: On app startup
- **User Notification**: Prompt to install
- **Zero-Downtime**: Install on exit, apply on restart

---

## 🔐 Security Architecture

### Authentication

```
Login Form
    ↓ (Username + Password)
Backend: authMiddleware.mjs
    ↓
Verify credentials (bcrypt)
    ↓
Session/Token generation
    ↓
Store in secure context
```

### Data Protection

- **Database**: Local SQLite (file-based encryption possible)
- **Passwords**: bcrypt hashing (rounds: 10)
- **API Communication**: HTTPS (when over network)
- **Backup**: Optional encryption

### Access Control

- **Role-Based**: User roles/permissions (logged in access_logs)
- **Audit Trail**: All changes logged with user + timestamp
- **License Validation**: Hardware-based licensing

---

## 📊 Performance Considerations

### Frontend

- **Lazy Loading**: Pages loaded on demand
- **Code Splitting**: Vite handles automatic splitting
- **Component Memoization**: Prevent unnecessary re-renders
- **Virtual Scrolling**: DataTable handles large datasets

### Backend

- **Connection Pooling**: SQLite in-process (no connection overhead)
- **Query Optimization**: Prepared statements, proper indexing
- **Caching**: Potential for Redis (currently in-memory only)
- **Async Operations**: Express async/await for I/O

### Electron

- **Hidden Windows**: Printing windows are hidden for speed
- **Asset Caching**: Logos, templates cached where possible
- **Memory Management**: Window cleanup after operations

---

## 📈 Scalability Patterns

### Current Limitations

- **Single SQLite Database**: Per-store database (not federated)
- **No Replication**: Real-time sync requires manual implementation
- **Local Storage**: Growth limited by disk space
- **User Concurrency**: Desktop app (single user per instance)

### Future Scalability

- Migration path to PostgreSQL
- Multi-store federation via sync APIs
- Cloud backend services
- Web app version for multi-user access

---

## 🚀 Development Workflow

### Local Development

```bash
npm run dev
# Runs:
# - Frontend: Vite dev server (localhost:5173)
# - Backend: Express server (localhost:5000)
# - Electron: Main process connecting to frontend
```

### Build & Package

```bash
npm run build
# Generates:
# - Frontend optimized build
# - Electron packaged app (dist_electron/)
# - Windows installer (KoshInventory-Setup-X.X.X.exe)
```

### Obfuscation

```bash
npm run buildWithObfuscate
# Includes JavaScript obfuscation for production
```

---

## 📝 Summary

**KOSH** is a comprehensive desktop application following modern architectural patterns:

✅ **Clean Separation**: Frontend, Backend, Database well-isolated  
✅ **Modular Design**: Each module has single responsibility  
✅ **Scalable Structure**: Easy to add new features  
✅ **Offline-First**: Works without internet  
✅ **Integration Ready**: Multiple external service integrations  
✅ **Production Ready**: Auto-updates, licensing, backups  
✅ **Developer Friendly**: TypeScript, clear file structure, logging

---

**Last Updated**: April 12, 2026  
**Architect**: Abhijeet Shinde  
**Repository**: https://github.com/com-Abhijeet/invistock-releases
