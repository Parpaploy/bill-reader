export interface LedgerRow {
  id: string;
  label: string;
  quantity: string | null;
  amount: string | null;
  unitPrice: string | null;
  isTotal: boolean;
  confidence?: "high" | "low";

  mathMismatch?: boolean;
}

export interface BillHeader {
  shopName: string | null;
  shopAddress: string | null;
  date: string | null;
  bookNumber: string | null;
  billNumber: string | null;
  commLicense: string | null;
  taxId: string | null;
  idNumber: string | null;
}

export interface OcrResponse {
  rows: LedgerRow[];
  rawText: string;
  header?: BillHeader | null;
  payee?: string | null;
  totalMismatch?: boolean;
}

export type ScanStatus = "idle" | "scanning" | "done" | "error";
