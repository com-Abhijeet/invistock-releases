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
} from "lucide-react";

export const menuSections = [
  {
    title: "Analytics & Reports",
    items: [
      {
        label: "Business Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/dashboard",
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
      },
      {
        label: "Sales Analytics",
        icon: <BarChart3 size={20} />,
        path: "/sales",
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
      },
      {
        label: "Product Catalog",
        icon: <Boxes size={20} />,
        path: "/products",
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
      },

      { label: "Expenses", icon: <FileText size={20} />, path: "/expenses" },
      {
        label: "DayBook",
        icon: <BookA size={20} />,
        path: "/daybook",
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
      { label: "Preferences", icon: <Settings size={20} />, path: "/settings" },
    ],
  },
];
