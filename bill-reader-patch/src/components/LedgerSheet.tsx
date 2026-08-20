import { useState } from "react";
import type { LedgerRow, ScanStatus } from "../lib/types";
import { formatAmount } from "../lib/parseBill";

interface LedgerSheetProps {
  status: ScanStatus;
  rows: LedgerRow[];
  onRowsChange: (rows: LedgerRow[]) => void;
  fullText: string;
  errorMessage: string | null;
}

export default function LedgerSheet({
  status,
  rows,
  onRowsChange,
  fullText,
  errorMessage,
}: LedgerSheetProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const totalRow = rows.find((r) => r.isTotal && r.amount);

  function updateRow(id: string, patch: Partial<LedgerRow>) {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onRowsChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-brass uppercase">
            ขั้นตอนที่ 2
          </p>
          <h2 className="font-display text-xl text-ink mt-1">รายการที่อ่านได้</h2>
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="font-mono text-[11px] text-rule-soft underline underline-offset-4 hover:text-rule
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
          >
            {showRaw ? "ดูแบบรายการ" : "ดูข้อความดิบ"}
          </button>
        )}
      </div>

      <div className="ledger-lines paper-grain flex-1 rounded-sm border border-brass/30 bg-paper-dim/40 p-5 min-h-[320px]">
        {status === "idle" && rows.length === 0 && (
          <p className="font-body text-ink-soft/60 text-sm mt-2">
            ยังไม่มีข้อมูล — อัปโหลดและกดสแกนบิลทางด้านซ้ายก่อน
          </p>
        )}

        {status === "scanning" && (
          <p className="font-mono text-ink-soft text-sm animate-pulse">กำลังอ่านลายมือ…</p>
        )}

        {status === "error" && errorMessage && (
          <div className="animate-rise">
            <span className="inline-block font-display text-stamp border-2 border-stamp px-3 py-1 -rotate-2 text-sm">
              อ่านไม่สำเร็จ
            </span>
            <p className="font-body text-ink-soft text-sm mt-3">{errorMessage}</p>
          </div>
        )}

        {status === "done" && rows.length === 0 && (
          <p className="font-body text-ink-soft/70 text-sm">
            สแกนไม่พบตัวอักษรในภาพนี้ ลองถ่ายให้ชัดขึ้นหรือแสงสว่างขึ้น
          </p>
        )}

        {status === "done" && rows.length > 0 && !showRaw && (
          <>
            <p className="font-mono text-[10px] text-ink-soft/50 mb-2">
              คลิกที่รายการเพื่อแก้ไข หากอ่านผิด
            </p>
            <ul className="flex flex-col">
              {rows.map((row, i) => (
                <li
                  key={row.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={[
                    "animate-rise group flex items-baseline justify-between gap-3 py-2",
                    "border-b border-rule/15 last:border-b-0",
                    row.isTotal ? "mt-1" : "",
                  ].join(" ")}
                >
                  {editingId === row.id ? (
                    <>
                      <input
                        autoFocus
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                        className="font-body text-sm bg-paper border border-rule/40 rounded-sm px-2 py-1 flex-1
                                   focus:outline-none focus:border-rule"
                      />
                      <input
                        value={row.amount ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, { amount: e.target.value.replace(/[^\d.]/g, "") })
                        }
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                        placeholder="0.00"
                        className="font-mono text-sm bg-paper border border-rule/40 rounded-sm px-2 py-1 w-24 text-right
                                   focus:outline-none focus:border-rule"
                      />
                      <button
                        onClick={() => removeRow(row.id)}
                        aria-label="ลบรายการนี้"
                        className="font-mono text-xs text-stamp/70 hover:text-stamp px-1"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(row.id)}
                        className={[
                          "font-body text-sm leading-snug text-left flex-1 rounded-sm px-1 -mx-1",
                          "hover:bg-rule/10 transition-colors",
                          row.isTotal ? "font-semibold text-ink" : "text-ink-soft",
                        ].join(" ")}
                      >
                        {row.label}
                      </button>
                      <button
                        onClick={() => setEditingId(row.id)}
                        className={[
                          "font-mono text-sm whitespace-nowrap tabular-nums rounded-sm px-1 -mx-1",
                          "hover:bg-rule/10 transition-colors",
                          row.isTotal ? "text-stamp font-semibold" : "text-ink",
                        ].join(" ")}
                      >
                        {row.amount ? formatAmount(row.amount) : "—"}
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        aria-label="ลบรายการนี้"
                        className="font-mono text-xs text-stamp/0 group-hover:text-stamp/70 hover:text-stamp px-1
                                   transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {status === "done" && showRaw && (
          <pre className="font-mono text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
            {fullText || "(ไม่มีข้อความ)"}
          </pre>
        )}
      </div>

      {totalRow && (
        <div className="flex justify-end">
          <div className="animate-rise inline-flex items-center gap-3 border-2 border-stamp rounded-sm px-4 py-2 rotate-[-1.5deg]">
            <span className="font-display text-xs text-stamp tracking-widest uppercase">
              ยอดรวม
            </span>
            <span className="font-mono text-lg text-stamp font-semibold">
              {formatAmount(totalRow.amount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
