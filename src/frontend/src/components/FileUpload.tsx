import { useRef, useState } from 'react';
import { Upload, FileImage, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const ACCEPTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (images will be auto-resized if needed)

export default function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [heicWarning, setHeicWarning] = useState(false);

  const validateFile = (file: File): boolean => {
    // Check for HEIC format
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (fileType === 'image/heic' || fileType === 'image/heif' || 
        fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      setHeicWarning(true);
      toast.error('Arquivos HEIC não são suportados. Por favor, converta para JPEG ou use a câmera.');
      return false;
    }
    
    setHeicWarning(false);
    
    if (!ACCEPTED_FORMATS.includes(fileType)) {
      toast.error('Por favor, envie um arquivo PNG, JPG, JPEG ou WebP');
      return false;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error('O tamanho do arquivo deve ser menor que 10MB');
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    onFileSelect(null as any);
    setHeicWarning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {heicWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Arquivos HEIC não são suportados. Por favor, converta para JPEG ou use a câmera para capturar diretamente.
          </AlertDescription>
        </Alert>
      )}
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <img
          src="/assets/generated/icon-upload.dim_96x96.png"
          alt=""
          className="w-16 h-16 mx-auto mb-4 opacity-50"
        />
        <p className="text-lg font-semibold mb-2">
          Arraste e solte seu gráfico aqui
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          ou clique no botão abaixo para procurar
        </p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileImage className="w-4 h-4 mr-2" />
          Procurar Arquivos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground mt-4">
          Formatos suportados: PNG, JPG, JPEG, WebP (máx 10MB)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Imagens grandes serão automaticamente redimensionadas
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <FileImage className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
