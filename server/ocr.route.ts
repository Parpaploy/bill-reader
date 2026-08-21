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
นอกจากตารางรายการ บิลไทยมักมีส่วนหัว (ชื่อร้าน/วันที่/เลขที่บิล) และท้ายบิลมักมีช่อง "ผู้รับเงิน" พร้อมลายเซ็นหรือชื่อคนเขียนกำกับ

กติกาสำหรับรายการในตาราง:
1. "label" ให้เก็บข้อความภาษาไทยตามที่อ่านได้จากบรรทัดนั้น ไม่ต้องแปลเป็นอังกฤษ
2. "amount" คือจำนวนเงินท้ายบรรทัดนั้น (ตัวเลขล้วน ไม่มีคอมมา ไม่มีหน่วย) ถ้าไม่มีเลขในบรรทัดนั้นให้เป็น null
3. "unitPrice" คือตัวเลขในคอลัมน์ "หน่วยละ"/"ราคาต่อหน่วย" ของบรรทัดนั้น (ตัวเลขล้วน) ถ้าบิลไม่มีคอลัมน์นี้หรืออ่านไม่ออกให้เป็น null
4. ถ้าลายมือไม่ชัดจนไม่มั่นใจ ให้เดาที่สมเหตุสมผลที่สุดแล้วใส่ confidence เป็น "low"
   ถ้ามั่นใจว่าอ่านถูกให้ใส่ confidence เป็น "high"
5. อย่าใส่บรรทัดหัวตาราง/label ของฟอร์มพิมพ์ (เช่น "รายการ", "จำนวนเงิน", "ลำดับ") เป็น item — เอาเฉพาะรายการที่มีลายมือเขียนจริง
6. "total" คือยอดรวมท้ายบิล ถ้าไม่เห็นให้เป็น null

กติกาสำหรับหัวบิลและผู้รับเงิน (สำคัญ: บิลจริงมักกรอกไม่ครบทุกช่อง อย่าเดาช่องที่ไม่มีในภาพเด็ดขาด ให้ใส่ null แทนการเดา):
7. "header.shopName" คือชื่อร้าน/ชื่อกิจการเท่านั้น มักอยู่ในกล่องมุมบนซ้ายเหนือคำว่า "CASH SALE"/"บิลเงินสด"/"ใบเสร็จรับเงิน" หรือเป็นข้อความพิมพ์สำเร็จ (มักมีที่อยู่/เบอร์โทรกำกับ)
    - บิลเงินสดจำนวนมากช่องนี้เป็นกล่องเทาว่างเปล่า ไม่มีอะไรเขียนเลย → ให้เป็น null อย่าฝืนหาชื่อร้าน
    - ห้ามสับสนกับช่อง "นาม/CUSTOMER" (ช่องลูกค้า) เด็ดขาด — บางบิลช่องลูกค้ากลับถูกเขียนด้วยข้อมูลอื่น เช่น ทะเบียนรถ รุ่นรถ หรือเลขอ้างอิง ซึ่งไม่ใช่ชื่อร้านและไม่ใช่ผู้รับเงิน ไม่ต้องเก็บข้อมูลจากช่องนี้เป็น shopName
8. "header.date" คือวันที่บนบิล ให้ถอดตามที่อ่านได้ตรง ๆ ทั้งตัวเลขและตัวคั่น (เช่น "31/8/67", "9-2-67", "1 ก.พ. 69") อย่าแปลงรูปแบบหรือคำนวณปี ค.ศ./พ.ศ. เอง ถ้าไม่มีหรืออ่านไม่ออกให้เป็น null
9. "header.bookNumber" คือเล่มที่ (ช่อง "เล่มที่"/"BOOK NO.") กับ "header.billNumber" คือเลขที่บิล (ช่อง "เลขที่"/"BILL NO.") เป็นคนละช่องกัน อยู่ติดกันมุมบนขวาของบิลเสมอ ในบิลเงินสดที่เขียนมือทั้งสองช่องนี้มักว่างเปล่าเป็นเรื่องปกติมาก — ไม่ใช่ความผิดพลาด ให้เป็น null ตามจริง อย่าเดาเลขใดๆ ขึ้นมาเอง
10. "payee" คือชื่อ/ชื่อย่อผู้รับเงินตรงท้ายบิล (บรรทัด "ผู้รับเงิน"/"COLLECTOR") มีสองกรณีที่ต้องแยกให้ออก:
    - ถ้าเป็นลายเซ็นหวัดๆ ที่ไม่มีตัวอักษรให้อ่านได้เลย (แค่เส้นขีดเขียน) → null
    - ถ้าพอแยกแยะเป็นตัวอักษร/ชื่อย่อ/ฉายาได้บ้าง (แม้จะไม่ใช่ชื่อเต็มทางการ) → ถอดตามที่อ่านได้ และถ้าไม่มั่นใจว่าอ่านถูกให้ถอดแบบที่ใกล้เคียงที่สุด
    - อย่าใส่คำว่า "ผู้รับเงิน" หรือ "COLLECTOR" เฉยๆ (นั่นเป็น label ของฟอร์ม ไม่ใช่ชื่อคน)
