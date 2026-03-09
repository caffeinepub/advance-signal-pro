import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { Cpu, History, Settings, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url(/assets/generated/dashboard-bg.dim_1920x1080.png)",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="flex justify-center mb-6">
            <img
              src="/assets/generated/app-icon.dim_512x512.png"
              alt="Advance Signal Pro"
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Advance Signal Pro
          </h1>
          <p className="text-muted-foreground text-lg">
            Análise de Gráficos com IA & Sinais de Trading 1.0
          </p>
        </div>

        {/* AI Status Indicator */}
        <Card className="mb-8 p-4 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/assets/generated/icon-ai-active.dim_64x64.png"
              alt="IA Ativa"
              className="w-8 h-8"
            />
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-chart-1" />
              <span className="font-medium">Status da IA:</span>
              <Badge variant="default" className="bg-chart-1 text-white">
                Ativo
              </Badge>
            </div>
          </div>
        </Card>

        {/* Main Action Buttons */}
        <div className="grid gap-4 mb-8">
          <Button
            size="lg"
            className="h-auto py-6 text-lg font-semibold"
            onClick={() => navigate({ to: "/analyze" })}
          >
            <img
              src="/assets/generated/icon-chart.dim_128x128.png"
              alt=""
              className="w-8 h-8 mr-3 invert dark:invert-0"
            />
            Analisar Gráfico
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="secondary"
              size="lg"
              className="h-auto py-6 text-lg font-semibold"
              onClick={() => navigate({ to: "/history" })}
            >
              <img
                src="/assets/generated/icon-history.dim_128x128.png"
                alt=""
                className="w-7 h-7 mr-3 opacity-70"
              />
              Histórico de Análises
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="h-auto py-6 text-lg font-semibold"
              onClick={() => navigate({ to: "/settings" })}
            >
              <img
                src="/assets/generated/icon-settings.dim_128x128.png"
                alt=""
                className="w-7 h-7 mr-3 opacity-70"
              />
              Configurações
            </Button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <Card className="p-4 text-center bg-card/30 backdrop-blur">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-chart-1" />
            <h3 className="font-semibold mb-1">Detecção de Tendência</h3>
            <p className="text-sm text-muted-foreground">
              Identifica tendências de alta, baixa ou lateral
            </p>
          </Card>
          <Card className="p-4 text-center bg-card/30 backdrop-blur">
            <Cpu className="w-8 h-8 mx-auto mb-2 text-chart-2" />
            <h3 className="font-semibold mb-1">Reconhecimento de Padrões</h3>
            <p className="text-sm text-muted-foreground">
              Detecta padrões de candles automaticamente
            </p>
          </Card>
          <Card className="p-4 text-center bg-card/30 backdrop-blur">
            <History className="w-8 h-8 mx-auto mb-2 text-chart-3" />
            <h3 className="font-semibold mb-1">Histórico de Análises</h3>
            <p className="text-sm text-muted-foreground">
              Revise análises anteriores a qualquer momento
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
