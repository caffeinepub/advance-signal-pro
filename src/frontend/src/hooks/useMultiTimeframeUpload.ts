import { useState } from "react";

export type TimeframeKey = "M1" | "M3" | "M5";

export interface TimeframeSlot {
  timeframe: TimeframeKey;
  file: File | null;
}

export interface FilledSlot {
  timeframe: TimeframeKey;
  file: File;
}

export function useMultiTimeframeUpload() {
  const [slots, setSlots] = useState<Record<TimeframeKey, File | null>>({
    M1: null,
    M3: null,
    M5: null,
  });

  const setImage = (timeframe: TimeframeKey, file: File) => {
    setSlots((prev) => ({ ...prev, [timeframe]: file }));
  };

  const clearImage = (timeframe: TimeframeKey) => {
    setSlots((prev) => ({ ...prev, [timeframe]: null }));
  };

  const hasAnyImage = Object.values(slots).some((f) => f !== null);

  const filledSlots: FilledSlot[] = (["M1", "M3", "M5"] as TimeframeKey[])
    .filter((tf) => slots[tf] !== null)
    .map((tf) => ({ timeframe: tf, file: slots[tf] as File }));

  return { slots, setImage, clearImage, hasAnyImage, filledSlots };
}
