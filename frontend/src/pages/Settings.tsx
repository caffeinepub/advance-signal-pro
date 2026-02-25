import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Moon, Sun, Loader2, CandlestickChart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { useSetDailyOperationLimit } from '../hooks/useQueries';
import { Timeframe } from '../backend';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating } = useSettings();
  const setDailyLimitMutation = useSetDailyOperationLimit();

  const handleSensitivityChange = async (value: number[]) => {
    if (!settings) return;
    try {
      await updateSettings({
        ...settings,
        aiSensitivity: BigInt(value[0]),
      });
    } catch {
      toast.error('Erro ao salvar sensibilidade');
    }
  };

  const handleTimeframeChange = async (value: string) => {
    if (!settings) return;
    try {
      await updateSettings({
        ...settings,
        defaultTimeframe: value as Timeframe,
      });
      toast.success('Timeframe padrão atualizado');
    } catch {
      toast.error('Erro ao salvar timeframe');
    }
  };

  const handleNotificationsChange = async (checked: boolean) => {
    if (!settings) return;
    try {
      await updateSettings({
        ...settings,
        signalNotifications: checked,
      });
    } catch {
      toast.error('Erro ao salvar notificações');
    }
  };

  const handleDailyLimitChange = async (value: string) => {
    try {
      await setDailyLimitMutation.mutateAsync(BigInt(value));
      toast.success('Limite diário atualizado');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('must be 3, 4, 6, or 8')) {
        toast.error('Limite inválido. Escolha 3, 4, 6 ou 8');
      } else {
        toast.error('Erro ao salvar limite diário');
      }
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (settings) {
      updateSettings({ ...settings, theme: newTheme }).catch(() => {});
    }
  };

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
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Personalize sua experiência
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* ── Candle Analysis Configuration ── */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CandlestickChart className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-semibold">Configuração de Análise de Candles</Label>
                  <p className="text-sm text-muted-foreground">
                    Motor local de detecção de padrões de candlestick
                  </p>
                </div>
              </div>

              {/* Engine info row */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Motor de análise</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  Local (sem API externa)
                </span>
              </div>

              {/* AI Sensitivity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sensibilidade da IA</Label>
                <p className="text-xs text-muted-foreground">
                  Ajuste a sensibilidade da detecção de padrões
                </p>
                {isLoadingSettings ? (
                  <Skeleton className="h-6 w-full" />
                ) : (
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[Number(settings?.aiSensitivity ?? 50)]}
                      onValueChange={handleSensitivityChange}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                      disabled={isUpdating}
                    />
                    <span className="text-sm font-medium w-12 text-right">
                      {Number(settings?.aiSensitivity ?? 50)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Default Timeframe */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Timeframe padrão</Label>
                <p className="text-xs text-muted-foreground">
                  Escolha o período de tempo para análise
                </p>
                {isLoadingSettings ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={settings?.defaultTimeframe ?? Timeframe.M1}
                    onValueChange={handleTimeframeChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Timeframe.M1}>M1 (1 minuto)</SelectItem>
                      <SelectItem value={Timeframe.M5}>M5 (5 minutos)</SelectItem>
                      <SelectItem value={Timeframe.M10}>M10 (10 minutos)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Daily Operation Limit */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Operações por dia</Label>
                <p className="text-xs text-muted-foreground">
                  Número máximo de análises por dia
                </p>
                {isLoadingSettings ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={String(settings?.dailyOperationLimit ?? 3)}
                    onValueChange={handleDailyLimitChange}
                    disabled={setDailyLimitMutation.isPending}
                  >
                    <SelectTrigger>
                      {setDailyLimitMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </span>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 operações por dia</SelectItem>
                      <SelectItem value="4">4 operações por dia</SelectItem>
                      <SelectItem value="6">6 operações por dia</SelectItem>
                      <SelectItem value="8">8 operações por dia</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Card>

          {/* Theme */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha entre claro ou escuro
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleThemeToggle}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Notificações de Sinais</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas quando novos sinais forem detectados
                </p>
              </div>
              {isLoadingSettings ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <Switch
                  checked={settings?.signalNotifications ?? true}
                  onCheckedChange={handleNotificationsChange}
                  disabled={isUpdating}
                />
              )}
            </div>
          </Card>

          {/* Language Info */}
          <Card className="p-4">
            <div>
              <Label className="text-base font-semibold">Idioma</Label>
              <p className="text-sm text-muted-foreground">
                Português (Brasil)
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
