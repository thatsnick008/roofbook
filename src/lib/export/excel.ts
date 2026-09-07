import type { ColInfo, WorkBook } from "xlsx";
import {
  annualInterestForecast,
  costBase,
  financialYearLabel,
  financialYearOf,
  availableFinancialYears,
  inFinancialYear,
  monthlyRepayment,
  offsetSavingsPerYear,
  portfolioTotals,
  propertyMetrics,
  sum,
  totalCapitalRequired
} from "../calc";
import { loadSnapshot, propertyNameMap, type Snapshot } from "../data";
import { titleise } from "../format";
import { roofbookTemplate, templateForSheet } from "./roofbook-template";

export type SheetRow = Record<string, string | number | boolean | null | undefined>;

export interface Sheet {
  name: string;
  rows: SheetRow[];
}

// SheetJS is loaded on demand so it stays out of the initial bundle and never runs during SSR.
const loadXlsx = () => import("xlsx");

function autoWidth(rows: SheetRow[]): ColInfo[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[key] ?? "").length), key.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 46) };
  });
}

export async function buildWorkbook(sheets: Sheet[]): Promise<WorkBook> {
  const XLSX = await loadXlsx();
  const workbook = await loadWorkbookTemplate(XLSX, "/templates/roofbook-tax-template.xlsx");
  const occupiedNames = new Set(workbook.SheetNames);

  sheets.forEach((sheet) => {
    if (sheet.rows.length === 0) return;
    const template = templateForSheet(sheet.name);
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows, { header: Object.keys(sheet.rows[0] ?? {}) });
    worksheet["!cols"] = template?.widths.map((wch) => ({ wch })) ?? autoWidth(sheet.rows);
    const exportName = uniqueSheetName(`Roofbook ${sheet.name}`, occupiedNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, exportName);
    occupiedNames.add(exportName);
  });

  return workbook;
}

async function loadWorkbookTemplate(XLSX: any, path: string): Promise<WorkBook> {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Roofbook template unavailable");
    const buffer = await response.arrayBuffer();
    return XLSX.read(buffer, { type: "array", cellStyles: true, cellFormula: true });
  } catch {
    return XLSX.utils.book_new();
  }
}

function categoryTotal(
  entries: Snapshot["expenses"],
  category: Snapshot["expenses"][number]["category"]
): number {
  return sum(entries.filter((entry) => entry.category === category).map((entry) => entry.amount));
}

function knownOperatingTotal(entries: Snapshot["expenses"]): number {
  const known = new Set([
    "council-rates",
    "water",
    "building-insurance",
    "landlord-insurance",
    "property-management",
    "leasing-fee",
    "advertising",
    "maintenance",
    "smoke-alarm",
    "gas-electrical",
    "pest-control",
    "strata",
    "land-tax",
    "interest"
  ]);
  return sum(entries.filter((entry) => known.has(entry.category)).map((entry) => entry.amount));
}

function cleanExportRows(rows: SheetRow[]): SheetRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" ? value.replace(/pk\s+gupta/gi, "") : value
      ])
    )
  );
}

function uniqueSheetName(base: string, occupied: Set<string>): string {
  const clean = base.slice(0, 31);
  if (!occupied.has(clean)) return clean;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base.slice(0, 28)} ${index}`;
    if (!occupied.has(candidate)) return candidate;
  }
  return `${base.slice(0, 25)} ${Date.now()}`.slice(0, 31);
}

export async function downloadWorkbook(sheets: Sheet[], filename: string): Promise<void> {
  const XLSX = await loadXlsx();
  const workbook = await buildWorkbook(sheets);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`, {
    compression: true,
    bookType: "xlsx"
  });
}

