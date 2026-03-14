import { useState } from "react";

export type SlotKey = "Foto1" | "Foto2";
export type TimeframeOption = "1m" | "2m" | "3m" | "5m";
// Backward compat alias
export type TimeframeKey = "M1" | "M3" | "M5";

export interface FilledSlot {
  slot: SlotKey;
  timeframe: TimeframeOption;
  file: File;
}

const DEFAULT_TIMEFRAMES: Record<SlotKey, TimeframeOption> = {
  Foto1: "1m",
  Foto2: "5m",
};

export function useMultiTimeframeUpload() {
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    Foto1: null,
    Foto2: null,
  });
  const [timeframes, setTimeframes] =
    useState<Record<SlotKey, TimeframeOption>>(DEFAULT_TIMEFRAMES);

  const setImage = (slot: SlotKey, file: File) =>
    setFiles((prev) => ({ ...prev, [slot]: file }));
  const clearImage = (slot: SlotKey) =>
    setFiles((prev) => ({ ...prev, [slot]: null }));
  const setSlotTimeframe = (slot: SlotKey, tf: TimeframeOption) =>
    setTimeframes((prev) => ({ ...prev, [slot]: tf }));

  const hasAnyImage = Object.values(files).some((f) => f !== null);
  const filledSlots: FilledSlot[] = (["Foto1", "Foto2"] as SlotKey[])
    .filter((s) => files[s] !== null)
    .map((s) => ({
      slot: s,
      timeframe: timeframes[s],
      file: files[s] as File,
    }));

  return {
    files,
    timeframes,
    setImage,
    clearImage,
    setSlotTimeframe,
    hasAnyImage,
    filledSlots,
  };
}
