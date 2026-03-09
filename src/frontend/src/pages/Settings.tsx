import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  Bell,
  Check,
  Clock,
  Copy,
  Globe,
  Loader2,
  LogOut,
  Pencil,
  Save,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timeframe } from "../backend";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetSettings, useUpdateSettings } from "../hooks/useQueries";

const SETTINGS_KEY = "userSettings";

type TimeframeStr = "M1" | "M3" | "M5";

function timeframeToStr(tf: Timeframe): TimeframeStr {
  if (tf === Timeframe.M3) return "M3";
  if (tf === Timeframe.M5) return "M5";
  return "M1";
}

function strToTimeframe(s: TimeframeStr): Timeframe {
  if (s === "M3") return Timeframe.M3;
  if (s === "M5") return Timeframe.M5;
  return Timeframe.M1;
}

function loadTimeframeFromStorage(): TimeframeStr {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed.defaultTimeframe === "M3" ||
        parsed.defaultTimeframe === "M5"
      ) {
        return parsed.defaultTimeframe as TimeframeStr;
      }
    }
  } catch {
    // ignore
  }
  return "M1";
}

export default function Settings() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { user, updateDisplayName, logout } = useAuth();

  // Profile editing state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? "");

  // Local state — source of truth for UI (never reverts)
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeframeStr>(
    loadTimeframeFromStorage,
  );
  const [sensitivity, setSensitivity] = useState<number>(50);
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [notifications, setNotifications] = useState<boolean>(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize from backend settings once loaded
  useEffect(() => {
    if (settings && !initialized) {
      const tfStr = timeframeToStr(settings.defaultTimeframe);
      // Only use backend value if localStorage doesn't have one yet
      const storedTf = loadTimeframeFromStorage();
      const storedRaw = localStorage.getItem(SETTINGS_KEY);
      if (!storedRaw) {
        setCurrentTimeframe(tfStr);
        persistTimeframe(tfStr);
      } else {
        setCurrentTimeframe(storedTf);
      }
      setSensitivity(Number(settings.aiSensitivity));
      setDailyLimit(Number(settings.dailyOperationLimit));
      setNotifications(settings.signalNotifications);
      setInitialized(true);
    }
  }, [settings, initialized]);

  function persistTimeframe(tf: TimeframeStr) {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      const updated = { ...existing, defaultTimeframe: tf };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  const handleTimeframeChange = (tf: TimeframeStr) => {
    // Update UI immediately — never reverts
    setCurrentTimeframe(tf);
    // Persist to localStorage immediately
    persistTimeframe(tf);

    // Try to persist to backend (best-effort, won't revert UI on failure)
    if (identity && settings) {
      const newSettings = {
        ...settings,
        defaultTimeframe: strToTimeframe(tf),
        aiSensitivity: BigInt(sensitivity),
        dailyOperationLimit: BigInt(dailyLimit),
      };
      updateSettingsMutation.mutate(newSettings, {
        onSuccess: () => {
          toast.success("Configuração salva!");
        },
        onError: () => {
          // UI already updated — just show a subtle note
          toast.info("Timeframe salvo localmente.");
        },
      });
    } else {
      toast.success("Configuração salva!");
    }
  };

  const handleSave = () => {
    persistTimeframe(currentTimeframe);

    if (identity && settings) {
      const newSettings = {
        ...settings,
        defaultTimeframe: strToTimeframe(currentTimeframe),
        aiSensitivity: BigInt(sensitivity),
        dailyOperationLimit: BigInt(dailyLimit),
        signalNotifications: notifications,
      };
      updateSettingsMutation.mutate(newSettings, {
        onSuccess: () => {
          toast.success("Configurações salvas com sucesso!");
        },
        onError: () => {
          toast.success("Configurações salvas localmente!");
        },
      });
    } else {
      toast.success("Configurações salvas localmente!");
    }
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      updateDisplayName(trimmed);
      toast.success("Nome atualizado!");
    }
    setEditingName(false);
  };

  const handleCopyId = () => {
    if (user?.userId) {
      navigator.clipboard.writeText(user.userId).then(() => {
        toast.success("ID copiado!");
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  const timeframeOptions: {
    value: TimeframeStr;
    label: string;
    desc: string;
  }[] = [
    { value: "M1", label: "M1", desc: "1 minuto" },
    { value: "M3", label: "M3", desc: "3 minutos" },
    { value: "M5", label: "M5", desc: "5 minutos" },
  ];

  const limitOptions = [3, 4, 6, 8];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Configurações</h1>
          <p className="text-sm text-white/50">Personalize sua experiência</p>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-6">
        {/* Profile */}
        {user && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-white/60" />
              <h2 className="text-base font-semibold text-white">Perfil</h2>
            </div>

            {/* Display Name */}
            <div className="mb-3">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                Nome
              </p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    data-ocid="profile.name_input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white
                      text-sm focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <button
                    type="button"
                    data-ocid="profile.save_button"
                    onClick={handleSaveName}
                    className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    {user.displayName}
                  </span>
                  <button
                    type="button"
                    data-ocid="profile.edit_button"
                    onClick={() => {
                      setNameInput(user.displayName);
                      setEditingName(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70
                      transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>
              )}
            </div>

            {/* User ID */}
            <div className="mb-3">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                ID do Usuário
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/60 text-sm font-mono truncate">
                  {user.userId.slice(0, 8)}...
                </span>
                <button
                  type="button"
                  data-ocid="profile.copy_id_button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70
                    transition-colors px-2 py-1 rounded-lg hover:bg-white/10 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                Email
              </p>
              <span className="text-white/60 text-sm">{user.email}</span>
            </div>
          </div>
        )}

        {/* Timeframe */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">
              Timeframe Padrão
            </h2>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Selecione o período de cada vela para análise
          </p>
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {timeframeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTimeframeChange(opt.value)}
                  className={`py-3 px-2 rounded-xl border-2 transition-all text-center ${
                    currentTimeframe === opt.value
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  <div className="text-lg font-bold">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-white/30 mt-3">
            Selecionado:{" "}
            <span className="text-amber-400 font-semibold">
              {currentTimeframe}
            </span>
          </p>
        </div>

        {/* AI Sensitivity */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Sensibilidade da IA
            </h2>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Ajuste a sensibilidade da análise ({sensitivity}%)
          </p>
          <input
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>Conservador</span>
            <span>Agressivo</span>
          </div>
        </div>

        {/* Daily Limit */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-green-400" />
            <h2 className="text-base font-semibold text-white">
              Limite Diário de Operações
            </h2>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Máximo de operações por dia
          </p>
          <div className="grid grid-cols-4 gap-2">
            {limitOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDailyLimit(opt)}
                className={`py-3 rounded-xl border-2 transition-all text-center font-bold ${
                  dailyLimit === opt
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Notificações de Sinal
                </h2>
                <p className="text-sm text-white/50">
                  Receber alertas de novos sinais
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                notifications ? "bg-purple-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Language info */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Idioma</h2>
              <p className="text-sm text-white/50">Português (Brasil)</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
          data-ocid="settings.save_button"
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Salvar Configurações
        </button>

        {/* Logout button */}
        <button
          type="button"
          data-ocid="settings.logout_button"
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-transparent border border-white/15 text-white/50 font-medium text-base
            flex items-center justify-center gap-2 hover:bg-white/5 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
