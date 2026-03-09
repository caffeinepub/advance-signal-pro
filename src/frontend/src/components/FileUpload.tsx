import { Button } from "@/components/ui/button";
import { FileImage, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({
  onFileSelect,
  selectedFile,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
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
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          handleFile(file);
          break;
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />

        {selectedFile ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-chart-1/10 flex items-center justify-center">
                <FileImage className="w-7 h-7 text-chart-1" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {selectedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null as unknown as File);
              }}
            >
              <X className="w-4 h-4" />
              Remover
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">Enviar imagem</p>
              <p className="text-sm text-muted-foreground mt-1">
                Arraste, cole (Ctrl+V) ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WebP, print de tela — até 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
