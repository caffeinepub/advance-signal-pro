import { ArrowLeft, Delete, Loader2, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "asp_auth_user";

type Step = "email" | "createPin" | "confirmPin" | "enterPin";

function PinDots({ count, shake }: { count: number; shake: boolean }) {
  return (
    <motion.div
      className="flex items-center justify-center gap-4 my-6"
      animate={shake ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
            i < count
              ? "bg-gray-800 border-gray-800 shadow-sm"
              : "bg-transparent border-gray-300"
          }`}
          animate={i < count ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.15 }}
        />
      ))}
    </motion.div>
  );
}

function NumericKeypad({
  onDigit,
  onDelete,
}: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
      {keys.map((key) => (
        <motion.button
          key={key}
          type="button"
          data-ocid={`login.pin_key_${key}`}
          onClick={() => onDigit(key)}
          whileTap={{ scale: 0.92 }}
          className="h-[72px] rounded-2xl bg-gray-100 border border-gray-300 text-gray-800 text-2xl font-bold
            hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target
            flex items-center justify-center select-none"
        >
          {key}
        </motion.button>
      ))}

      <div className="h-[72px]" />
      <motion.button
        type="button"
        data-ocid="login.pin_key_0"
        onClick={() => onDigit("0")}
        whileTap={{ scale: 0.92 }}
        className="h-[72px] rounded-2xl bg-gray-100 border border-gray-300 text-gray-800 text-2xl font-bold
          hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target
          flex items-center justify-center select-none"
      >
        0
      </motion.button>
      <motion.button
        type="button"
        data-ocid="login.pin_delete_button"
        onClick={onDelete}
        whileTap={{ scale: 0.92 }}
        className="h-[72px] rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 text-2xl
          hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors touch-target
          flex items-center justify-center select-none"
      >
        <Delete className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

type Mode = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored?.email) {
          setEmail(stored.email);
          setMode("login");
          setStep("enterPin");
          return;
        }
      }
    } catch {
      // ignore
    }
    setStep("email");
    setMode("login");
  }, []);

  useEffect(() => {
    if (step === "email") {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [step]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
    try {
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80, 40, 120]);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleEmailContinue = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailError("Digite um email válido");
      triggerShake();
      return;
    }
    setEmailError("");
    setEmail(trimmed);

    if (mode === "register") {
      setStep("createPin");
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored?.email?.toLowerCase() === trimmed) {
          setStep("enterPin");
          return;
        }
      }
    } catch {
      // ignore
    }

    setEmailError("Email não cadastrado. Crie sua conta primeiro.");
    triggerShake();
  };

  const handleDigit = useCallback(
    async (digit: string) => {
      if (isLoading) return;
      setErrorMsg("");

      if (step === "createPin") {
        const next = pin + digit;
        if (next.length <= 4) {
          setPin(next);
          if (next.length === 4) {
            setFirstPin(next);
            setTimeout(() => {
              setPin("");
              setStep("confirmPin");
            }, 200);
          }
        }
      } else if (step === "confirmPin") {
        const next = confirmPinValue + digit;
        if (next.length <= 4) {
          setConfirmPinValue(next);
          if (next.length === 4) {
            if (next === firstPin) {
              setIsLoading(true);
              try {
                const newUser = await register(email, next);
                toast.success(
                  `Bem-vindo, ${newUser.displayName}! Seu ID: ${newUser.userId.slice(0, 8)}`,
                  { duration: 4000 },
                );
              } finally {
                setIsLoading(false);
              }
            } else {
              triggerShake();
              setErrorMsg("PINs não coincidem. Tente novamente.");
              setTimeout(() => {
                setConfirmPinValue("");
                setPin("");
                setFirstPin("");
                setStep("createPin");
              }, 500);
            }
          }
        }
      } else if (step === "enterPin") {
        const next = pin + digit;
        if (next.length <= 4) {
          setPin(next);
          if (next.length === 4) {
            setIsLoading(true);
            try {
              const result = await login(email, next);
              if (!result.success) {
                triggerShake();
                setErrorMsg(result.error ?? "PIN incorreto");
                setTimeout(() => setPin(""), 500);
              }
            } finally {
              setIsLoading(false);
            }
          }
        }
      }
    },
    [
      step,
      pin,
      confirmPinValue,
      firstPin,
      email,
      isLoading,
      login,
      register,
      triggerShake,
    ],
  );

  const handleDelete = useCallback(() => {
    setErrorMsg("");
    if (step === "createPin") setPin((p) => p.slice(0, -1));
    else if (step === "confirmPin") setConfirmPinValue((p) => p.slice(0, -1));
    else if (step === "enterPin") setPin((p) => p.slice(0, -1));
  }, [step]);

  const handleSwitchAccount = () => {
    setPin("");
    setFirstPin("");
    setConfirmPinValue("");
    setErrorMsg("");
    setEmail("");
    setMode("login");
    setStep("email");
  };

  const handleSwitchMode = (newMode: Mode) => {
    setMode(newMode);
    setPin("");
    setFirstPin("");
    setConfirmPinValue("");
    setErrorMsg("");
    setEmailError("");
    setStep("email");
  };

  const handleBack = () => {
    setPin("");
    setFirstPin("");
    setConfirmPinValue("");
    setErrorMsg("");
    if (step === "confirmPin") setStep("createPin");
    else if (step === "createPin") setStep("email");
  };

  const currentPinCount =
    step === "confirmPin" ? confirmPinValue.length : pin.length;

  const stepTitle: Record<Step, string> = {
    email: mode === "register" ? "Criar conta" : "Entrar na conta",
    createPin: "Crie seu PIN de 4 dígitos",
    confirmPin: "Confirme seu PIN",
    enterPin: "Digite seu PIN",
  };

  const stepSubtitle: Record<Step, string> = {
    email:
      mode === "register"
        ? "Cadastre-se com seu email"
        : "Digite seu email para entrar",
    createPin: "Escolha 4 números para sua senha",
    confirmPin: "Repita o PIN para confirmar",
    enterPin: "Bem-vindo de volta!",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/generated/app-icon.dim_512x512.png"
              alt="Advance Signal Pro"
              className="w-16 h-16 rounded-2xl shadow-lg shadow-gray-400/30"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Advance Signal Pro
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Análise de Gráficos com IA
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 border border-gray-200 rounded-3xl p-6 backdrop-blur-sm shadow-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {(step === "createPin" || step === "confirmPin") && (
                <button
                  type="button"
                  data-ocid="login.back_button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors text-sm mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
              )}

              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-foreground">
                  {stepTitle[step]}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {stepSubtitle[step]}
                </p>
              </div>

              {/* EMAIL STEP */}
              {step === "email" && (
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex rounded-xl bg-gray-100 p-1 mb-2">
                    <button
                      type="button"
                      data-ocid="login.login_tab"
                      onClick={() => handleSwitchMode("login")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        mode === "login"
                          ? "bg-white text-gray-800 shadow"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      data-ocid="login.register_tab"
                      onClick={() => handleSwitchMode("register")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        mode === "register"
                          ? "bg-white text-gray-800 shadow"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Cadastrar
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider"
                    >
                      Email
                    </label>
                    <motion.input
                      id="login-email"
                      ref={emailInputRef}
                      data-ocid="login.email_input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleEmailContinue()
                      }
                      placeholder="seu@email.com"
                      animate={
                        shake && step === "email"
                          ? { x: [0, -8, 8, -8, 8, -4, 4, 0] }
                          : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground
                        placeholder-gray-300 focus:outline-none focus:bg-white
                        transition-colors text-base ${
                          emailError
                            ? "border-red-400 focus:border-red-500"
                            : "border-gray-300 focus:border-gray-500"
                        }`}
                    />
                    {emailError && (
                      <p
                        data-ocid="login.email_error"
                        className="text-red-500 text-xs mt-1.5"
                      >
                        {emailError}
                      </p>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    data-ocid="login.continue_button"
                    onClick={handleEmailContinue}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold text-base
                      hover:bg-gray-700 transition-colors"
                  >
                    {mode === "register" ? "Criar Conta" : "Continuar"}
                  </motion.button>
                  {mode === "login" && (
                    <p className="text-center text-xs text-gray-400 pt-1">
                      Ainda não tem conta?{" "}
                      <button
                        type="button"
                        data-ocid="login.go_register_button"
                        onClick={() => handleSwitchMode("register")}
                        className="text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
                      >
                        Cadastre-se
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* CREATE PIN STEP */}
              {step === "createPin" && (
                <div className="space-y-1">
                  <PinDots count={pin.length} shake={shake} />
                  {errorMsg && (
                    <p
                      data-ocid="login.pin_error"
                      className="text-red-500 text-xs text-center mb-2"
                    >
                      {errorMsg}
                    </p>
                  )}
                  <NumericKeypad
                    onDigit={handleDigit}
                    onDelete={handleDelete}
                  />
                </div>
              )}

              {/* CONFIRM PIN STEP */}
              {step === "confirmPin" && (
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 my-6 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Criando conta...</span>
                    </div>
                  ) : (
                    <PinDots count={confirmPinValue.length} shake={shake} />
                  )}
                  {errorMsg && (
                    <p
                      data-ocid="login.pin_error"
                      className="text-red-500 text-xs text-center mb-2"
                    >
                      {errorMsg}
                    </p>
                  )}
                  <NumericKeypad
                    onDigit={handleDigit}
                    onDelete={handleDelete}
                  />
                </div>
              )}

              {/* ENTER PIN STEP */}
              {step === "enterPin" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border border-gray-200">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{email}</span>
                    </div>
                  </div>
                  <div className="text-center mb-1">
                    <button
                      type="button"
                      data-ocid="login.switch_account_button"
                      onClick={handleSwitchAccount}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
                    >
                      Trocar conta
                    </button>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 my-6 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Verificando...</span>
                    </div>
                  ) : (
                    <PinDots count={currentPinCount} shake={shake} />
                  )}
                  {errorMsg && (
                    <p
                      data-ocid="login.pin_error"
                      className="text-red-500 text-xs text-center mb-2"
                    >
                      {errorMsg}
                    </p>
                  )}
                  <NumericKeypad
                    onDigit={handleDigit}
                    onDelete={handleDelete}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Conta salva na nuvem — acesse de qualquer dispositivo
        </p>
      </div>
    </div>
  );
}
