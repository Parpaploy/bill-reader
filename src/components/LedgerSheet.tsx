import { useState } from "react";
import type { BillHeader, LedgerRow, ScanStatus } from "../lib/types";
import { formatAmount } from "../lib/parseBill";

export default function LedgerSheet({
  status,
  rows,
  onRowsChange,
  fullText,
  errorMessage,
  header,
  payee,
  onHeaderChange,
  onPayeeChange,
}: {
  status: ScanStatus;
  rows: LedgerRow[];
  onRowsChange: (rows: LedgerRow[]) => void;
  fullText: string;
  errorMessage: string | null;
  header: BillHeader | null;
  payee: string | null;
  onHeaderChange: (header: BillHeader) => void;
  onPayeeChange: (payee: string | null) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHeaderField, setEditingHeaderField] = useState<
    keyof BillHeader | "payee" | null
  >(null);
  const totalRow = rows.find((r) => r.isTotal && r.amount);

  function updateRow(id: string, patch: Partial<LedgerRow>) {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onRowsChange(rows.filter((r) => r.id !== id));
  }

  function updateHeaderField(field: keyof BillHeader, value: string) {
    const base: BillHeader = header ?? {
      shopName: null,
      shopAddress: null,
      date: null,
      bookNumber: null,
      billNumber: null,
      commLicense: null,
      taxId: null,
      idNumber: null,
    };
    onHeaderChange({ ...base, [field]: value === "" ? null : value });
  }

  function handleRowBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setEditingId(null);
    }
  }

  const headerFields: { key: keyof BillHeader; label: string }[] = [
    { key: "shopName", label: "ชื่อร้าน" },
    { key: "date", label: "วันที่" },
    { key: "bookNumber", label: "เล่มที่" },
    { key: "billNumber", label: "เลขที่" },
    { key: "shopAddress", label: "ที่อยู่ร้าน" },
    { key: "commLicense", label: "ทะเบียนการค้า" },
    { key: "taxId", label: "เลขผู้เสียภาษี" },
    { key: "idNumber", label: "เลขประชาชน" },
  ];

  const hasHeaderData = status === "done" && (!!header || payee !== undefined);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-brass uppercase">
            ขั้นตอนที่ 2
          </p>
          <h2 className="font-display text-xl text-ink mt-1">
            รายการที่อ่านได้
          </h2>
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="font-mono text-[11px] text-rule-soft underline underline-offset-4 hover:text-rule
                       focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
          >
            {showRaw ? "ดูแบบรายการ" : "ดูข้อความดิบ"}
          </button>
        )}
      </div>

      {status === "done" && !showRaw && hasHeaderData && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink-soft/70 border-b border-rule/15 pb-3">
          {headerFields.map(({ key, label }) => (
            <div key={key} className="flex items-baseline gap-1">
              <span className="text-ink-soft/40">{label}:</span>
              {editingHeaderField === key ? (
                <input
                  autoFocus
                  value={header?.[key] ?? ""}
                  onChange={(e) => updateHeaderField(key, e.target.value)}
                  onBlur={() => setEditingHeaderField(null)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setEditingHeaderField(null)
                  }
                  className="bg-paper border border-rule/40 rounded-sm px-1.5 py-0.5 text-ink
                             focus:outline-none focus:border-rule w-32"
                />
              ) : (
                <button
                  onClick={() => setEditingHeaderField(key)}
                  className={[
                    "rounded-sm px-1 -mx-1 hover:bg-rule/10 transition-colors",
                    header?.[key] ? "text-ink" : "italic text-ink-soft/40",
                  ].join(" ")}
                >
                  {header?.[key] || "ไม่ได้กรอก"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="ledger-lines paper-grain flex-1 rounded-sm border border-brass/30 bg-paper-dim/40 p-5 min-h-80">
        {status === "idle" && rows.length === 0 && (
          <p className="font-body text-ink-soft/60 text-sm mt-2">
            ยังไม่มีข้อมูล — อัปโหลดและกดสแกนบิลทางด้านซ้ายก่อน
          </p>
        )}

        {status === "scanning" && (
          <p className="font-mono text-ink-soft text-sm animate-pulse">
            กำลังอ่านลายมือ…
          </p>
        )}

        {status === "error" && errorMessage && (
          <div className="animate-rise">
            <span className="inline-block font-display text-stamp border-2 border-stamp px-3 py-1 -rotate-2 text-sm">
              อ่านไม่สำเร็จ
            </span>
            <p className="font-body text-ink-soft text-sm mt-3">
              {errorMessage}
            </p>
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
                    <div
                      className="flex items-baseline justify-between gap-3 w-full"
                      onBlur={handleRowBlur}
                    >
                      <input
                        autoFocus
                        value={row.label}
                        onChange={(e) =>
                          updateRow(row.id, { label: e.target.value })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingId(null)
                        }
                        className="font-body text-sm bg-paper border border-rule/40 rounded-sm px-2 py-1 flex-1
                 focus:outline-none focus:border-rule"
                      />
                      <input
                        value={row.unitPrice ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            unitPrice: e.target.value.replace(/[^\d.]/g, ""),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingId(null)
                        }
                        placeholder="หน่วยละ"
                        className="font-mono text-xs bg-paper border border-rule/40 rounded-sm px-2 py-1 w-20 text-right
                 text-ink-soft/70 focus:outline-none focus:border-rule"
                      />
                      <input
                        value={row.amount ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            amount: e.target.value.replace(/[^\d.]/g, ""),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingId(null)
                        }
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
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(row.id)}
                        className={[
                          "font-body text-sm leading-snug text-left flex-1 rounded-sm px-1 -mx-1",
                          "hover:bg-rule/10 transition-colors",
                          row.isTotal
                            ? "font-semibold text-ink"
                            : "text-ink-soft",
                        ].join(" ")}
                      >
                        {row.label}
                      </button>
                      {!row.isTotal && (
                        <button
                          onClick={() => setEditingId(row.id)}
                          className="font-mono text-xs text-ink-soft/50 whitespace-nowrap tabular-nums rounded-sm px-1 -mx-1
                   hover:bg-rule/10 transition-colors"
                        >
                          {row.unitPrice
                            ? `@${formatAmount(row.unitPrice)}`
                            : "@ หน่วยละ"}
                        </button>
                      )}
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

      {status === "done" && !showRaw && (
        <div className="flex items-baseline gap-2 justify-end font-mono text-xs text-ink-soft/70 pt-1">
          <span className="text-ink-soft/40">ผู้รับเงิน:</span>
          {editingHeaderField === "payee" ? (
            <input
              autoFocus
              value={payee ?? ""}
              onChange={(e) => onPayeeChange(e.target.value || null)}
              onBlur={() => setEditingHeaderField(null)}
              onKeyDown={(e) =>
                e.key === "Enter" && setEditingHeaderField(null)
              }
              className="bg-paper border border-rule/40 rounded-sm px-1.5 py-0.5 text-ink
                         focus:outline-none focus:border-rule w-32"
            />
          ) : (
            <button
              onClick={() => setEditingHeaderField("payee")}
              className={[
                "rounded-sm px-1 -mx-1 hover:bg-rule/10 transition-colors",
                payee ? "text-ink" : "italic text-ink-soft/40",
              ].join(" ")}
            >
              {payee || "ไม่ได้กรอก"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
