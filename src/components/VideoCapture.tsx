import { useEffect, useRef, useState } from "react";

export interface CapturedVideo {
  file: File | Blob;
  previewUrl: string;
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records a short clip via the device camera (works on desktop webcams too,
 * not just mobile — a plain `<input capture>` only triggers the native
 * camera app on phones) or falls back to picking an existing file. Reports
 * the final selection up to the parent the same way TrainScreen already
 * owns photoFile/photoPreviewUrl — this component never revokes the object
 * URL itself, the parent does, matching that existing pattern.
 */
export function VideoCapture({
  value,
  onChange,
  disabled,
}: {
  value: CapturedVideo | null;
  onChange: (video: CapturedVideo | null) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "requesting" | "live" | "recording">("idle");
  const [error, setError] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => stopStream, []);

  async function startCamera() {
    setError(null);
    setMode("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => {});
      }
      setMode("live");
    } catch (err) {
      console.error("Failed to access camera", err);
      setError("Couldn't access your camera/mic — check your browser's permission for this site.");
      setMode("idle");
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType ?? "video/webm" });
      const previewUrl = URL.createObjectURL(blob);
      stopStream();
      setMode("idle");
      onChange({ file: blob, previewUrl });
    };
    recorderRef.current = recorder;
    recorder.start();
    setMode("recording");
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function cancelLivePreview() {
    stopStream();
    setMode("idle");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ file, previewUrl: URL.createObjectURL(file) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <video
          src={value.previewUrl}
          controls
          className="h-24 w-24 rounded border border-zinc-700 object-cover"
        />
        <button
          onClick={() => onChange(null)}
          className="rounded border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
        >
          Remove
        </button>
      </div>
    );
  }

  if (mode === "live" || mode === "recording") {
    return (
      <div className="flex flex-col gap-2">
        <video
          ref={videoPreviewRef}
          muted
          playsInline
          className="w-full rounded border border-zinc-700 bg-black"
        />
        <div className="flex gap-2">
          {mode === "live" ? (
            <>
              <button
                onClick={startRecording}
                className="flex-1 rounded bg-orange-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
              >
                ● Start Recording
              </button>
              <button
                onClick={cancelLivePreview}
                className="rounded border border-zinc-700 px-3 py-2 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 animate-pulse rounded bg-red-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-600"
            >
              ■ Stop Recording
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        id="target-video-file-input"
      />
      <div className="flex gap-2">
        <button
          disabled={disabled || mode === "requesting"}
          onClick={startCamera}
          className="flex-1 rounded border border-dashed border-zinc-600 px-3 py-3 text-center text-sm text-zinc-400 enabled:hover:border-orange-700 enabled:hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "requesting" ? "Requesting camera…" : "🎥 Record Video"}
        </button>
        <label
          htmlFor="target-video-file-input"
          className={`flex-1 cursor-pointer rounded border border-dashed border-zinc-600 px-3 py-3 text-center text-sm text-zinc-400 hover:border-orange-700 hover:text-orange-400 ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Upload Video
        </label>
      </div>
      {error != null && <p className="text-xs text-amber-400">{error}</p>}
    </div>
  );
}
