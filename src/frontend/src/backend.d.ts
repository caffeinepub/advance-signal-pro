import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserSettings {
    theme: string;
    signalNotifications: boolean;
    language: string;
    aiSensitivity: bigint;
    defaultTimeframe: Timeframe;
}
export interface AnalysisResult {
    direction: AnalysisDirection;
    trendStrength: bigint;
    candlestickPatterns: Array<CandlestickPattern>;
    breakouts: boolean;
    resistanceLevels: Array<ResistanceLevel>;
    timestamp: bigint;
    confidencePercentage: bigint;
    image: ExternalBlob;
    pullbacks: boolean;
}
export interface ResistanceLevel {
    strength: bigint;
    price: number;
}
export enum AnalysisDirection {
    bullish = "bullish",
    sideways = "sideways",
    bearish = "bearish"
}
export enum CandlestickPattern {
    shootingStar = "shootingStar",
    doji = "doji",
    none = "none",
    hammer = "hammer",
    engulfing = "engulfing"
}
export enum Timeframe {
    M1 = "M1",
    M5 = "M5",
    M10 = "M10"
}
export interface backendInterface {
    getAnalyses(): Promise<Array<AnalysisResult>>;
    getAnalysisHistory(): Promise<Array<AnalysisResult>>;
    getCriteria(): Promise<{
        patternRecognitionSensitivity: bigint;
        confidenceBreakpoint: number;
        supportResistancePadding: number;
        bearishThreshold: number;
        trendStrengthMultiplier: number;
        bullishThreshold: number;
    }>;
    getSettings(): Promise<UserSettings>;
    getTopResistanceLevels(): Promise<Array<ResistanceLevel>>;
    storeExternalAnalysis(result: AnalysisResult): Promise<void>;
    updateSettings(newSettings: UserSettings): Promise<void>;
}
