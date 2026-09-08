import type { CurrencyCode, PropertyType } from "./types";

/**
 * Indicative lookup values used by the acquisition calculator. They are planning
 * estimates only — always confirm duty and land tax against the current revenue
 * office schedule before committing to a purchase.
 */

export interface DutyBracket {
  /** Bracket applies to the portion of the price above this threshold. */
  upTo: number;
  base: number;
  rate: number;
  over: number;
}

export interface StateLookup {
  code: string;
  label: string;
  currency: CurrencyCode;
  dutyBrackets: DutyBracket[];
  /** Flat title transfer + mortgage registration charges. */
  transferFee: number;
  mortgageRegistrationFee: number;
  conveyancing: number;
  buildingAndPest: number;
  /** Annual council rates as a share of property value, with a floor. */
  councilRatesPercent: number;
  councilRatesMinimum: number;
  waterAnnual: number;
  /** Annual landlord + building insurance estimate as a share of value. */
  insurancePercent: number;
  insuranceMinimum: number;
  landTaxThreshold: number;
  landTaxRate: number;
  managementFeePercent: number;
  lettingWeeks: number;
  typicalGrossYield: number;
}

const AU_DEFAULTS = {
  currency: "AUD" as CurrencyCode,
  managementFeePercent: 7.7,
  lettingWeeks: 2
};

