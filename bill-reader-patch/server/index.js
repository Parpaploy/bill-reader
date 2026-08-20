import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

app.use(cors());
app.use(express.json({ limit: "10mb" })); // bill photos can be a few MB

app.post("/api/ocr", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error:
        "ยังไม่ได้ตั้งค่า GOOGLE_CLOUD_VISION_API_KEY บนเซิร์ฟเวอร์ (ดูไฟล์ .env.example)",
    });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพ (imageBase64)" });
  }

  try {
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              // Thai + English hints help a lot on mixed-language handwritten bills
              imageContext: { languageHints: ["th", "en"] },
            },
          ],
        }),
      }
    );

    const data = await visionRes.json();

    if (!visionRes.ok) {
      const message = data?.error?.message || "Google Vision API เกิดข้อผิดพลาด";
      return res.status(visionRes.status).json({ error: message });
    }

    const annotation = data.responses?.[0];

    if (annotation?.error) {
      return res.status(400).json({ error: annotation.error.message });
    }

    const fullText = annotation?.fullTextAnnotation?.text ?? "";
    const lines = fullText.split("\n").filter((line) => line.trim().length > 0);

    // textAnnotations[0] is the whole-image summary; the rest are individual
    // word/token boxes. We send these so the frontend can reconstruct table
    // rows by Y-position instead of trusting Vision's raw reading order,
    // which often separates a receipt's label column from its amount column.
    const words = (annotation?.textAnnotations ?? [])
      .slice(1)
      .map((token) => {
        const vertices = token.boundingPoly?.vertices ?? [];
        const xs = vertices.map((v) => v.x ?? 0);
        const ys = vertices.map((v) => v.y ?? 0);
        return {
          text: token.description,
          x0: Math.min(...xs),
          x1: Math.max(...xs),
          y0: Math.min(...ys),
          y1: Math.max(...ys),
        };
      });

    return res.json({ fullText, lines, words });
  } catch (err) {
    console.error("Vision API request failed:", err);
    return res.status(502).json({ error: "เชื่อมต่อ Google Cloud Vision ไม่สำเร็จ" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(API_KEY) });
});

app.listen(PORT, () => {
  console.log(`OCR backend running at http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn(
      "⚠️  GOOGLE_CLOUD_VISION_API_KEY is not set — copy server/.env.example to server/.env and add your key."
    );
  }
});
