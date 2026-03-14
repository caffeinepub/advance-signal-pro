import { useNavigate } from "@tanstack/react-router";
import { BarChart2, History as HistoryIcon, Plus } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import HistoryListItem from "../components/HistoryListItem";
import { useGetAnalyses } from "../hooks/useQueries";

export default function History() {
  const navigate = useNavigate();
  const { data: analyses, isLoading } = useGetAnalyses();

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="history.back_button"
          onClick={() => navigate({ to: "/" })}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Histórico</h1>
          <p className="text-xs text-gray-500">Suas operações anteriores</p>
        </div>
        <HistoryIcon className="w-5 h-5 text-gray-400" />
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div data-ocid="history.loading_state" className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !analyses || analyses.length === 0 ? (
          <div
            data-ocid="history.empty_state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <BarChart2 className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhuma análise ainda
            </h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Faça sua primeira análise de gráfico para ver o histórico aqui.
            </p>
            <button
              type="button"
              data-ocid="history.new_analysis_button"
              onClick={() => navigate({ to: "/analyze" })}
              className="mt-6 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1.5" />
              Nova Análise
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">
              {analyses.length} análise{analyses.length !== 1 ? "s" : ""}{" "}
              registrada
              {analyses.length !== 1 ? "s" : ""}
            </p>
            {analyses.map((analysis, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list from backend, no reordering
              <div key={idx} data-ocid={`history.item.${idx + 1}`}>
                <HistoryListItem analysis={analysis} onClick={() => {}} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
