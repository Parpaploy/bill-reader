export interface LedgerRow {
  id: string;
  label: string;
  amount: string | null;
  isTotal: boolean;
  /** Set by the backend when Claude wasn't fully sure it read the handwriting correctly. */
  confidence?: "high" | "low";
}

export interface OcrResponse {
  rows: LedgerRow[];
  /** Raw JSON text Claude returned, kept around for debugging. */
  rawText: string;
}

export type ScanStatus = "idle" | "scanning" | "done" | "error";
