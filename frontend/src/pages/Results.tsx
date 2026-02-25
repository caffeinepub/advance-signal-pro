import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft, ArrowUp, ArrowDown, Minus, Share2, Save,
  AlertCircle, ImageOff, RefreshCw, TrendingUp, TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    const data = sessionStorage.getItem('latestAnalysis');
    if (data) {
      setAnalysis(JSON.parse(data));
    } else {
      toast.error('Nenhum dado de análise encontrado');
      navigate({ to: '/' });
    }

    const chartImage = sessionStorage.getItem('chartImage');
    if (chartImage) {
      setThumbnailUrl(chartImage);
    }
  }, [id, navigate]);

  if (!analysis) return null;

  const isChartDetectionError = analysis.isChartDetectionError === true;

  const handleShare = () => shareAnalysis(analysis);
  const handleSave = () => toast.success('Análise salva no histórico');

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case 'M1': return '1 minuto';
      case 'M5': return '5 minutos';
      case 'M10': return '10 minutos';
      default: return '1 minuto';
    }
  };

  const timeframeToUse = settings?.defaultTimeframe || analysis.defaultTimeframe || Timeframe.M1;

  const getTrendLabel = (direction: string) => {
    switch (direction) {
      case 'bullish': return 'ALTA';
      case 'bearish': return 'BAIXA';
      case 'sideways': return 'LATERAL';
      default: return 'LATERAL';
    }
  };

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'engulfing': return 'Envolvente';
      case 'hammer': return 'Martelo';
      case 'doji': return 'Doji';
      case 'shootingStar': return 'Estrela Cadente';
      default: return pattern;
    }
  };

  const getForcaBadgeClass = (forca?: string) => {
    if (forca === 'forte') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 font-bold';
    if (forca === 'média') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700';
    return 'bg-muted text-muted-foreground border border-border';
  };

  const getForcaLabel = (forca?: string) => {
    if (forca === 'forte') return 'Forte';
    if (forca === 'média') return 'Média';
    if (forca === 'fraca') return 'Fraca';
    return '';
  };

  const isSemEntrada = analysis.sinalOriginal === 'SEM ENTRADA';
  const isNeutro = analysis.sinalOriginal === 'NEUTRO';

  const allPatterns: string[] = [];
  if (analysis.padroesRaw && Array.isArray(analysis.padroesRaw) && analysis.padroesRaw.length > 0) {
    allPatterns.push(...analysis.padroesRaw);
  } else if (analysis.candlestickPatterns && Array.isArray(analysis.candlestickPatterns)) {
    allPatterns.push(...analysis.candlestickPatterns.map(getPatternLabel));
  }
  if (analysis.pullbacks) allPatterns.push('Retração (Pullback)');
  if (analysis.breakouts) allPatterns.push('Rompimento (Breakout)');

  const trendLabel = analysis.tendenciaRaw || getTrendLabel(analysis.direction);

  const probAlta: number = analysis.probabilidade_alta ?? 50;
  const probBaixa: number = analysis.probabilidade_baixa ?? 50;

  // Chart detection error screen
  if (isChartDetectionError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Resultados da Análise</h1>
              <p className="text-sm text-muted-foreground">Análise local de candles</p>
            </div>
          </div>
          <Card className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                <ImageOff className="w-10 h-10 text-orange-500 dark:text-orange-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Gráfico Não Identificado</h2>
              <p className="text-muted-foreground text-lg">
                {analysis.erroMessage || 'Não foi possível identificar o gráfico corretamente'}
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-800 dark:text-orange-200">
              Certifique-se de que o print contém um gráfico de candles visível. Evite imagens com apenas menus, textos ou sem velas coloridas.
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full gap-2" onClick={() => navigate({ to: '/analyze' })}>
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: '/' })}>
                Voltar ao início
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header with thumbnail */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Resultados da Análise</h1>
            <p className="text-sm text-muted-foreground">Análise local de candles</p>
          </div>
          {/* Mini thumbnail beside header */}
          {thumbnailUrl && (
            <div className="shrink-0">
              <img
                src={thumbnailUrl}
                alt="Print original do gráfico"
                className="w-20 h-14 object-cover rounded-lg border-2 border-border shadow-md opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                title="Print original enviado para análise"
              />
            </div>
          )}
        </div>

        {/* SEM ENTRADA Alert */}
        {isSemEntrada && (
          <Alert className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Nenhum sinal claro detectado</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              A análise técnica não identificou um padrão claro para entrada. Aguarde uma melhor oportunidade com confirmação de tendência e padrões definidos.
            </AlertDescription>
          </Alert>
        )}

        {/* NEUTRO Alert */}
        {isNeutro && !isSemEntrada && (
          <Alert className="mb-6 border-border bg-muted">
            <Minus className="h-4 w-4" />
            <AlertTitle>Mercado em consolidação</AlertTitle>
            <AlertDescription>
              O mercado está em movimento lateral. Aguarde confirmação de tendência antes de entrar em operação.
            </AlertDescription>
          </Alert>
        )}

        {/* Signal Card */}
        <SignalCard
          direction={analysis.direction}
          confidence={analysis.confidencePercentage}
          trendStrength={analysis.trendStrength}
          sinalOriginal={analysis.sinalOriginal}
          pontuacao={analysis.pontuacao}
          forca={analysis.forca}
        />

        {/* ── Probability Section ── */}
        {(probAlta !== undefined && probBaixa !== undefined) && (
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Probabilidade para próxima vela
            </h3>

            {/* Probability sentence */}
            <p className="text-base font-semibold mb-4 leading-snug">
              <span className="text-emerald-600 dark:text-emerald-400">{probAlta}% de probabilidade de ALTA</span>
              {' / '}
              <span className="text-red-500 dark:text-red-400">{probBaixa}% de BAIXA</span>
              {' na próxima vela'}
            </p>

            {/* ALTA bar */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  ALTA
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{probAlta}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${probAlta}%` }}
                />
              </div>
            </div>

            {/* BAIXA bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-red-500 dark:text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  BAIXA
                </span>
                <span className="font-bold text-red-500 dark:text-red-400">{probBaixa}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${probBaixa}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* 1. Tendência */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Tendência</h3>
          <div className="flex items-center gap-3">
            {analysis.direction === AnalysisDirection.bullish && (
              <ArrowUp className="w-7 h-7 text-emerald-500" />
            )}
            {analysis.direction === AnalysisDirection.bearish && (
              <ArrowDown className="w-7 h-7 text-destructive" />
            )}
            {analysis.direction === AnalysisDirection.sideways && (
              <Minus className="w-7 h-7 text-muted-foreground" />
            )}
            <p className="text-2xl font-bold">{trendLabel}</p>
          </div>
        </Card>

        {/* 2. Padrões encontrados */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Padrões encontrados</h3>
          <div className="space-y-2">
            {allPatterns.length > 0 ? (
              allPatterns.map((pattern: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{pattern}</span>
                  <Badge variant="secondary">Detectado</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum padrão específico detectado</p>
            )}
          </div>
        </Card>

        {/* 3. Força */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Força</h3>
          {analysis.forca ? (
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-base font-semibold ${getForcaBadgeClass(analysis.forca)}`}>
                {getForcaLabel(analysis.forca)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não disponível</p>
          )}
        </Card>

        {/* 4. Confiança */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Confiança</h3>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold">{analysis.confidencePercentage}%</p>
            <Badge variant="outline" className="text-sm">
              {Number(analysis.confidencePercentage) < 50 ? 'Baixa' : Number(analysis.confidencePercentage) < 75 ? 'Média' : 'Alta'}
            </Badge>
          </div>
        </Card>

        {/* 5. Sinal */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Sinal</h3>
          <div className="flex items-center gap-3">
            {analysis.sinalOriginal === 'COMPRA' && (
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                COMPRA <ArrowUp className="w-7 h-7" />
              </span>
            )}
            {analysis.sinalOriginal === 'VENDA' && (
              <span className="text-3xl font-bold text-destructive flex items-center gap-2">
                VENDA <ArrowDown className="w-7 h-7" />
              </span>
            )}
            {(analysis.sinalOriginal === 'SEM ENTRADA' || analysis.sinalOriginal === 'NEUTRO' || !analysis.sinalOriginal) && (
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                SEM ENTRADA <Minus className="w-7 h-7" />
              </span>
            )}
          </div>
        </Card>

        {/* 6. Explicação */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Explicação</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.explicacao || `Com base na análise do gráfico, detectou-se uma tendência de ${trendLabel} com ${analysis.confidencePercentage}% de confiança.`}
          </p>
        </Card>

        {/* Chart with Overlay */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4">Análise do Gráfico</h3>
          <ChartOverlay analysis={analysis} />
        </Card>

        {/* Timeframe */}
        <Card className="p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Tempo Sugerido</p>
          <p className="text-2xl font-bold">{getTimeframeLabel(timeframeToUse)}</p>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleSave}
            disabled={isSemEntrada}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          <Button variant="outline" size="lg" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>

        {isSemEntrada && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Análises sem sinal claro não podem ser salvas
          </p>
        )}
      </div>
    </div>
  );
}
