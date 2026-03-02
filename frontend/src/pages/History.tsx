import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, History as HistoryIcon, BarChart2 } from 'lucide-react';
import { useGetAnalyses } from '../hooks/useQueries';
import HistoryListItem from '../components/HistoryListItem';

export default function History() {
  const navigate = useNavigate();
  const { data: analyses, isLoading } = useGetAnalyses();

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: '/' })}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold tracking-wide">HISTÓRICO DE ANÁLISES</h1>
          <p className="text-xs text-zinc-500">Suas operações anteriores</p>
        </div>
        <HistoryIcon className="w-5 h-5 text-zinc-500" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !analyses || analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="w-12 h-12 text-zinc-700 mb-4" />
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">
              Nenhuma análise ainda
            </h2>
            <p className="text-sm text-zinc-600 max-w-xs">
              Analise seu primeiro gráfico para começar a construir seu histórico de operações.
            </p>
            <button
              onClick={() => navigate({ to: '/analyze' })}
              className="mt-6 px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Analisar Gráfico
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 mb-2">
              {analyses.length} análise{analyses.length !== 1 ? 's' : ''} registrada
              {analyses.length !== 1 ? 's' : ''}
            </p>
            {analyses.map((analysis, index) => (
              <HistoryListItem
                key={index}
                analysis={analysis}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