export const stateLookups: StateLookup[] = [
  {
    ...AU_DEFAULTS,
    code: "NSW",
    label: "New South Wales",
    dutyBrackets: [
      { upTo: 17_000, base: 0, rate: 1.25, over: 0 },
      { upTo: 37_000, base: 212, rate: 1.5, over: 17_000 },
      { upTo: 99_000, base: 512, rate: 1.75, over: 37_000 },
      { upTo: 372_000, base: 1_597, rate: 3.5, over: 99_000 },
      { upTo: 1_240_000, base: 11_152, rate: 4.5, over: 372_000 },
      { upTo: 3_721_000, base: 50_212, rate: 5.5, over: 1_240_000 },
      { upTo: Infinity, base: 186_667, rate: 7, over: 3_721_000 }
    ],
    transferFee: 171,
    mortgageRegistrationFee: 171,
    conveyancing: 1_800,
    buildingAndPest: 700,
    councilRatesPercent: 0.22,
    councilRatesMinimum: 1_300,
    waterAnnual: 800,
    insurancePercent: 0.16,
    insuranceMinimum: 900,
    landTaxThreshold: 1_075_000,
    landTaxRate: 1.6,
    typicalGrossYield: 3.6
  },
  {
    ...AU_DEFAULTS,
    code: "VIC",
    label: "Victoria",
    dutyBrackets: [
      { upTo: 25_000, base: 0, rate: 1.4, over: 0 },
      { upTo: 130_000, base: 350, rate: 2.4, over: 25_000 },
      { upTo: 960_000, base: 2_870, rate: 6, over: 130_000 },
      { upTo: 2_000_000, base: 0, rate: 5.5, over: 0 },
      { upTo: Infinity, base: 110_000, rate: 6.5, over: 2_000_000 }
    ],
    transferFee: 120,
    mortgageRegistrationFee: 120,
    conveyancing: 1_600,
    buildingAndPest: 650,
    councilRatesPercent: 0.24,
    councilRatesMinimum: 1_400,
    waterAnnual: 750,
    insurancePercent: 0.16,
    insuranceMinimum: 900,
    landTaxThreshold: 50_000,
    landTaxRate: 0.9,
    typicalGrossYield: 3.4
  },
  {
    ...AU_DEFAULTS,
    code: "QLD",
    label: "Queensland",
    dutyBrackets: [
      { upTo: 5_000, base: 0, rate: 0, over: 0 },
      { upTo: 75_000, base: 0, rate: 1.5, over: 5_000 },
      { upTo: 540_000, base: 1_050, rate: 3.5, over: 75_000 },
      { upTo: 1_000_000, base: 17_325, rate: 4.5, over: 540_000 },
      { upTo: Infinity, base: 38_025, rate: 5.75, over: 1_000_000 }
    ],
    transferFee: 220,
    mortgageRegistrationFee: 220,
    conveyancing: 1_500,
    buildingAndPest: 650,
    councilRatesPercent: 0.26,
    councilRatesMinimum: 1_600,
    waterAnnual: 900,
    insurancePercent: 0.2,
    insuranceMinimum: 1_100,
    landTaxThreshold: 600_000,
    landTaxRate: 1.7,
    typicalGrossYield: 4.4
  },
  {
    ...AU_DEFAULTS,
    code: "SA",
    label: "South Australia",
    dutyBrackets: [
      { upTo: 12_000, base: 0, rate: 1, over: 0 },
      { upTo: 30_000, base: 120, rate: 2, over: 12_000 },
      { upTo: 50_000, base: 480, rate: 3, over: 30_000 },
      { upTo: 100_000, base: 1_080, rate: 3.5, over: 50_000 },
      { upTo: 200_000, base: 2_830, rate: 4, over: 100_000 },
      { upTo: 250_000, base: 6_830, rate: 4.25, over: 200_000 },
      { upTo: 300_000, base: 8_955, rate: 4.75, over: 250_000 },
      { upTo: 500_000, base: 11_330, rate: 5, over: 300_000 },
      { upTo: Infinity, base: 21_330, rate: 5.5, over: 500_000 }
    ],
    transferFee: 190,
    mortgageRegistrationFee: 190,
    conveyancing: 1_400,
    buildingAndPest: 600,
    councilRatesPercent: 0.28,
    councilRatesMinimum: 1_500,
    waterAnnual: 850,
    insurancePercent: 0.18,
    insuranceMinimum: 950,
    landTaxThreshold: 732_000,
    landTaxRate: 1.65,
    typicalGrossYield: 4.2
  },
  {
    ...AU_DEFAULTS,
    code: "WA",
    label: "Western Australia",
    dutyBrackets: [
      { upTo: 120_000, base: 0, rate: 1.9, over: 0 },
      { upTo: 150_000, base: 2_280, rate: 2.85, over: 120_000 },
      { upTo: 360_000, base: 3_135, rate: 3.8, over: 150_000 },
      { upTo: 725_000, base: 11_115, rate: 4.75, over: 360_000 },
      { upTo: Infinity, base: 28_453, rate: 5.15, over: 725_000 }
    ],
    transferFee: 200,
    mortgageRegistrationFee: 200,
    conveyancing: 1_400,
    buildingAndPest: 600,
    councilRatesPercent: 0.3,
    councilRatesMinimum: 1_600,
    waterAnnual: 1_000,
    insurancePercent: 0.18,
    insuranceMinimum: 950,
    landTaxThreshold: 300_000,
    landTaxRate: 0.9,
    typicalGrossYield: 4.8
  },
  {
    ...AU_DEFAULTS,
    code: "TAS",
    label: "Tasmania",
    dutyBrackets: [
      { upTo: 25_000, base: 0, rate: 1.75, over: 0 },
      { upTo: 75_000, base: 435, rate: 2.25, over: 25_000 },
      { upTo: 200_000, base: 1_560, rate: 3.5, over: 75_000 },
      { upTo: 375_000, base: 5_935, rate: 4, over: 200_000 },
      { upTo: 725_000, base: 12_935, rate: 4.25, over: 375_000 },
      { upTo: Infinity, base: 27_810, rate: 4.5, over: 725_000 }
    ],
    transferFee: 250,
    mortgageRegistrationFee: 150,
    conveyancing: 1_400,
    buildingAndPest: 600,
    councilRatesPercent: 0.3,
    councilRatesMinimum: 1_500,
    waterAnnual: 1_100,
    insurancePercent: 0.18,
    insuranceMinimum: 950,
    landTaxThreshold: 125_000,
    landTaxRate: 1,
    typicalGrossYield: 4.5
  },
  {
    ...AU_DEFAULTS,
    code: "NT",
    label: "Northern Territory",
    dutyBrackets: [
      { upTo: 525_000, base: 0, rate: 4.95, over: 0 },
      { upTo: 3_000_000, base: 25_987, rate: 4.95, over: 525_000 },
      { upTo: Infinity, base: 148_500, rate: 5.95, over: 3_000_000 }
    ],
    transferFee: 160,
    mortgageRegistrationFee: 160,
    conveyancing: 1_500,
    buildingAndPest: 650,
    councilRatesPercent: 0.32,
    councilRatesMinimum: 1_700,
    waterAnnual: 1_200,
    insurancePercent: 0.35,
    insuranceMinimum: 1_800,
    landTaxThreshold: Infinity,
    landTaxRate: 0,
    typicalGrossYield: 6.2
  },
  {
    ...AU_DEFAULTS,
    code: "ACT",
    label: "Australian Capital Territory",
    dutyBrackets: [
      { upTo: 200_000, base: 0, rate: 1.2, over: 0 },
      { upTo: 300_000, base: 2_400, rate: 2.2, over: 200_000 },
      { upTo: 500_000, base: 4_600, rate: 3.4, over: 300_000 },
      { upTo: 750_000, base: 11_400, rate: 4.32, over: 500_000 },
      { upTo: 1_000_000, base: 22_200, rate: 5.9, over: 750_000 },
      { upTo: Infinity, base: 36_950, rate: 6.4, over: 1_000_000 }
    ],
    transferFee: 450,
    mortgageRegistrationFee: 170,
    conveyancing: 1_800,
    buildingAndPest: 700,
    councilRatesPercent: 0.4,
    councilRatesMinimum: 2_200,
    waterAnnual: 800,
    insurancePercent: 0.16,
    insuranceMinimum: 900,
    landTaxThreshold: 0,
    landTaxRate: 1.1,
    typicalGrossYield: 4.6
  }
];

