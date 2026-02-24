import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HistoryListItem from '../components/HistoryListItem';
import { useGetAnalyses } from '../hooks/useQueries';

export default function History() {
  const navigate = useNavigate();
  const { data: analyses, isLoading } = useGetAnalyses();

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
            <h1 className="text-2xl font-bold">Histórico de Análises</h1>
            <p className="text-sm text-muted-foreground">
              Revise suas análises anteriores
            </p>
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="space-y-4">
            {analyses.map((analysis, idx) => (
              <HistoryListItem key={idx} analysis={analysis} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <img
              src="/assets/generated/icon-history.dim_128x128.png"
              alt=""
              className="w-24 h-24 mx-auto mb-4 opacity-30"
            />
            <p className="text-lg font-semibold mb-2">Nenhuma análise ainda</p>
            <p className="text-sm text-muted-foreground mb-6">
              Comece analisando seu primeiro gráfico
            </p>
            <Button onClick={() => navigate({ to: '/analyze' })}>
              Analisar Gráfico
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
