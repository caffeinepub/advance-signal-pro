import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CameraCapture from '../components/CameraCapture';
import FileUpload from '../components/FileUpload';
import { useClipboard } from '../hooks/useClipboard';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';

export default function AnalyzeChart() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'file' | 'clipboard'>('file');

  const { clipboardImage, error: clipboardError } = useClipboard();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    toast.success('Imagem do gráfico selecionada');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setUploadMethod('camera');
    toast.success('Foto capturada');
  };

  const handleProceed = () => {
    if (!selectedFile && !clipboardImage) {
      toast.error('Por favor, selecione ou capture uma imagem do gráfico');
      return;
    }

    const fileToUse = selectedFile || clipboardImage;
    if (fileToUse) {
      // Store the file in session storage for processing screen
      const reader = new FileReader();
      reader.onload = () => {
        sessionStorage.setItem('chartImage', reader.result as string);
        navigate({ to: '/processing' });
      };
      reader.readAsDataURL(fileToUse);
    }
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
              Envie ou capture um gráfico de trading para análise da IA
            </p>
          </div>
        </div>

        {/* Upload Methods */}
        <Card className="p-6 mb-6">
          <Tabs defaultValue="file" className="w-full" onValueChange={(v) => setUploadMethod(v as any)}>
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
              <div className="text-center py-12">
                <img
                  src="/assets/generated/icon-clipboard.dim_96x96.png"
                  alt=""
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                />
                {clipboardImage ? (
                  <div>
                    <p className="text-lg font-semibold text-chart-1 mb-2">
                      Imagem detectada na área de transferência!
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique em "Analisar Gráfico" abaixo para prosseguir
                    </p>
                    <div className="max-w-md mx-auto">
                      <img
                        src={URL.createObjectURL(clipboardImage)}
                        alt="Pré-visualização"
                        className="rounded-lg border border-border"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold mb-2">
                      Copie uma imagem para sua área de transferência
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use Ctrl+C (ou Cmd+C no Mac) para copiar uma imagem do gráfico, depois retorne aqui
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
          disabled={!selectedFile && !clipboardImage}
        >
          Analisar Gráfico
        </Button>
      </div>
    </div>
  );
}
