import { useState } from 'react';
import { useCamera } from '../camera/useCamera';
import { Button } from '@/components/ui/button';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const {
    isActive,
    isSupported,
    error,
    isLoading,
    currentFacingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    retry,
    videoRef,
    canvasRef,
  } = useCamera({
    facingMode: 'environment',
    quality: 0.9,
    format: 'image/jpeg',
  });

  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      const url = URL.createObjectURL(photo);
      setCapturedImage(url);
      onCapture(photo);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  if (isSupported === false) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          A câmera não é suportada neste dispositivo ou navegador.
        </AlertDescription>
      </Alert>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <img src={capturedImage} alt="Capturada" className="w-full h-full object-contain" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleRetake}>
          <X className="w-4 h-4 mr-2" />
          Tirar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.type === 'permission' 
              ? 'Por favor, permita o acesso à câmera para continuar.'
              : error.type === 'not-found'
              ? 'Nenhuma câmera encontrada neste dispositivo.'
              : error.type === 'not-supported'
              ? 'Câmera não suportada neste navegador.'
              : error.message}
          </AlertDescription>
          {error.type === 'permission' && (
            <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
              Tentar Novamente
            </Button>
          )}
        </Alert>
      )}

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: isActive ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isActive ? (
          <Button
            className="flex-1"
            onClick={startCamera}
            disabled={isLoading}
          >
            <Camera className="w-4 h-4 mr-2" />
            {isLoading ? 'Iniciando...' : 'Iniciar Câmera'}
          </Button>
        ) : (
          <>
            <Button
              className="flex-1"
              onClick={handleCapture}
              disabled={isLoading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Capturar Foto
            </Button>
            <Button
              variant="outline"
              onClick={stopCamera}
              disabled={isLoading}
            >
              Parar
            </Button>
            {/* Only show switch on mobile */}
            {/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => switchCamera()}
                disabled={isLoading}
              >
                <SwitchCamera className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
