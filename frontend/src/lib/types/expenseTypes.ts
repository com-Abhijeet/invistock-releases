export interface Expense {
  id?: number;
  date: string; // Display format: DD/MM/YYYY
  category: string;
  amount: number;
  payment_mode: string;
  description?: string;
  created_at?: string;
}

export interface ExpenseStats {
  total: number;
  breakdown: { category: string; total: number }[];
  period: { from: string; to: string };
}

export const EXPENSE_CATEGORIES = [
  // --- Standard Operational ---
  "Rent",
  "Electricity Bill",
  "Water Bill",
  "Internet/Wi-Fi",
  "Telephone/Mobile Bill",
  "Cleaning & Housekeeping",
  "Security Services",
  "Waste Management",
  "Generator Fuel/Diesel",

  // --- HR & Staff ---
  "Salary",
  "Wages (Daily)",
  "Overtime Pay",
  "Staff Welfare / Team Lunch",
  "Festival Bonuses",
  "Intern Stipend",
  "Recruitment Fees",
  "Uniforms",
  "Training & Development",
  "Employee Advances",

  // --- Office & Admin ---
  "Tea & Refreshments",
  "Stationery",
  "Office Supplies",
  "Courier & Postage",
  "Printing & Xerox",
  "Furniture & Fixtures",
  "Office Decoration",
  "Repairs (General)",
  "Maintenance (Building)",

  // --- Technology ---
  "Software Subscription",
  "Cloud Server/Hosting",
  "Domain Renewal",
  "Hardware Purchases (Computers/Printers)",
  "Computer Repair/Service",
  "IT Support",

  // --- Marketing & Sales ---
  "Marketing & Ads",
  "Social Media Promotion",
  "Business Cards & Flyers",
  "Client Entertainment",
  "Gifts & Donations",
  "Events & Exhibitions",
  "Commission / Brokerage",

  // --- Travel & Vehicle ---
  "Transportation",
  "Vehicle Fuel",
  "Vehicle Maintenance",
  "Business Travel (Lodging/Food)",
  "Parking & Tolls",

  // --- Financial & Compliance ---
  "Chartered Accountant (CA) Fees",
  "Legal Fees",
  "Audit Fees",
  "Consultancy Charges",
  "Bank Charges",
  "Loan Interest",
  "Insurance (Business/Asset)",
  "Insurance (Health/Staff)",
  "Taxes (Property/Municipal)",
  "GST Payment",
  "TDS Payment",
  "Licenses & Permits",
  "Late Fees / Penalties",

  // --- Miscellaneous ---
  "AC Service & Repair",
  "Puja / Festival Expenses",
  "Miscellaneous",
  "Other",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
