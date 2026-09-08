import type {
  ExpenseEntry,
  IncomeEntry,
  Loan,
  PortfolioTotals,
  Property,
  PropertyTaxTreatment,
  PurchaseDetails
} from "./types";

export const FY_START_MONTH = 7; // July (Australian financial year)

export function financialYearOf(dateIso: string, startMonth = FY_START_MONTH): number {
  const date = new Date(dateIso);
  const month = date.getMonth() + 1;
  return month >= startMonth ? date.getFullYear() + 1 : date.getFullYear();
}

export function financialYearLabel(fy: number): string {
  return `FY${String(fy - 1).slice(2)}/${String(fy).slice(2)}`;
}

export function financialYearRange(fy: number, startMonth = FY_START_MONTH): { start: string; end: string } {
  const start = new Date(Date.UTC(fy - 1, startMonth - 1, 1));
  const end = new Date(Date.UTC(fy, startMonth - 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function currentFinancialYear(startMonth = FY_START_MONTH): number {
  return financialYearOf(new Date().toISOString(), startMonth);
}

export function availableFinancialYears(
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  startMonth = FY_START_MONTH
): number[] {
  const years = new Set<number>([currentFinancialYear(startMonth)]);
  income.forEach((entry) => years.add(financialYearOf(entry.date, startMonth)));
  expenses.forEach((entry) => years.add(financialYearOf(entry.date, startMonth)));
  return [...years].sort((a, b) => b - a);
}

export function inFinancialYear(dateIso: string, fy: number, startMonth = FY_START_MONTH): boolean {
  return financialYearOf(dateIso, startMonth) === fy;
}

export function isRecognizedIncome(entry: IncomeEntry): boolean {
  return entry.category !== "rent" || entry.status === "received";
}

export function recognizedIncome(income: IncomeEntry[]): IncomeEntry[] {
  return income.filter(isRecognizedIncome);
}

/** Flat per-period rent derived from the property's annual estimate and billing frequency. */
export function rentAmountPerPeriod(property: Pick<Property, "annualRent" | "rentFrequency">): number {
  const divisor = property.rentFrequency === "weekly" ? 52 : property.rentFrequency === "fortnightly" ? 26 : 12;
  return Math.round((property.annualRent / divisor) * 100) / 100;
}

export function managementFeeFor(
  property: Pick<Property, "managementFeeType" | "managementFeeFixed" | "managementFeePercent">,
  amount: number
): number {
  if (property.managementFeeType === "fixed") {
    return Math.round((property.managementFeeFixed ?? 0) * 100) / 100;
  }
  return Math.round(amount * ((property.managementFeePercent ?? 0) / 100) * 100) / 100;
}

/** Splits a financial year into weekly/fortnightly/monthly billing periods for a rent schedule. */
export function rentPeriodsInFinancialYear(
  frequency: Property["rentFrequency"],
  fy: number,
  startMonth = FY_START_MONTH
): { start: string; end: string }[] {
  const { start, end } = financialYearRange(fy, startMonth);
  const fyEnd = new Date(`${end}T00:00:00.000Z`);
  const periods: { start: string; end: string }[] = [];
  let cursor = new Date(`${start}T00:00:00.000Z`);

  while (cursor <= fyEnd) {
    let periodEnd: Date;
    if (frequency === "monthly") {
      periodEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    } else if (frequency === "weekly") {
      periodEnd = new Date(cursor);
      periodEnd.setUTCDate(cursor.getUTCDate() + 6);
    } else {
      periodEnd = new Date(cursor);
      periodEnd.setUTCDate(cursor.getUTCDate() + 13);
    }
    if (periodEnd > fyEnd) periodEnd = fyEnd;
    periods.push({ start: toIsoDate(cursor), end: toIsoDate(periodEnd) });
    cursor = new Date(periodEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return periods;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function totalCapitalRequired(purchase?: PurchaseDetails, loan?: Loan): number {
  if (!purchase) return 0;
  const ancillaryCosts =
    purchase.stampDuty +
    purchase.legalFees +
    purchase.renovations +
    purchase.settlementFees +
    purchase.buildingAndPest +
    purchase.registrationFees +
    purchase.otherCosts;
  const financedAncillaryCosts = Math.min(
    Math.max((loan?.loanBalance ?? purchase.loanAfterLmi) - purchase.purchasePrice, 0),
    ancillaryCosts
  );

  return (
    purchase.deposit +
    ancillaryCosts -
    financedAncillaryCosts
  );
}

export function costBase(purchase?: PurchaseDetails): number {
  if (!purchase) return 0;
  return (
    purchase.purchasePrice +
    purchase.stampDuty +
    purchase.legalFees +
    purchase.settlementFees +
    purchase.buildingAndPest +
    purchase.registrationFees +
    purchase.renovations
  );
}

export function effectiveLoanBalance(loan?: Loan): number {
  if (!loan) return 0;
  return Math.max(loan.loanBalance - loan.offsetBalance, 0);
}

export function annualInterestForecast(loan?: Loan): number {
  if (!loan) return 0;
  return effectiveLoanBalance(loan) * (loan.interestRate / 100);
}

export function monthlyRepayment(loan?: Loan): number {
  if (!loan) return 0;
  const monthlyRate = loan.interestRate / 100 / 12;
  if (loan.repaymentType === "interest-only" || loan.principalAndInterestMonths <= 0) {
    return loan.loanBalance * monthlyRate;
  }
  const n = loan.principalAndInterestMonths;
  if (monthlyRate === 0) return loan.loanBalance / n;
  return (loan.loanBalance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

export function offsetSavingsPerYear(loan?: Loan): number {
  if (!loan) return 0;
  return Math.min(loan.offsetBalance, loan.loanBalance) * (loan.interestRate / 100);
}

export interface PropertyMetrics {
  property: Property;
  purchase?: PurchaseDetails;
  loan?: Loan;
  valuation: number;
  debt: number;
  offset: number;
  equity: number;
  lvr: number;
  netLvr: number;
  income: number;
  expenses: number;
  interest: number;
  annualDepreciation: number;
  cashflow: number;
  grossYield: number;
  netYield: number;
  capitalGrowth: number;
  capitalRequired: number;
  cashOnCash: number;
}

export function propertyMetrics(
  property: Property,
  purchase: PurchaseDetails | undefined,
  loan: Loan | undefined,
  income: IncomeEntry[],
  expenses: ExpenseEntry[]
): PropertyMetrics {
  const valuation = property.currentValuation || purchase?.valuation || purchase?.purchasePrice || 0;
  const debt = loan?.loanBalance ?? 0;
  const offset = loan?.offsetBalance ?? 0;
  const countedIncome = recognizedIncome(income);
  const grossIncome = sum(countedIncome.map((entry) => entry.amount));
  const managementFees = sum(countedIncome.map((entry) => entry.managementFee));
  const cashExpenses = sum(expenses.filter((entry) => !entry.capital).map((entry) => entry.amount));
  const interest = annualInterestForecast(loan);
  const annualDepreciation = property.annualDepreciation ?? 0;
  const totalExpenses = cashExpenses + managementFees + annualDepreciation;
  const capitalRequired = totalCapitalRequired(purchase, loan);
  const netCashflow = grossIncome - totalExpenses;

  return {
    property,
    purchase,
    loan,
    valuation,
    debt,
    offset,
    equity: valuation - debt + offset,
    lvr: valuation > 0 ? (debt / valuation) * 100 : 0,
    netLvr: valuation > 0 ? (Math.max(debt - offset, 0) / valuation) * 100 : 0,
    income: grossIncome,
    expenses: totalExpenses,
    interest,
    annualDepreciation,
    cashflow: netCashflow,
    grossYield: valuation > 0 ? (annualise(countedIncome) / valuation) * 100 : 0,
    netYield: valuation > 0 ? ((annualise(countedIncome) - totalExpenses) / valuation) * 100 : 0,
    capitalGrowth: purchase?.purchasePrice ? valuation - purchase.purchasePrice : 0,
    capitalRequired,
    cashOnCash: capitalRequired > 0 ? (netCashflow / capitalRequired) * 100 : 0
  };
}

export function portfolioTotals(metrics: PropertyMetrics[]): PortfolioTotals {
  const valuation = sum(metrics.map((m) => m.valuation));
  const debt = sum(metrics.map((m) => m.debt));
  const offset = sum(metrics.map((m) => m.offset));
  const income = sum(metrics.map((m) => m.income));
  const expenses = sum(metrics.map((m) => m.expenses));

  return {
    properties: metrics.length,
    valuation,
    debt,
    offset,
    equity: valuation - debt + offset,
    lvr: valuation > 0 ? (debt / valuation) * 100 : 0,
    netLvr: valuation > 0 ? (Math.max(debt - offset, 0) / valuation) * 100 : 0,
    income,
    expenses,
    cashflow: income - expenses,
    grossYield: valuation > 0 ? (income / valuation) * 100 : 0,
    netYield: valuation > 0 ? ((income - expenses) / valuation) * 100 : 0
  };
}

/** Annualises rent based on the observed collection window so partial years still yield sensible metrics. */
function annualise(income: IncomeEntry[]): number {
  if (income.length === 0) return 0;
  const total = sum(income.map((entry) => entry.amount));
  const times = income.map((entry) => new Date(entry.date).getTime()).sort((a, b) => a - b);
  const spanDays = (times[times.length - 1] - times[0]) / 86_400_000;
  if (spanDays < 45) return total;
  const factor = 365 / Math.max(spanDays, 1);
  return factor > 1 ? total * factor : total;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function groupByMonth(
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  annualDepreciation = 0
): { month: string; income: number; expenses: number; net: number }[] {
  const buckets = new Map<string, { income: number; expenses: number }>();
  const key = (iso: string) => iso.slice(0, 7);

  income.forEach((entry) => {
    if (!isRecognizedIncome(entry)) return;
    const bucket = buckets.get(key(entry.date)) ?? { income: 0, expenses: 0 };
    bucket.income += entry.amount;
    bucket.expenses += entry.managementFee;
    buckets.set(key(entry.date), bucket);
  });
  expenses.forEach((entry) => {
    const bucket = buckets.get(key(entry.date)) ?? { income: 0, expenses: 0 };
    bucket.expenses += entry.amount;
    buckets.set(key(entry.date), bucket);
  });

  const depreciationPerMonth = annualDepreciation / 12;
  buckets.forEach((bucket) => {
    bucket.expenses += depreciationPerMonth;
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value]) => ({
      month: new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit" }).format(new Date(`${month}-01`)),
      income: Math.round(value.income),
      expenses: Math.round(value.expenses),
      net: Math.round(value.income - value.expenses)
    }));
}

export interface GearingEntry {
  propertyId: string;
  taxable: number;
  taxTreatment: PropertyTaxTreatment;
}

export interface GearingResult {
  /** Combined position that offsets against other income, per current negative-gearing rules. */
  combinedTaxable: number;
  /** Losses quarantined within their property instead of offsetting other income. */
  heldLosses: number;
  byProperty: (GearingEntry & { held: boolean })[];
}

/** Properties held to "retain" quarantine their losses within the property rather than offsetting other income. */
export function calculateGearing(entries: GearingEntry[]): GearingResult {
  let combinedTaxable = 0;
  let heldLosses = 0;

  const byProperty = entries.map((entry) => {
    const held = entry.taxTreatment === "retain" && entry.taxable < 0;
    if (held) {
      heldLosses += entry.taxable;
    } else {
      combinedTaxable += entry.taxable;
    }
    return { ...entry, held };
  });

  return { combinedTaxable, heldLosses, byProperty };
}

export function nextOccurrence(dueDate: string, recurrence: string): string {
  const date = new Date(dueDate);
  switch (recurrence) {
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "half-yearly":
      date.setMonth(date.getMonth() + 6);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return dueDate;
  }
  return date.toISOString().slice(0, 10);
}
