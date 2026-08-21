import { useCallback, useEffect, useRef, useState } from "react";

export default function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const generationRef = useRef(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    const myGeneration = ++generationRef.current;
    setIsStarting(true);
    setError(null);
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (myGeneration !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          if (
            !(playErr instanceof DOMException && playErr.name === "AbortError")
          ) {
            throw playErr;
          }
        }
      }
    } catch (err) {
      if (myGeneration !== generationRef.current) return;
      console.error("Camera error:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ แล้วลองใหม่",
        );
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("ไม่พบกล้องบนอุปกรณ์นี้");
      } else if (
        err instanceof DOMException &&
        err.name === "NotReadableError"
      ) {
        setError(
          "กล้องกำลังถูกโปรแกรมอื่นใช้งานอยู่ ลองปิดแอป/แท็บอื่นที่ใช้กล้องแล้วลองใหม่",
        );
      } else {
        setError("เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง หรือเลือกไฟล์แทน");
      }
    } finally {
      if (myGeneration === generationRef.current) setIsStarting(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      generationRef.current++;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleShutter() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    stopStream();
  }

  function handleRetake() {
    setCapturedDataUrl(null);
    startCamera();
  }

  async function handleConfirm() {
    if (!capturedDataUrl) return;
    const res = await fetch(capturedDataUrl);
    const blob = await res.blob();
    const file = new File([blob], `bill-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/90 flex flex-col items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xs tracking-[0.2em] text-brass uppercase">
            ถ่ายรูปบิล
          </p>
          <button
            onClick={handleClose}
            className="font-mono text-[11px] text-paper-dim hover:text-paper-dim/80 transition-colors
                       focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
          >
            ปิด ✕
          </button>
        </div>

        <div className="relative overflow-hidden rounded-sm border-2 border-brass/60 bg-slot aspect-3/4">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
              <p className="font-body text-paper-dim text-sm leading-relaxed">
                {error}
              </p>
            </div>
          ) : capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="รูปที่ถ่าย"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[11px] text-paper-dim/70">
                กำลังเปิดกล้อง...
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          {error ? (
            <button
              onClick={startCamera}
              className="font-display text-sm tracking-wide bg-rule text-paper px-5 py-3 rounded-sm
                         hover:bg-rule-soft transition-colors
                         focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
            >
              ลองใหม่
            </button>
          ) : capturedDataUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="font-body text-sm text-ink-soft border border-ink-soft/30 px-4 py-3 rounded-sm
                           hover:bg-ink-soft/10 transition-colors
                           focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
              >
                ถ่ายใหม่
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 font-display text-sm tracking-wide bg-rule text-paper py-3 rounded-sm
                           hover:bg-rule-soft transition-colors
                           focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
              >
                ใช้รูปนี้
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  setFacingMode((m) =>
                    m === "environment" ? "user" : "environment",
                  )
                }
                className="font-mono text-[11px] text-paper-dim border border-paper-dim/30 px-3 py-3 rounded-sm
                           hover:bg-paper-dim/10 transition-colors"
                title="สลับกล้อง"
              >
                สลับกล้อง
              </button>
              <button
                onClick={handleShutter}
                disabled={isStarting}
                className="w-16 h-16 rounded-full bg-paper border-4 border-brass disabled:opacity-40
                           focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2"
                aria-label="ถ่ายรูป"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
