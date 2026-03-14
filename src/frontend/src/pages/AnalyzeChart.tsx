import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Clipboard, Info, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  SlotKey,
  TimeframeOption,
} from "../hooks/useMultiTimeframeUpload";
import { useMultiTimeframeUpload } from "../hooks/useMultiTimeframeUpload";

const TIMEFRAME_OPTIONS: TimeframeOption[] = ["1m", "2m", "3m", "5m"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface PhotoSlotProps {
  slotKey: SlotKey;
  label: string;
  file: File | null;
  timeframe: TimeframeOption;
  isActive: boolean;
  onActivate: () => void;
  onFileChange: (f: File) => void;
  onFileRemove: () => void;
  onTimeframeChange: (tf: TimeframeOption) => void;
}

function PhotoSlot({
  slotKey,
  label,
  file,
  timeframe,
  isActive,
  onActivate,
  onFileChange,
  onFileRemove,
  onTimeframeChange,
}: PhotoSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  useEffect(() => {
    if (!isActive) return;
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            if (f.size > MAX_FILE_SIZE) {
              toast.error("Arquivo muito grande. Máximo 10MB.");
              return;
            }
            onFileChange(f);
            toast.success(`Imagem colada em ${label}`);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [isActive, label, onFileChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }
      onFileChange(f);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }
      onFileChange(f);
    }
  };

  const handlePasteButton = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onActivate();
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const f = new File([blob], `paste-${slotKey}.png`, { type });
              onFileChange(f);
              toast.success(`Imagem colada em ${label}`);
              return;
            }
          }
        }
      }
      toast.info(`${label} ativo — pressione Ctrl+V para colar`);
    } catch {
      toast.info(`${label} ativo — pressione Ctrl+V para colar`);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 shadow-sm ${
        isActive
          ? "border-yellow-400 ring-2 ring-yellow-300/60"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Upload area — use button semantics */}
      {file && previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt={label}
            className="w-full object-cover rounded-t-xl"
            style={{ maxHeight: 160 }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button type="button" className="w-full text-left" onClick={onActivate}>
          <div
            className={`m-3 border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging
                ? "border-yellow-400 bg-yellow-50"
                : isActive
                  ? "border-yellow-300 bg-yellow-50/50"
                  : "border-gray-200 hover:border-gray-300 bg-gray-50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm font-medium">
              {isActive ? "Pronto — pressione Ctrl+V" : "Arraste ou clique"}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">PNG, JPG, WebP</p>
          </div>
        </button>
      )}

      {/* Action buttons (empty) */}
      {!file && (
        <div
          className="flex gap-2 px-3 pb-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-ocid={`analyze.${slotKey.toLowerCase()}_upload_button`}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
              fileInputRef.current?.click();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors border border-gray-200"
          >
            <Upload className="w-3.5 h-3.5" />
            Arquivo
          </button>
          <button
            type="button"
            data-ocid={`analyze.${slotKey.toLowerCase()}_paste_button`}
            onClick={handlePasteButton}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
              isActive
                ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Colar
          </button>
        </div>
      )}

      {/* Replace button (file exists) */}
      {file && (
        <div className="flex gap-2 px-3 pb-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id={`replace-${slotKey}`}
            onChange={handleFileInput}
          />
          <label
            htmlFor={`replace-${slotKey}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors border border-gray-200 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Trocar
          </label>
        </div>
      )}

      {/* Foto label + Timeframe selector */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
            Foto
          </span>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse inline-block" />
              Ctrl+V
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAME_OPTIONS.map((tf) => (
            <button
              key={tf}
              type="button"
              data-ocid={`analyze.${slotKey.toLowerCase()}_tf_${tf}`}
              onClick={(e) => {
                e.stopPropagation();
                onTimeframeChange(tf);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? "bg-gray-800 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzeChart() {
  const navigate = useNavigate();
  const {
    files,
    timeframes,
    setImage,
    clearImage,
    setSlotTimeframe,
    hasAnyImage,
    filledSlots,
  } = useMultiTimeframeUpload();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);

  const handleProceed = async () => {
    if (!hasAnyImage) {
      toast.error("Envie pelo menos uma imagem de gráfico para continuar");
      return;
    }
    setIsNavigating(true);
    setActiveSlot(null);
    try {
      for (const key of [
        "chartImage",
        "chartImage_M1",
        "chartImage_M3",
        "chartImage_M5",
        "chartImages_count",
      ]) {
        sessionStorage.removeItem(key);
      }
      const conversions = filledSlots.map(
        ({ slot, file }) =>
          new Promise<{ slot: SlotKey; dataUrl: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              if (!dataUrl?.startsWith("data:"))
                reject(new Error(`Imagem inválida para ${slot}`));
              else resolve({ slot, dataUrl });
            };
            reader.onerror = () => reject(new Error(`Erro ao ler ${slot}`));
            reader.readAsDataURL(file);
          }),
      );
      const results = await Promise.all(conversions);
      const slotToTf: Record<SlotKey, string> = { Foto1: "M1", Foto2: "M3" };
      for (const { slot, dataUrl } of results) {
        sessionStorage.setItem(`chartImage_${slotToTf[slot]}`, dataUrl);
      }
      sessionStorage.setItem("chartImages_count", String(results.length));
      if (results.length > 0)
        sessionStorage.setItem("chartImage", results[0].dataUrl);
      navigate({ to: "/processing" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao preparar imagens. Tente novamente.");
      setIsNavigating(false);
    }
  };

  const filledCount = filledSlots.length;

  return (
    <div
      className="min-h-screen bg-background"
      onClick={() => setActiveSlot(null)}
      onKeyDown={() => setActiveSlot(null)}
    >
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            data-ocid="analyze.back_button"
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: "/" });
            }}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-200/60"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Analisar Gráfico
            </h1>
            <p className="text-sm text-gray-500">
              Envie até 2 gráficos para análise
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-3 bg-white/80 border border-gray-200 rounded-2xl p-4 mb-5 shadow-sm"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-gray-600 text-xs leading-relaxed">
            Clique em um slot para ativá-lo, depois arraste, selecione um
            arquivo ou pressione <strong>Ctrl+V</strong> para colar. Escolha o
            timeframe abaixo de cada foto.
          </p>
        </div>

        <div
          className="space-y-4 mb-6"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {(["Foto1", "Foto2"] as SlotKey[]).map((slot, idx) => (
            <PhotoSlot
              key={slot}
              slotKey={slot}
              label={`Foto ${idx + 1}`}
              file={files[slot]}
              timeframe={timeframes[slot]}
              isActive={activeSlot === slot}
              onActivate={() => setActiveSlot(slot)}
              onFileChange={(f) => setImage(slot, f)}
              onFileRemove={() => clearImage(slot)}
              onTimeframeChange={(tf) => setSlotTimeframe(slot, tf)}
            />
          ))}
        </div>

        {filledCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-gray-500 text-xs">
              {filledCount === 1
                ? "1 gráfico selecionado"
                : `${filledCount} gráficos selecionados`}
            </p>
          </div>
        )}

        <Button
          size="lg"
          data-ocid="analyze.submit_button"
          className="w-full h-14 text-lg font-bold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 rounded-2xl shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            handleProceed();
          }}
          disabled={!hasAnyImage || isNavigating}
        >
          {isNavigating
            ? "Preparando..."
            : filledCount > 1
              ? `Analisar ${filledCount} Gráficos`
              : "Analisar Gráfico"}
        </Button>
      </div>
    </div>
  );
}
