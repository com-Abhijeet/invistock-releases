import React from "react";
import {
  LayoutDashboard,
  BadgePercent,
  ReceiptText,
  FileText,
  Boxes,
  Store,
  Printer,
  SquareStack,
  IndianRupee,
  User,
  Notebook,
  Settings,
} from "lucide-react";

// Define a type for menu items
interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}
const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Analytics & Reports",
    items: [
      {
        label: "Business Dashboard",
        icon: <LayoutDashboard size={18} />,
        path: "/",
      },
    ],
  },
  {
    title: "Sales & Billing",
    items: [
      {
        label: "Point of Sale",
        icon: <BadgePercent size={18} />,
        path: "/billing",
      },
      {
        label: "Sales Analytics",
        icon: <ReceiptText size={18} />,
        path: "/sales",
      },
    ],
  },
  {
    title: "Purchasing & Vendors",
    items: [
      {
        label: "Purchase Orders",
        icon: <FileText size={18} />,
        path: "/purchase",
      },
      {
        label: "Purchase Analytics",
        icon: <Boxes size={18} />,
        path: "/purchase-dashboard",
      },
      { label: "Suppliers", icon: <Store size={18} />, path: "/suppliers" },
    ],
  },
  {
    title: "Inventory & Products",
    items: [
      {
        label: "Inventory Overview",
        icon: <Printer size={18} />,
        path: "/inventory",
      },
      {
        label: "Product Catalog",
        icon: <Boxes size={18} />,
        path: "/products",
      },
      {
        label: "Categories",
        icon: <SquareStack size={18} />,
        path: "/categories",
      },
    ],
  },
  {
    title: "Payments & Transactions",
    items: [
      {
        label: "Payments Dashboard",
        icon: <IndianRupee size={18} />,
        path: "/transactions",
      },
    ],
  },
  {
    title: "CRM & Customers",
    items: [
      {
        label: "Customer Directory",
        icon: <User size={18} />,
        path: "/customers",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Gst",
        icon: <Notebook size={18} />,
        path: "/gst",
      },
    ],
  },
  {
    title: "System & Settings",
    items: [
      { label: "Preferences", icon: <Settings size={18} />, path: "/settings" },
    ],
  },
];

// --- 1. Flatten the menu data for easier mapping ---
// This creates a single array of all navigable items.
export const flattenedMenu = menuSections.flatMap((section) => section.items);