export const stateLookup = (code: string): StateLookup =>
  stateLookups.find((entry) => entry.code === code) ?? stateLookups[2];

export interface SuburbLookup {
  state: string;
  suburb: string;
  postcode: string;
  medianPrice: number;
  weeklyRent: number;
  /** Body corporate / strata levies per year for attached dwellings. */
  strataAnnual: number;
}

export const suburbLookups: SuburbLookup[] = [
  { state: "NSW", suburb: "Parramatta", postcode: "2150", medianPrice: 905_000, weeklyRent: 650, strataAnnual: 4_200 },
  { state: "NSW", suburb: "Liverpool", postcode: "2170", medianPrice: 780_000, weeklyRent: 560, strataAnnual: 3_800 },
  { state: "NSW", suburb: "Newcastle", postcode: "2300", medianPrice: 960_000, weeklyRent: 700, strataAnnual: 3_600 },
  { state: "NSW", suburb: "Wollongong", postcode: "2500", medianPrice: 880_000, weeklyRent: 640, strataAnnual: 3_500 },
  { state: "VIC", suburb: "Footscray", postcode: "3011", medianPrice: 790_000, weeklyRent: 560, strataAnnual: 3_600 },
  { state: "VIC", suburb: "Dandenong", postcode: "3175", medianPrice: 660_000, weeklyRent: 480, strataAnnual: 3_000 },
  { state: "VIC", suburb: "Geelong", postcode: "3220", medianPrice: 720_000, weeklyRent: 520, strataAnnual: 2_800 },
  { state: "VIC", suburb: "Werribee", postcode: "3030", medianPrice: 590_000, weeklyRent: 450, strataAnnual: 2_400 },
  { state: "QLD", suburb: "Redcliffe", postcode: "4020", medianPrice: 760_000, weeklyRent: 620, strataAnnual: 3_400 },
  { state: "QLD", suburb: "Newstead", postcode: "4006", medianPrice: 690_000, weeklyRent: 640, strataAnnual: 6_500 },
  { state: "QLD", suburb: "Logan Central", postcode: "4114", medianPrice: 560_000, weeklyRent: 470, strataAnnual: 2_600 },
  { state: "QLD", suburb: "Toowoomba", postcode: "4350", medianPrice: 620_000, weeklyRent: 500, strataAnnual: 2_500 },
  { state: "SA", suburb: "Salisbury", postcode: "5108", medianPrice: 620_000, weeklyRent: 500, strataAnnual: 2_400 },
  { state: "SA", suburb: "Prospect", postcode: "5082", medianPrice: 940_000, weeklyRent: 680, strataAnnual: 3_000 },
  { state: "WA", suburb: "Armadale", postcode: "6112", medianPrice: 520_000, weeklyRent: 520, strataAnnual: 2_200 },
  { state: "WA", suburb: "Joondalup", postcode: "6027", medianPrice: 780_000, weeklyRent: 660, strataAnnual: 3_200 },
  { state: "TAS", suburb: "Glenorchy", postcode: "7010", medianPrice: 540_000, weeklyRent: 460, strataAnnual: 2_400 },
  { state: "NT", suburb: "Palmerston", postcode: "0830", medianPrice: 520_000, weeklyRent: 600, strataAnnual: 3_000 },
  { state: "ACT", suburb: "Belconnen", postcode: "2617", medianPrice: 660_000, weeklyRent: 590, strataAnnual: 4_800 }
];

