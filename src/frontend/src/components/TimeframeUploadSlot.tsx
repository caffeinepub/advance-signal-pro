import { Button } from "@/components/ui/button";
import { Camera, Clipboard, RefreshCw, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import type { TimeframeKey } from "../hooks/useMultiTimeframeUpload";

interface TimeframeUploadSlotProps {
  timeframe: TimeframeKey;
  file: File | null;
  onImageChange: (timeframe: TimeframeKey, file: File) => void;
  onImageRemove: (timeframe: TimeframeKey) => void;
  isActive: boolean;
  onActivate: (timeframe: TimeframeKey) => void;
}

const TIMEFRAME_LABELS: Record<TimeframeKey, string> = {
  M1: "1 Minuto",
  M3: "3 Minutos",
  M5: "5 Minutos",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function TimeframeUploadSlot({
  timeframe,
  file,
  onImageChange,
  onImageRemove,
  isActive,
  onActivate,
}: TimeframeUploadSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    isActive: cameraActive,
    isLoading,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "environment" });

  // Build preview URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  // Start/stop camera when showCamera changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: startCamera/stopCamera are stable refs from useCamera
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showCamera]);

  const validateAndSet = useCallback(
    (f: File) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }
      onImageChange(timeframe, f);
    },
    [timeframe, onImageChange],
  );

  // Global paste listener — only fires when this slot is active
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            validateAndSet(f);
            toast.success(`Imagem colada em ${timeframe}`);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [isActive, timeframe, validateAndSet]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) validateAndSet(f);
  };

  // Inline paste handler for the drop zone (fallback for React synthetic events)
  const handleDropZonePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) {
          validateAndSet(f);
          toast.success(`Imagem colada em ${timeframe}`);
          break;
        }
      }
    }
  };

  const handleCapture = async () => {
    const captured = await capturePhoto();
    if (captured) {
      validateAndSet(captured);
      setShowCamera(false);
      toast.success(`Foto capturada para ${timeframe}`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageRemove(timeframe);
    setShowCamera(false);
  };

  // Clicking the "Colar" button: activate this slot and try to read clipboard
  const handlePasteButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onActivate(timeframe);

    // Try Clipboard API first (modern browsers)
    try {
      if (navigator.clipboard?.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type.startsWith("image/")) {
              const blob = await clipboardItem.getType(type);
              const f = new File([blob], `paste-${timeframe}.png`, { type });
              validateAndSet(f);
              toast.success(`Imagem colada em ${timeframe}`);
              return;
            }
          }
        }
        // No image found in clipboard
        toast.info(`Slot ${timeframe} ativo — pressione Ctrl+V para colar`);
      } else {
        toast.info(`Slot ${timeframe} ativo — pressione Ctrl+V para colar`);
      }
    } catch {
      // Permission denied or no image — just activate the slot
      toast.info(`Slot ${timeframe} ativo — pressione Ctrl+V para colar`);
    }
  };

  // Clicking anywhere on the slot card activates it as paste target
  const handleSlotClick = () => {
    onActivate(timeframe);
  };

  // Badge / border colors per timeframe
  const badgeColor =
    timeframe === "M1"
      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      : timeframe === "M3"
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-purple-500/20 text-purple-400 border-purple-500/30";

  const borderColor =
    timeframe === "M1"
      ? "border-cyan-500/40"
      : timeframe === "M3"
        ? "border-amber-500/40"
        : "border-purple-500/40";

  // Active ring color per timeframe
  const activeRingColor =
    timeframe === "M1"
      ? "ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-black"
      : timeframe === "M3"
        ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-black"
        : "ring-2 ring-purple-400/70 ring-offset-2 ring-offset-black";

  const activeBorderColor =
    timeframe === "M1"
      ? "border-cyan-400/60"
      : timeframe === "M3"
        ? "border-amber-400/60"
        : "border-purple-400/60";

  return (
    // biome-ignore lint/a11y/useSemanticElements: slot card contains nested interactive children; role=button div is intentional
    <div
      role="button"
      tabIndex={0}
      className={`bg-zinc-900 rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer ${
        isActive
          ? `${activeBorderColor} ${activeRingColor}`
          : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={handleSlotClick}
      onKeyDown={(e) => e.key === "Enter" && handleSlotClick()}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}
          >
            {timeframe}
          </span>
          <span className="text-white/60 text-sm">
            {TIMEFRAME_LABELS[timeframe]}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Ativo — Ctrl+V
            </span>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={handleRemove}
            className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
            title="Remover imagem"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>

      {/* Camera view */}
      {showCamera && !file && (
        <div
          className="p-4 space-y-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div
            className="relative rounded-xl overflow-hidden bg-black"
            style={{ minHeight: 200 }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ minHeight: 200 }}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <p className="text-red-400 text-sm text-center">
                  {cameraError.message}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-white text-black hover:bg-zinc-200 gap-2"
              onClick={handleCapture}
              disabled={!cameraActive || isLoading}
            >
              <Camera className="w-4 h-4" />
              Capturar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-white/60 hover:text-white"
              onClick={() => setShowCamera(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Preview when file is set */}
      {file && previewUrl && !showCamera && (
        <div className="p-3">
          <div
            className={`relative rounded-xl overflow-hidden border-2 ${borderColor}`}
          >
            <img
              src={previewUrl}
              alt={`Gráfico ${timeframe}`}
              className="w-full object-cover"
              style={{ maxHeight: 160 }}
            />
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={handleRemove}
                className="w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="absolute bottom-2 left-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}
              >
                {timeframe} ✓
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload drop zone when no file and no camera */}
      {!file && !showCamera && (
        <div
          className={`relative m-3 border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 ${
            isDragging
              ? "border-white/40 bg-white/5 scale-[1.01]"
              : isActive
                ? timeframe === "M1"
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : timeframe === "M3"
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-purple-500/50 bg-purple-500/5"
                : "border-zinc-700 hover:border-zinc-500"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handleDropZonePaste}
          onClick={(e) => {
            e.stopPropagation();
            onActivate(timeframe);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
          <Upload className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
          <p className="text-white/50 text-sm font-medium mb-1">
            {isActive
              ? "Pronto para colar — pressione Ctrl+V"
              : "Arraste ou clique para enviar"}
          </p>
          <p className="text-zinc-600 text-xs">PNG, JPG, WebP — até 10MB</p>
        </div>
      )}

      {/* Action buttons when empty */}
      {!file && !showCamera && (
        <div
          className="flex gap-2 px-3 pb-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivate(timeframe);
              fileInputRef.current?.click();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Arquivo
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivate(timeframe);
              setShowCamera(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white text-xs font-medium transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Câmera
          </button>
          <button
            type="button"
            onClick={handlePasteButtonClick}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? timeframe === "M1"
                  ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                  : timeframe === "M3"
                    ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40"
                    : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40"
                : "bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white"
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Colar
          </button>
        </div>
      )}

      {/* Replace button when file is set */}
      {file && !showCamera && (
        <div
          className="flex gap-2 px-3 pb-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              replaceInputRef.current?.click();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Trocar imagem
          </button>
        </div>
      )}
    </div>
  );
}
