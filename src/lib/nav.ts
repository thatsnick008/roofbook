import {
  Banknote,
  BellRing,
  Building2,
  Calculator,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
  mobile?: boolean;
}

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Portfolio overview",
    mobile: true
  },
  { href: "/properties", label: "Properties", icon: Building2, description: "Assets & purchase details", mobile: true },
  { href: "/calculator", label: "Calculator", icon: Calculator, description: "Purchase & holding cost estimates" },
  { href: "/finance", label: "Finance & Offset", icon: Banknote, description: "Loans, rates & interest" },
  { href: "/income", label: "Income", icon: Wallet, description: "Rent, arrears & vacancy", mobile: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, description: "Holding costs & deductions", mobile: true },
  { href: "/reminders", label: "Reminders", icon: BellRing, description: "Compliance & renewals" },
  { href: "/contacts", label: "Contacts", icon: Users, description: "Managers, insurers & trades" },
  { href: "/documents", label: "Documents", icon: FileText, description: "Evidence vault" },
  { href: "/reports", label: "Reports", icon: FileBarChart, description: "Excel, PDF & tax packs", mobile: true },
  { href: "/settings", label: "Settings", icon: Settings, description: "Backup, restore & theme" }
];