export const suburbsForState = (state: string): SuburbLookup[] =>
  suburbLookups.filter((entry) => entry.state === state);

/** Strata only applies to attached dwellings; houses and land carry none. */
export const attachedDwelling = (type: PropertyType): boolean =>
  type === "unit" || type === "townhouse" || type === "duplex";

export function stampDuty(price: number, state: string): number {
  if (price <= 0) return 0;
  const brackets = stateLookup(state).dutyBrackets;
  const bracket = brackets.find((entry) => price <= entry.upTo) ?? brackets[brackets.length - 1];
  return Math.round(bracket.base + ((price - bracket.over) * bracket.rate) / 100);
}

/** Rough lender's mortgage insurance premium — nil at or below 80% LVR. */
export function lendersMortgageInsurance(price: number, lvr: number): number {
  if (lvr <= 80) return 0;
  const loan = (price * lvr) / 100;
  const premiumRate = lvr <= 85 ? 1.1 : lvr <= 90 ? 2.1 : lvr <= 95 ? 3.6 : 4.6;
  return Math.round((loan * premiumRate) / 100);
}

export function landTax(value: number, state: string): number {
  const lookup = stateLookup(state);
  if (!Number.isFinite(lookup.landTaxThreshold) || lookup.landTaxRate <= 0) return 0;
  // Land tax applies to the unimproved land value, roughly 60% of the purchase price.
  const landValue = value * 0.6;
  if (landValue <= lookup.landTaxThreshold) return 0;
  return Math.round(((landValue - lookup.landTaxThreshold) * lookup.landTaxRate) / 100);
}

export interface CalculatorInput {
  state: string;
  suburb: string;
  price: number;
  annualRent: number;
  propertyType: PropertyType;
  lvr: number;
  interestRate: number;
  vacancyWeeks: number;
  maintenancePercent: number;
}

export interface CostLine {
  label: string;
  amount: number;
  note?: string;
}

export interface CalculatorResult {
  deposit: number;
  loan: number;
  upfront: CostLine[];
  upfrontTotal: number;
  cashRequired: number;
  operating: CostLine[];
  operatingTotal: number;
  effectiveRent: number;
  interest: number;
  grossYield: number;
  netYield: number;
  cashflowBeforeInterest: number;
  cashflowAfterInterest: number;
  cashOnCash: number;
}

