import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Layers, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMultiTimeframeUpload, type TimeframeKey } from '../hooks/useMultiTimeframeUpload';
import TimeframeUploadSlot from '../components/TimeframeUploadSlot';

export default function AnalyzeChart() {
  const navigate = useNavigate();
  const { slots, setImage, clearImage, hasAnyImage, filledSlots } = useMultiTimeframeUpload();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleProceed = async () => {
    if (!hasAnyImage) {
      toast.error('Envie pelo menos uma imagem de gráfico para continuar');
      return;
    }

    setIsNavigating(true);

    try {
      // Clear old keys
      sessionStorage.removeItem('chartImage');
      sessionStorage.removeItem('chartImage_M1');
      sessionStorage.removeItem('chartImage_M3');
      sessionStorage.removeItem('chartImage_M5');
      sessionStorage.removeItem('chartImages_count');

      // Convert each filled slot to data URL and store
      const conversions = filledSlots.map(
        ({ timeframe, file }) =>
          new Promise<{ timeframe: TimeframeKey; dataUrl: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              if (!dataUrl || !dataUrl.startsWith('data:')) {
                reject(new Error(`Imagem inválida para ${timeframe}`));
              } else {
                resolve({ timeframe, dataUrl });
              }
            };
            reader.onerror = () => reject(new Error(`Erro ao ler imagem ${timeframe}`));
            reader.readAsDataURL(file);
          })
      );

      const results = await Promise.all(conversions);

      try {
        for (const { timeframe, dataUrl } of results) {
          sessionStorage.setItem(`chartImage_${timeframe}`, dataUrl);
        }
        sessionStorage.setItem('chartImages_count', String(results.length));

        // Also store the first filled slot as legacy 'chartImage' for Results page chart overlay
        if (results.length > 0) {
          sessionStorage.setItem('chartImage', results[0].dataUrl);
        }
      } catch {
        toast.error('Erro ao preparar imagem. Tente novamente.');
        setIsNavigating(false);
        return;
      }

      navigate({ to: '/processing' });
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao preparar imagens. Tente novamente.');
      setIsNavigating(false);
    }
  };

  const filledCount = filledSlots.length;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/' })}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Analisar Gráfico</h1>
            <p className="text-sm text-white/40">
              Envie até 3 gráficos para análise multi-timeframe
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-semibold mb-1">Análise Multi-Timeframe</p>
            <p className="text-white/40 text-xs leading-relaxed">
              Envie prints do gráfico em diferentes tempos de vela (M1, M3, M5) para uma análise
              mais completa pela IA. Pelo menos um gráfico é obrigatório.
            </p>
          </div>
        </div>

        {/* Upload slots */}
        <div className="space-y-4 mb-6">
          {(['M1', 'M3', 'M5'] as TimeframeKey[]).map((tf) => (
            <TimeframeUploadSlot
              key={tf}
              timeframe={tf}
              file={slots[tf]}
              onImageChange={setImage}
              onImageRemove={clearImage}
            />
          ))}
        </div>

        {/* Status indicator */}
        {filledCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="flex gap-1">
              {(['M1', 'M3', 'M5'] as TimeframeKey[]).map((tf) => (
                <div
                  key={tf}
                  className={`w-2 h-2 rounded-full transition-all ${
                    slots[tf]
                      ? tf === 'M1'
                        ? 'bg-cyan-400'
                        : tf === 'M3'
                        ? 'bg-amber-400'
                        : 'bg-purple-400'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-white/40 text-xs">
              {filledCount === 1
                ? '1 gráfico selecionado'
                : `${filledCount} gráficos selecionados`}
            </p>
          </div>
        )}

        {/* Tip for clipboard paste */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <Info className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
          <p className="text-zinc-600 text-xs">
            Dica: Copie um print e clique em "Colar" no slot desejado, ou pressione Ctrl+V
          </p>
        </div>

        {/* Action Button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-40 rounded-2xl"
          onClick={handleProceed}
          disabled={!hasAnyImage || isNavigating}
        >
          {isNavigating
            ? 'Preparando...'
            : filledCount > 1
            ? `Analisar ${filledCount} Gráficos`
            : 'Analisar Gráfico'}
        </Button>
      </div>
    </div>
  );
}
