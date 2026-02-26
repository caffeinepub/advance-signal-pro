import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CameraCapture from '../components/CameraCapture';
import FileUpload from '../components/FileUpload';
import { useClipboard } from '../hooks/useClipboard';
import { toast } from 'sonner';

export default function AnalyzeChart() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'file' | 'clipboard'>('file');
  const [isNavigating, setIsNavigating] = useState(false);

  const { clipboardImage, error: clipboardError } = useClipboard();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (file) toast.success('Imagem selecionada');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setUploadMethod('camera');
    toast.success('Foto capturada');
  };

  const handleProceed = () => {
    if (!selectedFile && !clipboardImage) {
      toast.error('Selecione ou capture uma imagem do gráfico');
      return;
    }

    const fileToUse = selectedFile || clipboardImage;
    if (!fileToUse) return;

    setIsNavigating(true);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;

        if (!dataUrl || !dataUrl.startsWith('data:')) {
          toast.error('Formato de imagem inválido. Tente novamente.');
          setIsNavigating(false);
          return;
        }

        try {
          sessionStorage.setItem('chartImage', dataUrl);
          sessionStorage.setItem('imageSource', uploadMethod);
        } catch {
          toast.error('Erro ao preparar imagem. Tente novamente.');
          setIsNavigating(false);
          return;
        }

        const stored = sessionStorage.getItem('chartImage');
        if (!stored || !stored.startsWith('data:')) {
          toast.error('Erro ao preparar imagem. Tente novamente.');
          setIsNavigating(false);
          return;
        }

        navigate({ to: '/processing' });
      } catch {
        toast.error('Erro ao preparar imagem. Tente novamente.');
        setIsNavigating(false);
      }
    };

    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo. Tente novamente.');
      setIsNavigating(false);
    };

    reader.readAsDataURL(fileToUse);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/' })}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Analisar Gráfico</h1>
            <p className="text-sm text-muted-foreground">
              Envie qualquer imagem de gráfico para análise
            </p>
          </div>
        </div>

        {/* Upload Methods */}
        <Card className="p-6 mb-6">
          <Tabs
            defaultValue="file"
            className="w-full"
            onValueChange={(v) => setUploadMethod(v as 'camera' | 'file' | 'clipboard')}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="file" className="gap-2">
                <img
                  src="/assets/generated/icon-upload.dim_96x96.png"
                  alt=""
                  className="w-5 h-5 opacity-70"
                />
                Enviar
              </TabsTrigger>
              <TabsTrigger value="camera" className="gap-2">
                <img
                  src="/assets/generated/icon-camera.dim_96x96.png"
                  alt=""
                  className="w-5 h-5 opacity-70"
                />
                Câmera
              </TabsTrigger>
              <TabsTrigger value="clipboard" className="gap-2">
                <img
                  src="/assets/generated/icon-clipboard.dim_96x96.png"
                  alt=""
                  className="w-5 h-5 opacity-70"
                />
                Colar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-0">
              <FileUpload onFileSelect={handleFileSelect} selectedFile={selectedFile} />
            </TabsContent>

            <TabsContent value="camera" className="mt-0">
              <CameraCapture onCapture={handleCameraCapture} />
            </TabsContent>

            <TabsContent value="clipboard" className="mt-0">
              <div className="text-center py-10">
                <img
                  src="/assets/generated/icon-clipboard.dim_96x96.png"
                  alt=""
                  className="w-14 h-14 mx-auto mb-4 opacity-50"
                />
                {clipboardImage ? (
                  <div>
                    <p className="text-base font-semibold text-chart-1 mb-2">
                      Imagem detectada!
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique em "Analisar Gráfico" para continuar
                    </p>
                    <div className="max-w-sm mx-auto">
                      <img
                        src={URL.createObjectURL(clipboardImage)}
                        alt="Pré-visualização"
                        className="rounded-lg border border-border w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold mb-2">
                      Cole uma imagem aqui
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Copie qualquer print de gráfico e pressione Ctrl+V
                    </p>
                    {clipboardError && (
                      <p className="text-sm text-destructive mt-2">{clipboardError}</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Action Button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          onClick={handleProceed}
          disabled={(!selectedFile && !clipboardImage) || isNavigating}
        >
          {isNavigating ? 'Preparando...' : 'Analisar Gráfico'}
        </Button>
      </div>
    </div>
  );
}