export function estimateProperty(input: CalculatorInput): CalculatorResult {
  const lookup = stateLookup(input.state);
  const price = Math.max(input.price, 0);
  const loan = Math.round((price * input.lvr) / 100);
  const deposit = price - loan;
  const lmi = lendersMortgageInsurance(price, input.lvr);

  const upfront: CostLine[] = [
    { label: "Stamp duty", amount: stampDuty(price, input.state), note: `${lookup.code} investor rate` },
    { label: "Legal & conveyancing", amount: lookup.conveyancing },
    { label: "Building & pest inspection", amount: lookup.buildingAndPest },
    { label: "Title transfer fee", amount: lookup.transferFee },
    { label: "Mortgage registration", amount: loan > 0 ? lookup.mortgageRegistrationFee : 0 },
    { label: "Lender's mortgage insurance", amount: lmi, note: `${input.lvr}% LVR` },
    { label: "Loan application & valuation", amount: loan > 0 ? 600 : 0 }
  ].filter((line) => line.amount > 0);

  const upfrontTotal = upfront.reduce((total, line) => total + line.amount, 0);

  const vacancyLoss = Math.round((input.annualRent / 52) * input.vacancyWeeks);
  const effectiveRent = Math.max(input.annualRent - vacancyLoss, 0);
  const councilRates = Math.round(Math.max((price * lookup.councilRatesPercent) / 100, lookup.councilRatesMinimum));
  const insurance = Math.round(Math.max((price * lookup.insurancePercent) / 100, lookup.insuranceMinimum));
  const strata = attachedDwelling(input.propertyType)
    ? suburbsForState(input.state).find((entry) => entry.suburb.toLowerCase() === input.suburb.trim().toLowerCase())
        ?.strataAnnual ?? 3_200
    : 0;

  const operating: CostLine[] = [
    {
      label: "Property management",
      amount: Math.round((effectiveRent * lookup.managementFeePercent) / 100),
      note: `${lookup.managementFeePercent}% of rent`
    },
    {
      label: "Letting & re-letting fees",
      amount: Math.round((input.annualRent / 52) * lookup.lettingWeeks),
      note: `${lookup.lettingWeeks} weeks rent`
    },
    { label: "Council rates", amount: councilRates },
    { label: "Water & sewerage", amount: lookup.waterAnnual },
    { label: "Building & landlord insurance", amount: insurance },
    { label: "Strata / body corporate", amount: strata },
    { label: "Land tax", amount: landTax(price, input.state), note: "On estimated land value" },
    {
      label: "Repairs & maintenance",
      amount: Math.round((input.annualRent * input.maintenancePercent) / 100),
      note: `${input.maintenancePercent}% of rent`
    },
    { label: "Vacancy allowance", amount: vacancyLoss, note: `${input.vacancyWeeks} weeks` }
  ].filter((line) => line.amount > 0);

  const operatingTotal = operating.reduce((total, line) => total + line.amount, 0);
  const interest = Math.round((loan * input.interestRate) / 100);
  const cashRequired = deposit + upfrontTotal - lmi;
  const cashflowBeforeInterest = input.annualRent - operatingTotal;

  return {
    deposit,
    loan,
    upfront,
    upfrontTotal,
    cashRequired,
    operating,
    operatingTotal,
    effectiveRent,
    interest,
    grossYield: price > 0 ? (input.annualRent / price) * 100 : 0,
    netYield: price > 0 ? (cashflowBeforeInterest / price) * 100 : 0,
    cashflowBeforeInterest,
    cashflowAfterInterest: cashflowBeforeInterest - interest,
    cashOnCash: cashRequired > 0 ? ((cashflowBeforeInterest - interest) / cashRequired) * 100 : 0
  };
}
