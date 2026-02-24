import { Check, Loader2 } from 'lucide-react';

interface ProcessingStageProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

export default function ProcessingStage({
  label,
  isActive,
  isComplete,
}: ProcessingStageProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
          isComplete
            ? 'bg-chart-1 border-chart-1'
            : isActive
            ? 'border-primary bg-primary/10'
            : 'border-border'
        }`}
      >
        {isComplete ? (
          <Check className="w-5 h-5 text-white" />
        ) : isActive ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted" />
        )}
      </div>
      <div className="flex-1">
        <p
          className={`font-medium transition-colors ${
            isActive ? 'text-foreground' : isComplete ? 'text-chart-1' : 'text-muted-foreground'
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
