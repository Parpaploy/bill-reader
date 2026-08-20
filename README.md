# Bill Ledger OCR — Gemini (free tier) version

## ติดตั้ง

1. สมัคร API key ฟรีที่ https://aistudio.google.com/apikey (ไม่ต้องผูกบัตร)
2. ตั้ง env var ที่ backend: `GEMINI_API_KEY=your_key_here`
3. Mount route (ตัวอย่าง Express):
   ```ts
   import { handleOcrRequest } from "./server/ocr.route";
   app.post("/api/ocr", handleOcrRequest);
   ```
   ถ้าใช้ framework อื่น (Next.js API route, Fastify ฯลฯ) ปรับ export ให้ตรง signature ของ framework นั้น

## ไฟล์ในนี้

- `server/ocr.route.ts` — backend endpoint เรียก Gemini vision API, คืนค่า { rows, rawText }
- `App.tsx` — หน้าหลักของแอป แก้ handleScan ให้ส่ง mediaType และใช้ rows จาก backend ตรงๆ
- `lib/fileToBase64.ts` — helper แปลงรูปเป็น base64 + ดึง mediaType
- `lib/types.ts` — type ของ LedgerRow / OcrResponse (มี field confidence เพิ่มมา)

## หมายเหตุเรื่อง free tier

Gemini free tier limit เปลี่ยนได้โดย Google ไม่แจ้งล่วงหน้า ให้เช็คของจริงที่ Google AI Studio
ถ้า error 429 (เกิน quota) backend จะส่งข้อความแจ้งเตือนภาษาไทยกลับไปให้ผู้ใช้อัตโนมัติ
