import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useSettings } from '../hooks/useSettings';
import { Timeframe } from '../backend';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();

  const handleSensitivityChange = (value: number[]) => {
    if (settings) {
      updateSettings({
        ...settings,
        aiSensitivity: BigInt(value[0]),
      });
    }
  };

  const handleTimeframeChange = (value: string) => {
    if (settings) {
      updateSettings({
        ...settings,
        defaultTimeframe: value as Timeframe,
      });
      toast.success('Timeframe padrão atualizado');
    }
  };

  const handleNotificationsChange = (checked: boolean) => {
    if (settings) {
      updateSettings({
        ...settings,
        signalNotifications: checked,
      });
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

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

        {/* Settings Cards */}
        <div className="space-y-4">
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
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>

          {/* AI Sensitivity */}
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Sensibilidade da IA</Label>
                <p className="text-sm text-muted-foreground">
                  Ajuste a sensibilidade da detecção de padrões
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[Number(settings.aiSensitivity)]}
                  onValueChange={handleSensitivityChange}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {Number(settings.aiSensitivity)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Default Timeframe */}
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Selecionar timeframe padrão</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha o período de tempo para análise
                </p>
              </div>
              <Select
                value={settings.defaultTimeframe}
                onValueChange={handleTimeframeChange}
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
              <Switch
                checked={settings.signalNotifications}
                onCheckedChange={handleNotificationsChange}
              />
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
