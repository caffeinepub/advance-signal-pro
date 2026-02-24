import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisDirection } from '../backend';

interface SignalCardProps {
  direction: AnalysisDirection;
  confidence: number;
  trendStrength: number;
  sinalOriginal?: string;
  pontuacao?: number;
}

export default function SignalCard({
  direction,
  confidence,
  trendStrength,
  sinalOriginal,
  pontuacao,
}: SignalCardProps) {
  const isBullish = direction === AnalysisDirection.bullish;
  const isBearish = direction === AnalysisDirection.bearish;
  const isSideways = direction === AnalysisDirection.sideways;
  
  // Check if this is a SEM ENTRADA signal
  const isSemEntrada = sinalOriginal === 'SEM ENTRADA';
  const isNeutro = sinalOriginal === 'NEUTRO';

  // Determine signal label
  let signal = 'MANTER';
  if (isSemEntrada) {
    signal = 'SEM ENTRADA';
  } else if (isNeutro) {
    signal = 'NEUTRO';
  } else if (isBullish) {
    signal = 'COMPRA';
  } else if (isBearish) {
    signal = 'VENDA';
  }

  // Determine colors based on signal type
  const signalColor = isSemEntrada
    ? 'text-amber-600 dark:text-amber-500'
    : isNeutro
    ? 'text-muted-foreground'
    : isBullish
    ? 'text-chart-1'
    : isBearish
    ? 'text-destructive'
    : 'text-muted-foreground';
    
  const bgColor = isSemEntrada
    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
    : isNeutro
    ? 'bg-muted border-border'
    : isBullish
    ? 'bg-chart-1/10 border-chart-1/20'
    : isBearish
    ? 'bg-destructive/10 border-destructive/20'
    : 'bg-muted border-border';

  return (
    <Card className={`p-6 mb-6 border-2 ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isSemEntrada && <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />}
          {!isSemEntrada && isBullish && <TrendingUp className="w-8 h-8 text-chart-1" />}
          {!isSemEntrada && isBearish && <TrendingDown className="w-8 h-8 text-destructive" />}
          {!isSemEntrada && isSideways && <Minus className="w-8 h-8 text-muted-foreground" />}
          <div>
            <p className="text-sm text-muted-foreground">Sinal</p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold ${signalColor}`}>{signal}</p>
              {!isSemEntrada && !isNeutro && isBullish && <ArrowUp className="w-6 h-6 text-chart-1" />}
              {!isSemEntrada && !isNeutro && isBearish && <ArrowDown className="w-6 h-6 text-destructive" />}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Confiança</p>
          <p className="text-3xl font-bold">{confidence}%</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Direção da Tendência</p>
          <Badge variant="secondary" className="capitalize">
            {direction === AnalysisDirection.bullish ? 'ALTA' : 
             direction === AnalysisDirection.bearish ? 'BAIXA' : 'LATERAL'}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Força da Tendência</p>
          <Badge variant="outline">{trendStrength}%</Badge>
        </div>
      </div>
      
      {/* Display score if available */}
      {pontuacao !== undefined && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pontuação:</p>
            <Badge variant={pontuacao >= 2 ? 'default' : pontuacao <= -2 ? 'destructive' : 'secondary'}>
              {pontuacao > 0 ? '+' : ''}{pontuacao}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}
