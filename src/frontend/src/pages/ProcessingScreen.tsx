import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { ImageOff, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ExternalBlob, Timeframe } from "../backend";
import ProcessingStage from "../components/ProcessingStage";
import { useActor } from "../hooks/useActor";
import { useAnalyzeChart } from "../hooks/useQueries";
import { analyzeChartImage } from "../services/localCandleAnalysis";
import type { LocalAnalysisResult } from "../types/analysisTypes";
import { dataUrlToFile } from "../utils/dataUrlToFile";
import { mergeMultiTimeframeResults } from "../utils/mergeMultiTimeframeResults";

const STAGES = [
  { label: "Carregando imagens do gráfico", duration: 3000 },
  { label: "Identificando candles e estrutura", duration: 4000 },
  { label: "Detectando padrões de candle", duration: 4500 },
  { label: "Gerando resultado da análise", duration: 3000 },
];

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function mapTimeframe(tf: "M1" | "M3" | "M5"): Timeframe {
  if (tf === "M3") return Timeframe.M3;
  if (tf === "M5") return Timeframe.M5;
  return Timeframe.M1;
}

type TimeframeKey = "M1" | "M3" | "M5";

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const analyzeChart = useAnalyzeChart();

  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isChartDetectionError, setIsChartDetectionError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingLabel, setProcessingLabel] = useState("");

  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markComplete = (stageIndex: number) => {
    setCompletedStages((prev) => {
      const next = [...prev];
      next[stageIndex] = true;
      return next;
    });
  };

  const startAnalysis = async () => {
    setIsProcessing(true);
    setError(null);
    setIsChartDetectionError(false);

    setCurrentStage(0);
    await delay(STAGES[0].duration);

    const countStr = sessionStorage.getItem("chartImages_count");
    const count = countStr ? Number.parseInt(countStr, 10) : 0;

    let imagesToProcess: Array<{ timeframe: TimeframeKey; dataUrl: string }> =
      [];

    if (count > 0) {
      const tfs: TimeframeKey[] = ["M1", "M3", "M5"];
      for (const tf of tfs) {
        const data = sessionStorage.getItem(`chartImage_${tf}`);
        if (data?.startsWith("data:")) {
          imagesToProcess.push({ timeframe: tf, dataUrl: data });
        }
      }
    }

    if (imagesToProcess.length === 0) {
      const legacyData = sessionStorage.getItem("chartImage");
      if (legacyData?.startsWith("data:")) {
        imagesToProcess.push({ timeframe: "M1", dataUrl: legacyData });
      }
    }

    if (imagesToProcess.length === 0) {
      setError("Imagem não encontrada. Envie o gráfico novamente.");
      setIsProcessing(false);
      return;
    }

    const firstImageFile = dataUrlToFile(
      imagesToProcess[0].dataUrl,
      "chart.png",
    );
    let imageBlob: ExternalBlob | null = null;
    if (firstImageFile) {
      try {
        const buffer = await firstImageFile.arrayBuffer();
        imageBlob = ExternalBlob.fromBytes(new Uint8Array(buffer));
      } catch {
        // non-fatal
      }
    }

    markComplete(0);
    setCurrentStage(1);
    await delay(STAGES[1].duration);
    markComplete(1);

    setCurrentStage(2);

    const analysisResults: Array<{
      timeframe: TimeframeKey;
      result: LocalAnalysisResult;
    }> = [];

    for (const { timeframe, dataUrl } of imagesToProcess) {
      setProcessingLabel(
        imagesToProcess.length > 1 ? `Analisando ${timeframe}...` : "",
      );
      const imageFile = dataUrlToFile(dataUrl, `chart_${timeframe}.png`);
      if (!imageFile) continue;
      try {
        // Pass the image's timeframe so analysis uses the correct one
        const result = await analyzeChartImage(imageFile, timeframe);
        analysisResults.push({ timeframe, result });
      } catch {
        // Skip failed
      }
    }

    await delay(STAGES[2].duration);

    if (analysisResults.length === 0) {
      setIsChartDetectionError(true);
      setIsProcessing(false);
      return;
    }

    const allNeutroLowConf = analysisResults.every(
      ({ result }) => result.sinal === "NEUTRO" && result.confianca < 35,
    );
    if (allNeutroLowConf) {
      setIsChartDetectionError(true);
      setIsProcessing(false);
      return;
    }

    setProcessingLabel("");
    markComplete(2);

    setCurrentStage(3);
    await delay(STAGES[3].duration);
    markComplete(3);

    let mergedResult: ReturnType<typeof mergeMultiTimeframeResults>;
    try {
      mergedResult = mergeMultiTimeframeResults(analysisResults);
      sessionStorage.setItem("latestAnalysis", JSON.stringify(mergedResult));
    } catch {
      setError("Não foi possível processar o resultado. Tente novamente.");
      setIsProcessing(false);
      return;
    }

    if (actor && imageBlob) {
      const primaryResult = analysisResults[0].result;
      Promise.resolve().then(async () => {
        try {
          await analyzeChart.mutateAsync({
            direction:
              primaryResult.sinal === "COMPRA"
                ? ({ bullish: null } as any)
                : primaryResult.sinal === "VENDA"
                  ? ({ bearish: null } as any)
                  : ({ sideways: null } as any),
            resistanceLevels: [],
            candlestickPatterns: [],
            pullbacks: false,
            breakouts: false,
            trendStrength: BigInt(Math.floor(primaryResult.confianca * 0.8)),
            confidencePercentage: BigInt(Math.floor(primaryResult.confianca)),
            timestamp: BigInt(Date.now() * 1_000_000),
            image: imageBlob,
            probabilidadeAlta: primaryResult.probAlta / 100,
            probabilidadeBaixa: primaryResult.probBaixa / 100,
            acaoSugerida: primaryResult.sinal,
            operationFollowed: undefined,
            entradaExemplo: undefined,
            stopExemplo: undefined,
            alvoExemplo: undefined,
            timeframe: mapTimeframe(primaryResult.timeframe),
          });
        } catch (err) {
          console.warn("[ProcessingScreen] Backend save skipped:", err);
        }
      });
    }

    navigate({ to: "/results/$id", params: { id: "latest" } });
  };

  if (isChartDetectionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-white border-gray-200 shadow-md">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Gráfico Não Identificado
            </h2>
            <p className="text-gray-500">
              Não foi possível identificar o gráfico corretamente
            </p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            Certifique-se de que o print contém um gráfico de candles visível
            com velas coloridas (verde/vermelho).
          </div>
          <Button
            className="w-full gap-2 bg-gray-900 text-white hover:bg-gray-700"
            onClick={() => navigate({ to: "/analyze" })}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-white border-gray-200 shadow-md">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Erro na Análise
            </h2>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
          <Button
            className="w-full gap-2 bg-gray-900 text-white hover:bg-gray-700"
            onClick={() => navigate({ to: "/analyze" })}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const overallProgress = Math.round(
    (completedStages.filter(Boolean).length / STAGES.length) * 100,
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 flex flex-col items-center">
        <img
          src="/assets/generated/app-icon.dim_512x512.png"
          alt="Logo"
          className="w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.15))" }}
        />
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Analisando Gráfico
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {processingLabel || "Processamento local com IA"}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="space-y-5">
          {STAGES.map((stage, idx) => (
            <ProcessingStage
              key={stage.label}
              label={stage.label}
              duration={stage.duration}
              isActive={
                currentStage === idx && isProcessing && !completedStages[idx]
              }
              isComplete={completedStages[idx]}
            />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-400 text-xs">Progresso total</span>
          <span className="text-foreground text-sm font-bold">
            {overallProgress}%
          </span>
        </div>
      </div>

      <p className="text-gray-400 text-xs mt-8 text-center max-w-xs">
        Análise realizada localmente. Não constitui recomendação financeira.
      </p>
    </div>
  );
}
