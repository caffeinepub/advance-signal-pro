import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '../utils/formatTimestamp';
import { AnalysisDirection, type AnalysisResult } from '../backend';

interface HistoryListItemProps {
  analysis: AnalysisResult;
}

export default function HistoryListItem({ analysis }: HistoryListItemProps) {
  const navigate = useNavigate();

  const isBullish = analysis.direction === AnalysisDirection.bullish;
  const isBearish = analysis.direction === AnalysisDirection.bearish;
  const signal = isBullish ? 'COMPRA' : isBearish ? 'VENDA' : 'MANTER';

  const handleClick = () => {
    // Store analysis data for results page
    sessionStorage.setItem('latestAnalysis', JSON.stringify({
      ...analysis,
      direction: analysis.direction,
      resistanceLevels: analysis.resistanceLevels.map(r => ({ 
        price: r.price, 
        strength: Number(r.strength) 
      })),
      trendStrength: Number(analysis.trendStrength),
      confidencePercentage: Number(analysis.confidencePercentage),
      timestamp: Number(analysis.timestamp),
    }));
    navigate({ to: '/results/$id', params: { id: 'latest' } });
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {isBullish && <TrendingUp className="w-8 h-8 text-chart-1" />}
          {isBearish && <TrendingDown className="w-8 h-8 text-destructive" />}
          {!isBullish && !isBearish && <Minus className="w-8 h-8 text-muted-foreground" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={isBullish ? 'default' : isBearish ? 'destructive' : 'secondary'}
              className={isBullish ? 'bg-chart-1' : ''}
            >
              {signal}
            </Badge>
            <span className="text-sm font-semibold">
              {Number(analysis.confidencePercentage)}% Confiança
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(analysis.timestamp)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground">Tendência</p>
          <p className="font-medium">
            {analysis.direction === AnalysisDirection.bullish ? 'ALTA' : 
             analysis.direction === AnalysisDirection.bearish ? 'BAIXA' : 'LATERAL'}
          </p>
        </div>
      </div>
    </Card>
  );
}
