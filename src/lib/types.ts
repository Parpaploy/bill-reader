export interface LedgerRow {
  id: string;
  label: string;
  amount: string | null;
  unitPrice: string | null;
  isTotal: boolean;
  confidence?: "high" | "low";
}

export interface OcrResponse {
  rows: LedgerRow[];
  rawText: string;
}

export type ScanStatus = "idle" | "scanning" | "done" | "error";
