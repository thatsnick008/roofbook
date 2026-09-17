import {
  Banknote,
  BellRing,
  Building2,
  Calculator,
  FileBarChart,
  FileText,
  LayoutDashboard,
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
  { href: "/", label: "Home", icon: LayoutDashboard, description: "Portfolio overview", mobile: true },
  { href: "/properties", label: "Properties", icon: Building2, description: "Assets & purchase details", mobile: true },
  { href: "/finance", label: "Finance & Offset", icon: Banknote, description: "Loans, rates & interest", mobile: true },
  { href: "/income", label: "Income & Expenses", icon: Wallet, description: "Rent, arrears, holding costs & deductions", mobile: true },
  { href: "/reminders", label: "Reminders", icon: BellRing, description: "Compliance & renewals", mobile: true },
  { href: "/contacts", label: "Contacts", icon: Users, description: "Managers, insurers & trades", mobile: true },
  { href: "/documents", label: "Documents", icon: FileText, description: "Evidence vault", mobile: true },
  { href: "/reports", label: "Reports", icon: FileBarChart, description: "Excel, PDF & tax packs", mobile: true },
  { href: "/calculator", label: "Calculator", icon: Calculator, description: "Purchase & holding cost estimates", mobile: true },
  { href: "/settings", label: "Settings", icon: Settings, description: "Backup, restore & theme", mobile: true }
];
