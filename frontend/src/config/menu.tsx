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
} from "lucide-react";

export const menuSections = [
  {
    title: "Analytics & Reports",
    items: [
      {
        label: "Business Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/dashboard",
        shortcut: "F1",
      },
    ],
  },
  {
    title: "Sales & Billing",
    items: [
      {
        label: "Point of Sale",
        icon: <ScanBarcode size={20} />,
        path: "/billing",
        shortcut: "F2",
      },
      {
        label: "Sales Analytics",
        icon: <BarChart3 size={20} />,
        path: "/sales",
        shortcut: "F3",
      },
      {
        label: "Sales History",
        icon: <Clock size={20} />,
        path: "/sales-history",
      },
    ],
  },
  {
    title: "Purchasing & Vendors",
    items: [
      {
        label: "Purchase Orders",
        icon: <FileText size={20} />,
        path: "/purchase",
        shortcut: "F4",
      },
      {
        label: "Purchase Analytics",
        icon: <ChartCandlestick size={20} />,
        path: "/purchase-dashboard",
      },
      {
        label: "Purchase History",
        icon: <FileClock size={20} />,
        path: "/purchase-history",
      },
      {
        label: "Suppliers",
        icon: <Truck size={20} />,
        path: "/suppliers",
        shortcut: "F5",
      },
    ],
  },
  {
    title: "Inventory & Products",
    items: [
      {
        label: "Inventory Overview",
        icon: <ClipboardList size={20} />,
        path: "/inventory",
        shortcut: "F6",
      },
      {
        label: "Product Catalog",
        icon: <Boxes size={20} />,
        path: "/products",
        shortcut: "F7",
      },
      {
        label: "Track SN/Batch",
        icon: <Search size={20} />,
        path: "/tracker",
      },
      {
        label: "Stock Adjustments",
        icon: <Boxes size={20} />,
        path: "/adjustments",
      },
      {
        label: "Categories",
        icon: <SquareStack size={20} />,
        path: "/categories",
      },
      {
        label: "Restock Suggestions",
        icon: <ArchiveRestore size={20} />,
        path: "/stock-restock",
      },
      {
        label: "Dead Stock ",
        icon: <ArchiveX size={20} />,
        path: "/dead-stock",
      },
      {
        label: "Product ABC Analysis ",
        icon: <ChartCandlestick size={20} />,
        path: "/product-abc-page",
      },
    ],
  },
  {
    title: "Payments & Transactions",
    items: [
      {
        label: "Payments",
        icon: <IndianRupee size={20} />,
        path: "/transactions",
        shortcut: "F8",
      },

      { label: "Expenses", icon: <FileText size={20} />, path: "/expenses" },
      {
        label: "DayBook",
        icon: <BookA size={20} />,
        path: "/daybook",
        shortcut: "F9",
      },
    ],
  },
  {
    title: "CRM & Customers",
    items: [
      {
        label: "Customer Directory",
        icon: <User size={20} />,
        path: "/customers",
        shortcut: "F10",
      },
      {
        label: "Customer Analytics",
        icon: <UserSearch size={20} />,
        path: "/customer-analytics",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "GST Reports", icon: <Notebook size={20} />, path: "/gst" },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "User Management",
        icon: <Users size={20} />,
        path: "/users",
      },
      {
        label: "Access Logs",
        icon: <ShieldCheck size={20} />,
        path: "/access-logs",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Preferences",
        icon: <Settings size={20} />,
        path: "/settings",
        shortcut: "F12",
      },
    ],
  },
];