export async function exportBudgetWorkbook(): Promise<void> {
  const XLSX = await loadXlsx();
  const snapshot = await loadSnapshot();
  const workbook = await loadWorkbookTemplate(XLSX, "/templates/roofbook-budget-template.xlsx");
  const names = propertyNameMap(snapshot.properties);
  const years = availableFinancialYears(snapshot.income, snapshot.expenses);
  const occupied = new Set(workbook.SheetNames);

  const purchaseRows: SheetRow[] = snapshot.purchases.map((purchase) => ({
    Property: names.get(purchase.propertyId) ?? purchase.propertyId,
    "Purchase year": financialYearLabel(financialYearOf(purchase.purchaseDate)),
    "Purchase date": purchase.purchaseDate,
    "Purchase price": purchase.purchasePrice,
    Deposit: purchase.deposit,
    "Stamp duty": purchase.stampDuty,
    "Legal fees": purchase.legalFees,
    Renovations: purchase.renovations,
    "Settlement fees": purchase.settlementFees,
    "Building & pest": purchase.buildingAndPest,
    "Registration fees": purchase.registrationFees,
    "Other costs": purchase.otherCosts,
    "Total purchase cost": totalCapitalRequired(purchase),
    "Cost base": costBase(purchase)
  }));

  const annualRows: SheetRow[] = [];
  years.forEach((year) => {
    snapshot.properties.forEach((property) => {
      const income = snapshot.income.filter(
        (entry) => entry.propertyId === property.id && inFinancialYear(entry.date, year)
      );
      const expenses = snapshot.expenses.filter(
        (entry) => entry.propertyId === property.id && inFinancialYear(entry.date, year)
      );
      const rentalIncome = sum(income.map((entry) => entry.amount));
      const managementFees = sum(income.map((entry) => entry.managementFee));
      const operatingCosts = sum(expenses.filter((entry) => !entry.capital).map((entry) => entry.amount));
      const capitalWorks = sum(expenses.filter((entry) => entry.capital).map((entry) => entry.amount));

      annualRows.push({
        "Financial year": financialYearLabel(year),
        Property: property.name,
        "Rental income": rentalIncome,
        "Management fees": managementFees,
        "Council rates": categoryTotal(expenses, "council-rates"),
        Water: categoryTotal(expenses, "water"),
        Insurance: categoryTotal(expenses, "building-insurance") + categoryTotal(expenses, "landlord-insurance"),
        "Property management": categoryTotal(expenses, "property-management"),
        Leasing: categoryTotal(expenses, "leasing-fee"),
        Advertising: categoryTotal(expenses, "advertising"),
        Maintenance: categoryTotal(expenses, "maintenance"),
        Strata: categoryTotal(expenses, "strata"),
        "Pest / compliance":
          categoryTotal(expenses, "pest-control") +
          categoryTotal(expenses, "smoke-alarm") +
          categoryTotal(expenses, "gas-electrical"),
        "Land tax": categoryTotal(expenses, "land-tax"),
        Interest: categoryTotal(expenses, "interest"),
        "Other operating costs": Math.max(operatingCosts - knownOperatingTotal(expenses), 0),
        "Total operating costs": operatingCosts,
        "Capital works": capitalWorks,
        "Net operating cashflow / year": rentalIncome - managementFees - operatingCosts
      });
    });
  });

  for (const sheet of [
    { name: "Purchase Costs", rows: purchaseRows },
    { name: "Annual Operating Costs", rows: annualRows }
  ]) {
    const worksheet = XLSX.utils.json_to_sheet(cleanExportRows(sheet.rows));
    worksheet["!cols"] = autoWidth(sheet.rows);
    const exportName = uniqueSheetName(`Roofbook ${sheet.name}`, occupied);
    XLSX.utils.book_append_sheet(workbook, worksheet, exportName);
    occupied.add(exportName);
  }

  XLSX.writeFile(workbook, "roofbook-budgeting-costs.xlsx", { compression: true, bookType: "xlsx" });
}

