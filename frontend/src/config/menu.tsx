import {
  LayoutDashboard,
  ScanBarcode,
  BarChart3,
  FileText,
  ChartCandlestick,
  FileClock,
  Truck,
  ClipboardList,
  Boxes,
  SquareStack,
  ArchiveRestore,
  ArchiveX,
  IndianRupee,
  BookA,
  User,
  UserSearch,
  Notebook,
  Users,
  ShieldCheck,
  Settings,
  Clock,
  Search,
  BookAlert,
  Clipboard,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";

export const menuSections = [
  {
    title: "Gateway",
    items: [
      {
        label: "Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/dashboard",
        shortcut: "F1",
      },
    ],
  },
  {
    title: "Sales Vouchers",
    items: [
      {
        label: "Sales Analysis",
        icon: <BarChart3 size={20} />,
        path: "/sales",
        shortcut: "F3",
      },
      {
        label: "Sales Voucher (POS)",
        icon: <ScanBarcode size={20} />,
        path: "/billing",
        shortcut: "F2",
      },
      {
        label: "Sales Register", // Professional term for Sales History
        icon: <Clock size={20} />,
        path: "/sales-history",
      },
      {
        label: "Generate Sales Order",
        icon: <Clipboard size={20} />,
        path: "/sales-order",
      },
      {
        label: "Sales Orders",
        icon: <ClipboardCheck size={20} />,
        path: "/sales-order-list",
      },
    ],
  },
  {
    title: "Purchase Vouchers",
    items: [
      {
        label: "Purchase Voucher",
        icon: <FileText size={20} />,
        path: "/purchase",
        shortcut: "F4",
      },
      {
        label: "Purchase Register", // Professional term for Purchase History
        icon: <FileClock size={20} />,
        path: "/purchase-history",
      },
      {
        label: "Purchase Analysis",
        icon: <ChartCandlestick size={20} />,
        path: "/purchase-dashboard",
      },
    ],
  },
  {
    title: "Inventory Books",
    items: [
      {
        label: "Stock Summary", // Tally term for Inventory Overview
        icon: <ClipboardList size={20} />,
        path: "/inventory",
        shortcut: "F6",
      },
      {
        label: "Stock Items", // Tally term for Products
        icon: <Boxes size={20} />,
        path: "/products",
        shortcut: "F7",
      },
      {
        label: "Stock Adjustments", // Kept as requested
        icon: <Boxes size={20} />,
        path: "/adjustments",
      },
      {
        label: "Stock Groups", // Tally term for Categories
        icon: <SquareStack size={20} />,
        path: "/categories",
      },
      {
        label: "Batch/Serial Tracker",
        icon: <Search size={20} />,
        path: "/tracker",
      },
      {
        label: "Stock Reorder",
        icon: <ArchiveRestore size={20} />,
        path: "/stock-restock",
      },
      {
        label: "Dead Stock Analysis",
        icon: <ArchiveX size={20} />,
        path: "/dead-stock",
      },
      {
        label: "Stock ABC Analysis",
        icon: <ChartCandlestick size={20} />,
        path: "/product-abc-page",
      },
    ],
  },
  {
    title: "Accounting Vouchers",
    items: [
      {
        label: "Payment / Receipt",
        icon: <IndianRupee size={20} />,
        path: "/transactions",
        shortcut: "F8",
      },
      {
        label: "Day Book", // Tally term
        icon: <BookA size={20} />,
        path: "/daybook",
        shortcut: "F9",
      },
      {
        label: "Journal / Expenses",
        icon: <FileText size={20} />,
        path: "/expenses",
      },
    ],
  },
  {
    title: "Party Ledgers",
    items: [
      {
        label: "Debtors (Customers)", // Professional ERP term
        icon: <User size={20} />,
        path: "/customers",
        shortcut: "F10",
      },
      {
        label: "Creditors (Suppliers)", // Professional ERP term
        icon: <Truck size={20} />,
        path: "/suppliers",
        shortcut: "F5",
      },
      {
        label: "Outstandings", // Professional term
        icon: <BookAlert size={20} />,
        path: "/customers/accounts",
      },
      {
        label: "Customer Intelligence",
        icon: <UserSearch size={20} />,
        path: "/customer-analytics",
      },
    ],
  },
  {
    title: "Statutory Reports",
    items: [
      { label: "GST Reports", icon: <Notebook size={20} />, path: "/gst" },
    ],
  },
  {
    title: "Company Info",
    items: [
      {
        label: "User Management",
        icon: <Users size={20} />,
        path: "/users",
      },
      {
        label: "Access Logs", // Kept as requested
        icon: <ShieldCheck size={20} />,
        path: "/access-logs",
      },
      {
        label: "Employees",
        icon: <UsersRound size={20} />,
        path: "/employees",
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        label: "Features (F11/F12)", // Tally reference
        icon: <Settings size={20} />,
        path: "/settings",
        shortcut: "F12",
      },
    ],
  },
];