11. "header.shopAddress" คือที่อยู่ร้าน มักพิมพ์อยู่ใต้ชื่อร้านในกล่องหัวบิล (อาจรวมเบอร์โทรที่อยู่ติดกันได้ถ้าอยู่บรรทัดเดียวกัน) บิลเงินสดที่เขียนมือส่วนใหญ่ไม่มีช่องนี้เลย → null
12. "header.commLicense" คือเลขทะเบียนการค้า (ช่อง "ทะเบียนการค้า"/"CommLicense"/"商標編號") ไม่ใช่ทะเบียนรถ ถ้าไม่มีตัวเลขกรอกในช่องนี้ให้เป็น null
13. "header.taxId" คือเลขประจำตัวผู้เสียภาษี (ช่อง "เลขประจำตัวผู้เสียภาษี"/"TAX IDENTIFICATION NO.") มักเป็นตัวเลข 13 หลักแบ่งเป็นช่องสี่เหลี่ยม ถ้าช่องว่างเปล่าไม่มีตัวเลขให้เป็น null
14. "header.idNumber" คือเลขประจำตัวประชาชน (ช่อง "เลขประจำตัวประชาชน"/"IDENTIFICATION NO.") แยกคนละช่องกับเลขผู้เสียภาษีแม้จะรูปแบบคล้ายกัน ให้ดูจาก label กำกับช่องนั้นๆ ถ้าว่างเปล่าให้เป็น null`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    header: {
      type: "object",
      properties: {
        shopName: { type: "string", nullable: true },
        shopAddress: { type: "string", nullable: true },
        date: { type: "string", nullable: true },
        bookNumber: { type: "string", nullable: true },
        billNumber: { type: "string", nullable: true },
        commLicense: { type: "string", nullable: true },
        taxId: { type: "string", nullable: true },
        idNumber: { type: "string", nullable: true },
      },
      required: [
        "shopName",
        "shopAddress",
        "date",
        "bookNumber",
        "billNumber",
        "commLicense",
        "taxId",
        "idNumber",
      ],
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          amount: { type: "number", nullable: true },
          unitPrice: { type: "number", nullable: true },
          confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["label", "amount", "unitPrice", "confidence"],
      },
    },
    total: { type: "number", nullable: true },
    payee: { type: "string", nullable: true },
  },
  required: ["header", "items", "total", "payee"],
};

interface GeminiBillItem {
  label: string;
  amount: number | null;
  unitPrice: number | null;
  confidence: "high" | "low";
}

interface GeminiBillHeader {
  shopName: string | null;
  shopAddress: string | null;
  date: string | null;
  bookNumber: string | null;
  billNumber: string | null;
  commLicense: string | null;
  taxId: string | null;
  idNumber: string | null;
}

interface GeminiBillResult {
  header: GeminiBillHeader | null;
  items: GeminiBillItem[];
  total: number | null;
  payee: string | null;
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
              {
                text: `${SYSTEM_PROMPT}\n\nอ่านหัวบิล รายการทั้งหมด และผู้รับเงินท้ายบิล (ถ้ามี) ในบิลนี้`,
              },
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
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : null,
      isTotal: false,
      confidence: item.confidence ?? "high",
    }));

    if (parsed.total != null) {
      rows.push({
        id: `total-${rows.length}`,
        label: "รวมเงิน",
        amount: String(parsed.total),
        unitPrice: null,
        isTotal: true,
        confidence: "high" as const,
      });
    }

    const header = parsed.header ?? {
      shopName: null,
      shopAddress: null,
      date: null,
      bookNumber: null,
      billNumber: null,
      commLicense: null,
      taxId: null,
      idNumber: null,
    };
    const payee = parsed.payee ?? null;

    return res.json({ rows, rawText, header, payee });
  } catch (err) {
    console.error("OCR handler error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
  }
}
