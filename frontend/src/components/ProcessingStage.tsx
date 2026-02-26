import { useEffect, useState, useRef } from 'react';
import { Check } from 'lucide-react';

interface ProcessingStageProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
  duration?: number;
}

export default function ProcessingStage({
  label,
  isActive,
  isComplete,
  duration = 800,
}: ProcessingStageProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (isActive) {
      setProgress(0);
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
        const raw = (elapsed / duration) * 100;
        // Ease-out: slow down near 100
        const eased = Math.min(99, Math.round(raw * (1 - raw / 10000)));
        setProgress(Math.min(99, eased < 1 ? Math.round(raw) : eased));
      }, 30);
    } else if (!isActive && !isComplete) {
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isComplete, duration]);

  const displayProgress = isComplete ? 100 : progress;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div
          className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300 ${
            isComplete
              ? 'bg-emerald-500 border-emerald-500'
              : isActive
              ? 'border-white/60 bg-transparent'
              : 'border-white/20 bg-transparent'
          }`}
        >
          {isComplete ? (
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          ) : isActive ? (
            <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-white/20" />
          )}
        </div>

        {/* Label */}
        <span
          className={`text-sm font-medium transition-colors duration-300 flex-1 ${
            isComplete
              ? 'text-emerald-400'
              : isActive
              ? 'text-white font-bold'
              : 'text-white/40'
          }`}
        >
          {label}
        </span>

        {/* Percentage */}
        <span
          className={`text-xs font-mono tabular-nums transition-colors duration-300 ${
            isComplete
              ? 'text-emerald-400'
              : isActive
              ? 'text-white/90'
              : 'text-white/20'
          }`}
        >
          {displayProgress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="ml-10 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isComplete
              ? 'processing-bar-complete'
              : isActive
              ? 'processing-bar-active'
              : 'w-0'
          }`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}
