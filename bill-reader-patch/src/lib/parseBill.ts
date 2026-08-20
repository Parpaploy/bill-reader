import type { LedgerRow, OcrWord } from "./types";

// A standalone number token: 1,234.50 / 350 / 350.- / ฿350
const AMOUNT_TOKEN = /^\(?฿?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:บาท|฿|\.-|-)?\)?$/;

const TOTAL_WORDS = ["รวม", "ยอดรวม", "ทั้งหมด", "total", "grand total", "sum"];

interface WordRow {
  words: OcrWord[];
}

/**
 * Groups OCR word boxes into visual rows by Y-position, the way a person
 * reading a table would — rather than trusting Vision's raw text line
 * breaks, which often list an entire label column before the amount
 * column on a tabular receipt.
 */
function groupWordsIntoRows(words: OcrWord[]): WordRow[] {
  if (words.length === 0) return [];

  const withCenters = words.map((w) => ({
    word: w,
    yCenter: (w.y0 + w.y1) / 2,
    height: Math.max(w.y1 - w.y0, 1),
  }));

  withCenters.sort((a, b) => a.yCenter - b.yCenter);

  const rows: { items: typeof withCenters; yCenter: number; height: number }[] = [];

  for (const item of withCenters) {
    const openRow = rows.find(
      (row) => Math.abs(item.yCenter - row.yCenter) <= Math.max(row.height, item.height) * 0.6
    );

    if (openRow) {
      openRow.items.push(item);
      openRow.yCenter =
        openRow.items.reduce((sum, i) => sum + i.yCenter, 0) / openRow.items.length;
      openRow.height = Math.max(openRow.height, item.height);
    } else {
      rows.push({ items: [item], yCenter: item.yCenter, height: item.height });
    }
  }

  rows.sort((a, b) => a.yCenter - b.yCenter);

  return rows.map((row) => ({
    words: row.items.sort((a, b) => a.word.x0 - b.word.x0).map((i) => i.word),
  }));
}

/**
 * Turns OCR word boxes into ledger rows: reconstructs each table row from
 * its Y-position, then treats the right-most number-looking token in that
 * row as the amount and everything before it as the label.
 */
export function parseBillWords(words: OcrWord[]): LedgerRow[] {
  const rows = groupWordsIntoRows(words);

  return rows
    .map((row, index): LedgerRow | null => {
      const tokens = row.words;
      if (tokens.length === 0) return null;

      let amount: string | null = null;
      let labelTokens = tokens;

      const last = tokens[tokens.length - 1];
      if (AMOUNT_TOKEN.test(last.text)) {
        const match = last.text.match(AMOUNT_TOKEN);
        amount = match ? match[1].replace(/,/g, "") : null;
        labelTokens = tokens.slice(0, -1);
      }

      const label = labelTokens.map((t) => t.text).join(" ").trim() || last.text;
      const lowered = label.toLowerCase();
      const isTotal = TOTAL_WORDS.some((w) => lowered.includes(w));

      if (!label && !amount) return null;

      return {
        id: `${index}-${label.slice(0, 8)}`,
        label,
        amount,
        isTotal,
      };
    })
    .filter((row): row is LedgerRow => row !== null);
}

export function formatAmount(amount: string | null): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
