import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Moon, Sun, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useSettings } from '../hooks/useSettings';
import { useActor } from '../hooks/useActor';
import { Timeframe } from '../backend';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { actor } = useActor();
  
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // Load API key on mount
  useEffect(() => {
    if (actor) {
      loadApiKey();
    }
  }, [actor]);

  const loadApiKey = async () => {
    if (!actor) return;
    
    try {
      setIsLoadingApiKey(true);
      const key = await actor.getGeminiApiKey();
      if (key) {
        setApiKey(key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!actor) {
      toast.error('Erro ao conectar com o backend');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      toast.error('Por favor, insira uma chave de API válida');
      return;
    }

    // Basic validation for Gemini API key format
    if (!apiKey.startsWith('AIza')) {
      toast.error('Formato de chave inválido. A chave deve começar com "AIza"');
      return;
    }

    if (apiKey.length < 30) {
      toast.error('Chave de API muito curta. Verifique se copiou a chave completa');
      return;
    }

    try {
      setIsSavingApiKey(true);
      await actor.setGeminiApiKey(apiKey);
      toast.success('Chave da API salva com sucesso');
    } catch (error: any) {
      console.error('Error saving API key:', error);
      if (error.message && error.message.includes('Invalid Gemini API key format')) {
        toast.error('Formato de chave inválido. Verifique sua chave da API');
      } else {
        toast.error('Erro ao salvar chave da API');
      }
    } finally {
      setIsSavingApiKey(false);
    }
  };

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
          {/* API Configuration */}
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Configuração da API</Label>
                <p className="text-sm text-muted-foreground">
                  Configure sua chave da API do Google Gemini
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">
                    Chave da API Gemini
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Obtenha sua chave em{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      disabled={isLoadingApiKey}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleSaveApiKey}
                  disabled={isSavingApiKey || isLoadingApiKey || !apiKey}
                  className="w-full gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingApiKey ? 'Salvando...' : 'Salvar Chave da API'}
                </Button>
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
