import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleOcrRequest } from "./ocr.route";

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" })); // รูปบิล base64 อาจใหญ่กว่า default 1mb

app.post("/api/ocr", handleOcrRequest);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
