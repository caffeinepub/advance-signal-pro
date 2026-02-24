import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowUp, ArrowDown, Minus, Share2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SignalCard from '../components/SignalCard';
import ChartOverlay from '../components/ChartOverlay';
import { shareAnalysis } from '../utils/shareAnalysis';
import { AnalysisDirection, Timeframe } from '../backend';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams({ from: '/results/$id' });
  const [analysis, setAnalysis] = useState<any>(null);
  const { settings } = useSettings();

  useEffect(() => {
    const data = sessionStorage.getItem('latestAnalysis');
    if (data) {
      setAnalysis(JSON.parse(data));
    } else {
      toast.error('Nenhum dado de análise encontrado');
      navigate({ to: '/' });
    }
  }, [id, navigate]);

  if (!analysis) {
    return null;
  }

  const precision =
    analysis.confidencePercentage < 50
      ? 'Baixa'
      : analysis.confidencePercentage < 75
      ? 'Média'
      : 'Alta';

  const handleShare = () => {
    shareAnalysis(analysis);
  };

  const handleSave = () => {
    toast.success('Análise salva no histórico');
  };

  // Get timeframe label
  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case 'M1':
        return '1 minuto';
      case 'M5':
        return '5 minutos';
      case 'M10':
        return '10 minutos';
      default:
        return '1 minuto';
    }
  };

  const timeframeToUse = settings?.defaultTimeframe || analysis.defaultTimeframe || Timeframe.M1;

  // Get trend label
  const getTrendLabel = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return 'ALTA';
      case 'bearish':
        return 'BAIXA';
      case 'sideways':
        return 'LATERAL';
      default:
        return 'LATERAL';
    }
  };

  // Get pattern label
  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'engulfing':
        return 'Envolvente';
      case 'hammer':
        return 'Martelo';
      case 'doji':
        return 'Doji';
      case 'shootingStar':
        return 'Estrela Cadente';
      default:
        return pattern;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Resultados da Análise</h1>
            <p className="text-sm text-muted-foreground">
              Sinal de trading e insights gerados pela IA
            </p>
          </div>
        </div>

        {/* Signal Card */}
        <SignalCard
          direction={analysis.direction}
          confidence={analysis.confidencePercentage}
          trendStrength={analysis.trendStrength}
        />

        {/* Chart with Overlay */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4">Análise do Gráfico</h3>
          <ChartOverlay analysis={analysis} />
        </Card>

        {/* Analysis Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Confiança</p>
            <p className="text-2xl font-bold">{precision}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tempo Sugerido</p>
            <p className="text-2xl font-bold">{getTimeframeLabel(timeframeToUse)}</p>
          </Card>
        </div>

        {/* Trend Section */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Tendência</h3>
          <div className="flex items-center gap-3">
            {analysis.direction === AnalysisDirection.bullish && (
              <ArrowUp className="w-8 h-8 text-chart-1" />
            )}
            {analysis.direction === AnalysisDirection.bearish && (
              <ArrowDown className="w-8 h-8 text-destructive" />
            )}
            {analysis.direction === AnalysisDirection.sideways && (
              <Minus className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-2xl font-bold">{getTrendLabel(analysis.direction)}</p>
              <p className="text-sm text-muted-foreground">
                Força: {analysis.trendStrength}%
              </p>
            </div>
          </div>
        </Card>

        {/* Detected Patterns */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Padrões Detectados</h3>
          <div className="space-y-2">
            {analysis.candlestickPatterns.map((pattern: string, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span>{getPatternLabel(pattern)}</span>
                <Badge variant="secondary">Detectado</Badge>
              </div>
            ))}
            {analysis.pullbacks && (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span>Retração</span>
                <Badge variant="secondary">Detectado</Badge>
              </div>
            )}
            {analysis.breakouts && (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span>Rompimento</span>
                <Badge variant="secondary">Detectado</Badge>
              </div>
            )}
          </div>
        </Card>

        {/* Support/Resistance Levels */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Níveis de Suporte/Resistência</h3>
          <div className="space-y-2">
            {analysis.resistanceLevels.map((level: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="font-mono">${level.price.toFixed(2)}</span>
                <Badge variant="outline">Força: {level.strength}%</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Explanation - now from API */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Explicação</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.explicacao || `Com base na análise do gráfico, a IA detectou uma tendência de ${getTrendLabel(analysis.direction)} com ${analysis.confidencePercentage}% de confiança. Os padrões de candles identificados sugerem um sinal de ${analysis.direction === AnalysisDirection.bullish ? 'COMPRA' : 'VENDA'}. Recomenda-se operar no timeframe de ${getTimeframeLabel(timeframeToUse)} para operações de scalp na Pocket Option.`}
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" size="lg" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          <Button variant="outline" size="lg" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>
    </div>
  );
}
