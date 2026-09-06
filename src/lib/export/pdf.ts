import { financialYearLabel, portfolioTotals, propertyMetrics, inFinancialYear } from "../calc";
import { loadSnapshot } from "../data";
import { money, percent, titleise } from "../format";

export async function exportPortfolioPdf(fy?: number): Promise<void> {
  // Loaded on demand: jsPDF is browser-only and would otherwise ship in the initial bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const snapshot = await loadSnapshot();
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

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const period = fy ? financialYearLabel(fy) : "All time";

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Roofbook", 40, 34);
  doc.setFontSize(10);
  doc.text(`Portfolio report · ${period} · Generated ${new Date().toLocaleDateString("en-AU")}`, 40, 52);

  autoTable(doc, {
    startY: 92,
    head: [["Portfolio metric", "Value"]],
    body: [
      ["Properties", String(totals.properties)],
      ["Valuation", money(totals.valuation)],
      ["Debt", money(totals.debt)],
      ["Offset", money(totals.offset)],
      ["Equity", money(totals.equity)],
      ["LVR", percent(totals.lvr)],
      ["Income", money(totals.income)],
      ["Expenses", money(totals.expenses)],
      ["Net cashflow", money(totals.cashflow)],
      ["Gross yield", percent(totals.grossYield)],
      ["Net yield", percent(totals.netYield)]
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9, cellPadding: 5 },
    tableWidth: 320
  });

  autoTable(doc, {
    startY: 92,
    margin: { left: 400 },
    head: [["Property", "Valuation", "Debt", "Equity", "LVR", "Cashflow"]],
    body: metrics.map((metric) => [
      metric.property.name,
      money(metric.valuation),
      money(metric.debt),
      money(metric.equity),
      percent(metric.lvr, 1),
      money(metric.cashflow)
    ]),
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  doc.addPage();
  autoTable(doc, {
    head: [["Date", "Property", "Category", "Amount", "Mgmt fee", "Status"]],
    body: income
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => [
        entry.date,
        redact(snapshot.properties.find((property) => property.id === entry.propertyId)?.name ?? ""),
        titleise(entry.category),
        money(entry.amount, true),
        money(entry.managementFee, true),
        titleise(entry.status)
      ]),
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 8, cellPadding: 4 },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Income ledger", 40, 30);
    },
    margin: { top: 46 }
  });

  doc.addPage();
  autoTable(doc, {
    head: [["Date", "Property", "Category", "Supplier", "Amount", "GST", "Deductible"]],
    body: expenses
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => [
        entry.date,
        redact(snapshot.properties.find((property) => property.id === entry.propertyId)?.name ?? ""),
        titleise(entry.category),
        entry.supplier ?? "",
        money(entry.amount, true),
        money(entry.gst, true),
        entry.taxDeductible ? "Yes" : "No"
      ]),
    theme: "striped",
    headStyles: { fillColor: [244, 63, 94] },
    styles: { fontSize: 8, cellPadding: 4 },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Expense ledger", 40, 30);
    },
    margin: { top: 46 }
  });

  doc.save(`roofbook-${period.replace("/", "-")}.pdf`);
}

function redact(value: string): string {
  return value.replace(/pk\s+gupta/gi, "");
}
