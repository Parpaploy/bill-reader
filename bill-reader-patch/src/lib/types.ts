export interface OcrWord {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface OcrResponse {
  fullText: string;
  lines: string[];
  words: OcrWord[];
}

export interface LedgerRow {
  id: string;
  label: string;
  amount: string | null;
  isTotal: boolean;
}

export type ScanStatus = "idle" | "scanning" | "done" | "error";
