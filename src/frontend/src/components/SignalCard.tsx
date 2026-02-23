import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisDirection } from '../backend';

interface SignalCardProps {
  direction: AnalysisDirection;
  confidence: number;
  trendStrength: number;
}

export default function SignalCard({
  direction,
  confidence,
  trendStrength,
}: SignalCardProps) {
  const isBullish = direction === AnalysisDirection.bullish;
  const isBearish = direction === AnalysisDirection.bearish;
  const isSideways = direction === AnalysisDirection.sideways;

  const signal = isBullish ? 'COMPRA' : isBearish ? 'VENDA' : 'MANTER';
  const signalColor = isBullish
    ? 'text-chart-1'
    : isBearish
    ? 'text-destructive'
    : 'text-muted-foreground';
  const bgColor = isBullish
    ? 'bg-chart-1/10'
    : isBearish
    ? 'bg-destructive/10'
    : 'bg-muted';

  return (
    <Card className={`p-6 mb-6 ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isBullish && <TrendingUp className="w-8 h-8 text-chart-1" />}
          {isBearish && <TrendingDown className="w-8 h-8 text-destructive" />}
          {isSideways && <Minus className="w-8 h-8 text-muted-foreground" />}
          <div>
            <p className="text-sm text-muted-foreground">Sinal</p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold ${signalColor}`}>{signal}</p>
              {isBullish && <ArrowUp className="w-6 h-6 text-chart-1" />}
              {isBearish && <ArrowDown className="w-6 h-6 text-destructive" />}
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
    </Card>
  );
}
