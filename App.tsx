import { useState } from "react";
import ScannerSlot from "./components/ScannerSlot";
import LedgerSheet from "./components/LedgerSheet";
import { fileToBase64, stripDataUrlPrefix, getMediaTypeFromDataUrl } from "./lib/fileToBase64";
import type { LedgerRow, OcrResponse, ScanStatus } from "./lib/types";

export default function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [fullText, setFullText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    const dataUrl = await fileToBase64(file);
    setImagePreview(dataUrl);
    setStatus("idle");
    setRows([]);
    setFullText("");
    setErrorMessage(null);
  }

  function handleReset() {
    setImagePreview(null);
    setStatus("idle");
    setRows([]);
    setFullText("");
    setErrorMessage(null);
  }

  async function handleScan() {
    if (!imagePreview) return;
    setStatus("scanning");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: stripDataUrlPrefix(imagePreview),
          mediaType: getMediaTypeFromDataUrl(imagePreview),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`);
      }

      const data: OcrResponse = await res.json();
      setFullText(data.rawText);
      setRows(data.rows);
      setStatus("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่ารัน backend อยู่หรือไม่"
      );
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-brass/30 px-6 py-8 md:px-12">
        <p className="font-mono text-[11px] text-brass tracking-[0.3em] uppercase">
          Bill Ledger OCR
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-2">สมุดบัญชีลายมือ</h1>
        <p className="font-body text-ink-soft text-sm mt-2 max-w-xl">
          ถ่ายรูปบิลลายมือ แล้วให้ระบบอ่านรายการและยอดเงินให้อัตโนมัติ
          ขับเคลื่อนด้วย Claude Vision
        </p>
      </header>

      <main className="px-6 py-10 md:px-12 grid gap-10 md:grid-cols-2 max-w-6xl mx-auto">
        <ScannerSlot
          imagePreview={imagePreview}
          status={status}
          onFileSelected={handleFileSelected}
          onScan={handleScan}
          onReset={handleReset}
        />
        <LedgerSheet
          status={status}
          rows={rows}
          onRowsChange={setRows}
          fullText={fullText}
          errorMessage={errorMessage}
        />
      </main>

      <footer className="px-6 pb-10 md:px-12 max-w-6xl mx-auto">
        <p className="font-mono text-[11px] text-ink-soft/50">
          รูปภาพถูกส่งไปยัง Claude API เพื่อประมวลผลเท่านั้น ไม่มีการบันทึกถาวรฝั่งเซิร์ฟเวอร์นี้
        </p>
      </footer>
    </div>
  );
}
