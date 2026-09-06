export interface RoofbookSheetTemplate {
  name: string;
  title: string;
  widths: number[];
}

export const roofbookTemplate = {
  workbookName: "Roofbook Portfolio Tax Tool",
  sheets: [
    {
      name: "Portfolio Summary",
      title: "Roofbook Portfolio Summary",
      widths: [28, 22]
    },
    {
      name: "Properties",
      title: "Roofbook Properties",
      widths: [24, 30, 16, 10, 10, 14, 14, 10, 10, 10, 14, 16, 16, 16, 16, 12, 16, 16, 16, 16, 16, 16, 16]
    },
    {
      name: "Purchase Details",
      title: "Roofbook Purchase Details",
      widths: [24, 14, 14, 16, 16, 16, 14, 16, 14, 14, 14, 14, 16, 16, 16, 14, 22, 18]
    },
    {
      name: "Finance & Offset",
      title: "Roofbook Finance and Offset",
      widths: [24, 18, 24, 16, 16, 16, 14, 22, 12, 12, 14, 14, 18, 22, 18]
    },
    {
      name: "Income",
      title: "Roofbook Income Register",
      widths: [14, 24, 20, 14, 14, 14, 16, 18, 16, 34]
    },
    {
      name: "Expenses",
      title: "Roofbook Expense Register",
      widths: [14, 24, 22, 24, 16, 14, 14, 18, 16, 34]
    },
    {
      name: "Tax Summary",
      title: "Roofbook Tax Summary",
      widths: [36, 20]
    },
    {
      name: "Contacts & Insurance",
      title: "Roofbook Contacts and Insurance",
      widths: [24, 22, 24, 24, 18, 30, 20, 16, 16, 34]
    },
    {
      name: "Reminders",
      title: "Roofbook Reminder Register",
      widths: [32, 22, 24, 14, 16, 18, 14, 34]
    },
    {
      name: "Documents",
      title: "Roofbook Document Register",
      widths: [32, 24, 18, 28, 14, 28, 14]
    }
  ] satisfies RoofbookSheetTemplate[]
} as const;

export function templateForSheet(name: string): RoofbookSheetTemplate | undefined {
  return roofbookTemplate.sheets.find((sheet) => sheet.name === name);
}
