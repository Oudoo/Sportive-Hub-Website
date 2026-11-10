"use client";

import { useEffect, useRef, useState } from "react";
import { useClientFlag } from "@/components/useClientFlag";

type Detected = { rawValue: string };
type DetectorCtor = new (options?: { formats?: string[] }) => { detect(source: HTMLVideoElement): Promise<Detected[]> };

function detectorOf(): DetectorCtor | null {
  return (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null;
}

/** True where the browser can read QR codes from the camera (Chrome, Edge, Android, recent Safari). */
export function useCameraSupport(): boolean {
  return useClientFlag(() => !!detectorOf() && !!navigator.mediaDevices?.getUserMedia);
}

/** Live camera preview that reports each QR code it sees (the same value at most once every few seconds). */
export function CameraScanner({ active, onDetect, className }: { active: boolean; onDetect: (text: string) => void; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callback = useRef(onDetect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callback.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    const video = videoRef.current;
    const Detector = detectorOf();
    if (!active || !video || !Detector || !navigator.mediaDevices?.getUserMedia) return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    let lastValue = "";
    let lastAt = 0;
    const detector = new Detector({ formats: ["qr_code"] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.srcObject = media;
        await video.play();
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const hit = codes.find((code) => code.rawValue);
              if (hit && (hit.rawValue !== lastValue || Date.now() - lastAt > 4000)) {
                lastValue = hit.rawValue;
                lastAt = Date.now();
                callback.current(hit.rawValue);
              }
            }
          } catch {
            /* a frame that could not be decoded */
          }
          timer = window.setTimeout(tick, 350);
        };
        void tick();
      })
      .catch((err: unknown) => {
        const refused = err instanceof Error && err.name === "NotAllowedError";
        setError(refused ? "Camera access was refused. Allow the camera in the browser settings, or type the code." : "The camera could not be started. Type the code instead.");
      });

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [active]);

  return (
    <div className={className}>
      <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-xl bg-ink object-cover" />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
