import type { Request, Response } from "express";

// Free tier: flash-lite has the most generous free daily quota.
// Swap to "gemini-3.5-flash" if you want higher quality and still-free (lower daily limit).
// Google retires model names over time — if this 404s again, check
// https://ai.google.dev/gemini-api/docs/models for the current name.
const MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยอ่านบิล/ใบเสร็จลายมือภาษาไทยที่ถ่ายมาจากกล้อง
งานของคุณคือ "อ่านและตีความ" บิลเหมือนคนที่คุ้นเคยกับบิลเงินสดร้านค้าไทยทั่วไป
(มีคอลัมน์ รายการ, จำนวน, ราคาต่อหน่วย (หน่วยละ), จำนวนเงิน, รวมเงิน)

กติกา:
1. "label" ให้เก็บข้อความภาษาไทยตามที่อ่านได้จากบรรทัดนั้น ไม่ต้องแปลเป็นอังกฤษ
2. "amount" คือจำนวนเงินท้ายบรรทัดนั้น (ตัวเลขล้วน ไม่มีคอมมา ไม่มีหน่วย) ถ้าไม่มีเลขในบรรทัดนั้นให้เป็น null
3. "unitPrice" คือตัวเลขในคอลัมน์ "หน่วยละ"/"ราคาต่อหน่วย" ของบรรทัดนั้น (ตัวเลขล้วน) ถ้าบิลไม่มีคอลัมน์นี้หรืออ่านไม่ออกให้เป็น null
4. ถ้าลายมือไม่ชัดจนไม่มั่นใจ ให้เดาที่สมเหตุสมผลที่สุดแล้วใส่ confidence เป็น "low"
   ถ้ามั่นใจว่าอ่านถูกให้ใส่ confidence เป็น "high"
5. อย่าใส่บรรทัดหัวตาราง/label ของฟอร์มพิมพ์ (เช่น "รายการ", "จำนวนเงิน", "ลำดับ") เป็น item — เอาเฉพาะรายการที่มีลายมือเขียนจริง
6. "total" คือยอดรวมท้ายบิล ถ้าไม่เห็นให้เป็น null`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          amount: { type: "number", nullable: true },
          unitPrice: { type: "number", nullable: true }, // ← เพิ่ม
          confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["label", "amount", "unitPrice", "confidence"],
      },
    },
    total: { type: "number", nullable: true },
  },
  required: ["items", "total"],
};

interface GeminiBillItem {
  label: string;
  amount: number | null;
  unitPrice: number | null; // ← เพิ่ม
  confidence: "high" | "low";
}

interface GeminiBillItem {
  label: string;
  amount: number | null;
  confidence: "high" | "low";
}

interface GeminiBillResult {
  items: GeminiBillItem[];
  total: number | null;
}

export async function handleOcrRequest(req: Request, res: Response) {
  try {
    const { imageBase64, mediaType } = req.body as {
      imageBase64?: string;
      mediaType?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพ (imageBase64)" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GEMINI_API_KEY" });
    }

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PROMPT}\n\nอ่านรายการทั้งหมดในบิลนี้` },
              {
                inline_data: {
                  mime_type: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API error:", response.status, errBody);
      if (response.status === 429) {
        return res.status(429).json({
          error: "เกิน quota ฟรีของ Gemini ในตอนนี้ ลองใหม่อีกครั้งภายหลัง",
        });
      }
      return res.status(502).json({ error: "เรียก Gemini API ไม่สำเร็จ" });
    }

    const data = await response.json();
    const rawText: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: GeminiBillResult;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini JSON response:", rawText);
      return res
        .status(502)
        .json({ error: "อ่านผลลัพธ์จาก Gemini ไม่สำเร็จ ลองสแกนใหม่อีกครั้ง" });
    }

    const rows = (parsed.items ?? []).map((item, index) => ({
      id: `${index}-${item.label.slice(0, 8)}`,
      label: item.label,
      amount: item.amount != null ? String(item.amount) : null,
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : null, // ← เพิ่ม
      isTotal: false,
      confidence: item.confidence ?? "high",
    }));

    if (parsed.total != null) {
      rows.push({
        id: `total-${rows.length}`,
        label: "รวมเงิน",
        amount: String(parsed.total),
        unitPrice: null, // ← เพิ่ม (แถวรวมไม่มีหน่วยละ)
        isTotal: true,
        confidence: "high" as const,
      });
    }

    return res.json({ rows, rawText });
  } catch (err) {
    console.error("OCR handler error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
  }
}
