import { db, nowIso, uid } from "./db";
import { accentPalette } from "./options";
import type { ExpenseEntry, IncomeEntry } from "./types";

/** Seeds a realistic two-property portfolio so the app is explorable on first run. */
export async function seedDemoData(): Promise<void> {
  const stamp = nowIso();
  const propertyA = uid();
  const propertyB = uid();

  await db.properties.bulkPut([
    {
      id: propertyA,
      name: "12 Marina Street",
      address: "12 Marina Street",
      suburb: "Redcliffe",
      state: "QLD",
      postcode: "4020",
      country: "Australia",
      type: "house",
      status: "owned",
      bedrooms: 4,
      bathrooms: 2,
      carSpaces: 2,
      landSize: 612,
      currentValuation: 845000,
      annualRent: 33800,
      rentFrequency: "weekly",
      currency: "AUD",
      annualDepreciation: 9200,
      managementFeePercent: 5.5,
      valuationDate: "2026-06-30",
      accent: accentPalette[0],
      taxTreatment: "offset",
      archived: false,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: propertyB,
      name: "8/45 Harbour Way",
      address: "8/45 Harbour Way",
      suburb: "Newstead",
      state: "QLD",
      postcode: "4006",
      country: "Australia",
      type: "unit",
      status: "owned",
      bedrooms: 2,
      bathrooms: 2,
      carSpaces: 1,
      landSize: 0,
      currentValuation: 615000,
      annualRent: 28600,
      rentFrequency: "weekly",
      currency: "AUD",
      annualDepreciation: 6800,
      managementFeePercent: 6,
      valuationDate: "2026-06-30",
      accent: accentPalette[2],
      taxTreatment: "offset",
      archived: false,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await db.purchases.bulkPut([
    {
      id: uid(),
      propertyId: propertyA,
      purchaseDate: "2021-03-18",
      settlementDate: "2021-04-29",
      valuation: 690000,
      purchasePrice: 675000,
      loanBeforeLmi: 540000,
      lmi: 0,
      loanAfterLmi: 540000,
      deposit: 135000,
      stampDuty: 17325,
      legalFees: 1650,
      renovations: 24000,
      settlementFees: 480,
      buildingAndPest: 650,
      registrationFees: 420,
      otherCosts: 800,
      updatedAt: stamp
    },
    {
      id: uid(),
      propertyId: propertyB,
      purchaseDate: "2023-09-06",
      settlementDate: "2023-10-20",
      valuation: 585000,
      purchasePrice: 578000,
      loanBeforeLmi: 462400,
      lmi: 8900,
      loanAfterLmi: 471300,
      deposit: 115600,
      stampDuty: 13950,
      legalFees: 1450,
      renovations: 6500,
      settlementFees: 420,
      buildingAndPest: 550,
      registrationFees: 390,
      otherCosts: 600,
      updatedAt: stamp
    }
  ]);

  await db.loans.bulkPut([
    {
      id: uid(),
      propertyId: propertyA,
      bank: "CommBank",
      accountName: "Marina St Investment",
      loanBalance: 512400,
      offsetBalance: 68500,
      interestRate: 6.09,
      repaymentType: "interest-only",
      interestOnlyMonths: 24,
      principalAndInterestMonths: 300,
      repaymentFrequency: "monthly",
      startDate: "2021-04-29",
      updatedAt: stamp
    },
    {
      id: uid(),
      propertyId: propertyB,
      bank: "Macquarie",
      accountName: "Harbour Way Investment",
      loanBalance: 468900,
      offsetBalance: 22400,
      interestRate: 6.34,
      repaymentType: "principal-and-interest",
      interestOnlyMonths: 0,
      principalAndInterestMonths: 348,
      repaymentFrequency: "fortnightly",
      fixedUntil: "2027-02-01",
      startDate: "2023-10-20",
      updatedAt: stamp
    }
  ]);

  const income: IncomeEntry[] = [];
  const expenses: ExpenseEntry[] = [];
  const today = new Date();

  for (let fortnight = 0; fortnight < 26; fortnight += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - fortnight * 14);
    const iso = date.toISOString().slice(0, 10);

    income.push({
      id: uid(),
      propertyId: propertyA,
      date: iso,
      periodStart: iso,
      periodEnd: iso,
      category: "rent",
      status: fortnight === 3 ? "arrears" : "received",
      amount: 1300,
      managementFee: 91,
      createdAt: stamp
    });
    income.push({
      id: uid(),
      propertyId: propertyB,
      date: iso,
      periodStart: iso,
      periodEnd: iso,
      category: "rent",
      status: fortnight === 8 ? "vacant" : "received",
      amount: fortnight === 8 ? 0 : 1120,
      managementFee: fortnight === 8 ? 0 : 78.4,
      createdAt: stamp
    });
  }

  const expenseSeeds: [string, ExpenseEntry["category"], number, string][] = [
    [propertyA, "council-rates", 612, "Moreton Bay Council"],
    [propertyA, "water", 288, "Unitywater"],
    [propertyA, "landlord-insurance", 742, "Terri Scheer"],
    [propertyA, "maintenance", 480, "Aqua Plumbing"],
    [propertyA, "smoke-alarm", 99, "Smoke Alarm Solutions"],
    [propertyB, "strata", 1180, "Body Corporate"],
    [propertyB, "council-rates", 495, "Brisbane City Council"],
    [propertyB, "landlord-insurance", 688, "EBM RentCover"],
    [propertyB, "advertising", 330, "Leasing campaign"],
    [propertyB, "gas-electrical", 165, "Compliance Co"]
  ];

  expenseSeeds.forEach(([propertyId, category, amount, supplier], index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index * 24 - 5);
    expenses.push({
      id: uid(),
      propertyId,
      date: date.toISOString().slice(0, 10),
      category,
      supplier,
      amount,
      gst: Math.round((amount / 11) * 100) / 100,
      taxDeductible: true,
      capital: false,
      createdAt: stamp
    });
  });

  await db.income.bulkPut(income);
  await db.expenses.bulkPut(expenses);

  const soon = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  await db.reminders.bulkPut([
    {
      id: uid(),
      propertyId: propertyA,
      title: "Landlord insurance renewal",
      category: "insurance-renewal",
      dueDate: soon(21),
      recurrence: "yearly",
      leadDays: [60, 30, 14, 7, 1],
      completed: false,
      createdAt: stamp
    },
    {
      id: uid(),
      propertyId: propertyA,
      title: "Termite inspection",
      category: "termite-inspection",
      dueDate: soon(58),
      recurrence: "yearly",
      leadDays: [30, 14, 7],
      completed: false,
      createdAt: stamp
    },
    {
      id: uid(),
      propertyId: propertyB,
      title: "Lease expiry — review rent",
      category: "lease-expiry",
      dueDate: soon(9),
      recurrence: "none",
      leadDays: [90, 60, 30, 14, 7, 1],
      completed: false,
      createdAt: stamp
    },
    {
      id: uid(),
      title: "Land tax assessment",
      category: "land-tax",
      dueDate: soon(120),
      recurrence: "yearly",
      leadDays: [30, 14],
      completed: false,
      createdAt: stamp
    }
  ]);

  await db.contacts.bulkPut([
    {
      id: uid(),
      propertyId: propertyA,
      name: "Ava Nguyen",
      role: "property-manager",
      company: "Coastline Realty",
      phone: "07 3555 0110",
      email: "ava@coastlinerealty.example",
      createdAt: stamp
    },
    {
      id: uid(),
      propertyId: propertyA,
      name: "Terri Scheer",
      role: "insurer",
      policyNumber: "TS-4482190",
      renewalDate: soon(21),
      premium: 742,
      createdAt: stamp
    },
    {
      id: uid(),
      name: "Jordan Blake",
      role: "accountant",
      company: "Blake & Co Advisory",
      email: "jordan@blakeco.example",
      createdAt: stamp
    }
  ]);
}