export async function downloadCsv(rows: SheetRow[], filename: string): Promise<void> {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.json_to_sheet(cleanExportRows(rows.length ? rows : [{ Message: "No data" }]));
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function buildSheets(snapshot: Snapshot, fy?: number): Sheet[] {
  const names = propertyNameMap(snapshot.properties);
  const income = fy ? snapshot.income.filter((entry) => inFinancialYear(entry.date, fy)) : snapshot.income;
  const expenses = fy ? snapshot.expenses.filter((entry) => inFinancialYear(entry.date, fy)) : snapshot.expenses;

  const metrics = snapshot.properties.map((property) =>
    propertyMetrics(
      property,
      snapshot.purchases.find((purchase) => purchase.propertyId === property.id),
      snapshot.loans.find((loan) => loan.propertyId === property.id),
      income.filter((entry) => entry.propertyId === property.id),
      expenses.filter((entry) => entry.propertyId === property.id)
    )
  );
  const totals = portfolioTotals(metrics);

  const portfolioSheet: SheetRow[] = [
    { Metric: "Financial year", Value: fy ? financialYearLabel(fy) : "All time" },
    { Metric: "Properties", Value: totals.properties },
    { Metric: "Portfolio valuation", Value: totals.valuation },
    { Metric: "Total debt", Value: totals.debt },
    { Metric: "Offset balances", Value: totals.offset },
    { Metric: "Net equity", Value: totals.equity },
    { Metric: "Portfolio LVR %", Value: round(totals.lvr) },
    { Metric: "Total income", Value: totals.income },
    { Metric: "Total expenses", Value: totals.expenses },
    { Metric: "Net cashflow / year", Value: totals.cashflow },
    { Metric: "Gross yield %", Value: round(totals.grossYield) },
    { Metric: "Net yield %", Value: round(totals.netYield) },
    { Metric: "Generated", Value: new Date().toLocaleString("en-AU") }
  ];

  const propertiesSheet: SheetRow[] = metrics.map((metric) => ({
    Property: metric.property.name,
    Address: metric.property.address,
    Suburb: metric.property.suburb,
    State: metric.property.state,
    Postcode: metric.property.postcode,
    Type: titleise(metric.property.type),
    Status: titleise(metric.property.status),
    Beds: metric.property.bedrooms,
    Baths: metric.property.bathrooms,
    Cars: metric.property.carSpaces,
    "Land (sqm)": metric.property.landSize,
    Valuation: metric.valuation,
    "Loan balance": metric.debt,
    Offset: metric.offset,
    Equity: metric.equity,
    "LVR %": round(metric.lvr),
    Income: metric.income,
    Expenses: metric.expenses,
    "Net cashflow / year": metric.cashflow,
    "Gross yield %": round(metric.grossYield),
    "Net yield %": round(metric.netYield),
    "Capital growth": round(metric.capitalGrowth),
    "Cash on cash %": round(metric.cashOnCash)
  }));

  const purchaseSheet: SheetRow[] = snapshot.purchases.map((purchase) => ({
    Property: names.get(purchase.propertyId) ?? purchase.propertyId,
    "Purchase date": purchase.purchaseDate,
    "Settlement date": purchase.settlementDate ?? "",
    Valuation: purchase.valuation,
    "Purchase price": purchase.purchasePrice,
    "Loan before LMI": purchase.loanBeforeLmi,
    LMI: purchase.lmi,
    "Loan after LMI": purchase.loanAfterLmi,
    Deposit: purchase.deposit,
    "Stamp duty": purchase.stampDuty,
    "Legal fees": purchase.legalFees,
    Renovations: purchase.renovations,
    "Settlement fees": purchase.settlementFees,
    "Building & pest": purchase.buildingAndPest,
    "Registration fees": purchase.registrationFees,
    "Other costs": purchase.otherCosts,
    "Total capital required": totalCapitalRequired(purchase),
    "Cost base (CGT)": costBase(purchase)
  }));

  const loanSheet: SheetRow[] = snapshot.loans.map((loan) => ({
    Property: names.get(loan.propertyId) ?? loan.propertyId,
    Bank: loan.bank,
    Account: loan.accountName,
    "Loan balance": loan.loanBalance,
    "Offset balance": loan.offsetBalance,
    "Effective debt": Math.max(loan.loanBalance - loan.offsetBalance, 0),
    "Interest rate %": loan.interestRate,
    "Repayment type": titleise(loan.repaymentType),
    "IO months": loan.interestOnlyMonths,
    "P&I months": loan.principalAndInterestMonths,
    Frequency: titleise(loan.repaymentFrequency),
    "Fixed until": loan.fixedUntil ?? "",
    "Monthly repayment": round(monthlyRepayment(loan)),
    "Annual interest forecast": round(annualInterestForecast(loan)),
    "Offset saving p.a.": round(offsetSavingsPerYear(loan))
  }));

  const incomeSheet: SheetRow[] = income
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      Date: entry.date,
      Property: names.get(entry.propertyId) ?? entry.propertyId,
      Category: titleise(entry.category),
      Status: titleise(entry.status),
      "Period start": entry.periodStart ?? "",
      "Period end": entry.periodEnd ?? "",
      Amount: entry.amount,
      "Management fee": entry.managementFee,
      Net: entry.amount - entry.managementFee,
      Notes: entry.notes ?? ""
    }));

  const expenseSheet: SheetRow[] = expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      Date: entry.date,
      Property: names.get(entry.propertyId) ?? entry.propertyId,
      Category: titleise(entry.category),
      Supplier: entry.supplier ?? "",
      Amount: entry.amount,
      GST: entry.gst,
      "Ex GST": round(entry.amount - entry.gst),
      "Tax deductible": entry.taxDeductible ? "Yes" : "No",
      "Capital works": entry.capital ? "Yes" : "No",
      Notes: entry.notes ?? ""
    }));

  const categoryTotals = new Map<string, number>();
  expenses.forEach((entry) => {
    categoryTotals.set(entry.category, (categoryTotals.get(entry.category) ?? 0) + entry.amount);
  });

  const taxSheet: SheetRow[] = [
    { Item: "Gross rental income", Amount: sum(income.map((entry) => entry.amount)) },
    { Item: "Management fees", Amount: sum(income.map((entry) => entry.managementFee)) },
    ...[...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ Item: titleise(category), Amount: round(amount) })),
    {
      Item: "Total deductible expenses",
      Amount: round(sum(expenses.filter((entry) => entry.taxDeductible).map((entry) => entry.amount)))
    },
    {
      Item: "Capital works (non-deductible)",
      Amount: round(sum(expenses.filter((entry) => entry.capital).map((entry) => entry.amount)))
    },
    {
      Item: "Net taxable position",
      Amount: round(
        sum(income.map((entry) => entry.amount)) -
          sum(income.map((entry) => entry.managementFee)) -
          sum(expenses.filter((entry) => entry.taxDeductible && !entry.capital).map((entry) => entry.amount))
      )
    }
  ];

  const contactsSheet: SheetRow[] = snapshot.contacts.map((contact) => ({
    Name: contact.name,
    Role: titleise(contact.role),
    Property: contact.propertyId ? names.get(contact.propertyId) ?? "" : "Portfolio",
    Company: contact.company ?? "",
    Phone: contact.phone ?? "",
    Email: contact.email ?? "",
    "Policy number": contact.policyNumber ?? "",
    "Renewal date": contact.renewalDate ?? "",
    Premium: contact.premium ?? 0,
    Notes: contact.notes ?? ""
  }));

  const remindersSheet: SheetRow[] = snapshot.reminders.map((reminder) => ({
    Title: reminder.title,
    Category: titleise(reminder.category),
    Property: reminder.propertyId ? names.get(reminder.propertyId) ?? "" : "Portfolio",
    "Due date": reminder.dueDate,
    Recurrence: titleise(reminder.recurrence),
    "Lead days": reminder.leadDays.join(", "),
    Status: reminder.completed ? "Completed" : "Open",
    Notes: reminder.notes ?? ""
  }));

  const documentsSheet: SheetRow[] = snapshot.documents.map((document) => ({
    Name: document.name,
    Property: document.propertyId ? names.get(document.propertyId) ?? "" : "Portfolio",
    Category: titleise(document.category),
    Type: document.mimeType,
    "Size (KB)": Math.round(document.size / 1024),
    Tags: document.tags.join(", "),
    Uploaded: document.uploadedAt.slice(0, 10)
  }));

  return [
    { name: "Portfolio Summary", rows: portfolioSheet },
    { name: "Properties", rows: propertiesSheet },
    { name: "Purchase Details", rows: purchaseSheet },
    { name: "Finance & Offset", rows: loanSheet },
    { name: "Income", rows: incomeSheet },
    { name: "Expenses", rows: expenseSheet },
    { name: "Tax Summary", rows: taxSheet },
    { name: "Contacts & Insurance", rows: contactsSheet },
    { name: "Reminders", rows: remindersSheet },
    { name: "Documents", rows: documentsSheet }
  ];
}

export async function exportPortfolioWorkbook(fy?: number): Promise<void> {
  const snapshot = await loadSnapshot();
  const suffix = fy ? financialYearLabel(fy).replace("/", "-") : "all-time";
  await downloadWorkbook(buildSheets(snapshot, fy), `roofbook-${suffix}.xlsx`);
}

export async function exportSingleSheet(sheetName: string, fy?: number): Promise<void> {
  const snapshot = await loadSnapshot();
  const sheet = buildSheets(snapshot, fy).find((item) => item.name === sheetName);
  if (!sheet) return;
  const suffix = fy ? financialYearLabel(fy).replace("/", "-") : "all-time";
  await downloadWorkbook([sheet], `roofbook-${slug(sheetName)}-${suffix}.xlsx`);
}

export async function exportSingleSheetCsv(sheetName: string, fy?: number): Promise<void> {
  const snapshot = await loadSnapshot();
  const sheet = buildSheets(snapshot, fy).find((item) => item.name === sheetName);
  if (!sheet) return;
  const suffix = fy ? financialYearLabel(fy).replace("/", "-") : "all-time";
  await downloadCsv(sheet.rows, `roofbook-${slug(sheetName)}-${suffix}.csv`);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function round(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}
