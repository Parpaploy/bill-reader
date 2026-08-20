import { useCallback, useRef, useState } from "react";
import type { ScanStatus } from "../lib/types";

export default function ScannerSlot({
  imagePreview,
  status,
  onFileSelected,
  onScan,
  onReset,
}: {
  imagePreview: string | null;
  status: ScanStatus;
  onFileSelected: (file: File) => void;
  onScan: () => void;
  onReset: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-display text-xs tracking-[0.2em] text-brass uppercase">
          ขั้นตอนที่ 1
        </p>
        <h2 className="font-display text-xl text-ink mt-1">
          สอดบิลเข้าเครื่องสแกน
        </h2>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !imagePreview && inputRef.current?.click()}
        className={[
          "relative overflow-hidden rounded-sm border-2 border-dashed",
          "min-h-80 flex items-center justify-center bg-slot",
          "transition-colors duration-200",
          isDragging ? "border-stamp-soft" : "border-brass/60",
          !imagePreview ? "cursor-pointer" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />

        {!imagePreview && (
          <div className="text-center px-8 py-16 select-none">
            <div className="mx-auto mb-4 h-12 w-20 rounded-xs border-2 border-paper-dim/40 relative">
              <div className="absolute inset-x-3 -top-1 h-1 bg-paper-dim/40 rounded-full" />
            </div>
            <p className="font-body text-paper-dim text-sm leading-relaxed">
              ลากรูปบิลมาวางที่นี่ หรือ
              <br />
              <span className="text-stamp-soft underline underline-offset-4">
                เลือกไฟล์จากเครื่อง
              </span>
            </p>
            <p className="font-mono text-[11px] text-paper-dim/50 mt-3">
              JPG · PNG · WEBP
            </p>
          </div>
        )}

        {imagePreview && (
          <>
            <img
              src={imagePreview}
              alt="ตัวอย่างบิลที่อัปโหลด"
              className="max-h-105 w-full object-contain"
            />
            {status === "scanning" && (
              <div
                aria-hidden
                className="animate-sweep pointer-events-none absolute inset-x-0 h-16"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-stamp-soft) 55%, transparent), transparent)",
                }}
              />
            )}
          </>
        )}
      </div>

      {imagePreview && (
        <div className="flex gap-3">
          <button
            onClick={onScan}
            disabled={status === "scanning"}
            className="flex-1 font-display text-sm tracking-wide bg-rule text-paper py-3 rounded-sm
                       hover:bg-rule-soft transition-colors disabled:opacity-50 disabled:cursor-wait
                       focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
          >
            {status === "scanning" ? "กำลังสแกน…" : "สแกนบิล"}
          </button>
          <button
            onClick={onReset}
            className="font-body text-sm text-ink-soft border border-ink-soft/30 px-4 rounded-sm
                       hover:bg-ink-soft/10 transition-colors
                       focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
          >
            เปลี่ยนรูป
          </button>
        </div>
      )}
    </div>
  );
}
