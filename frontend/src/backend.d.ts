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
export interface ResistanceLevel {
    strength: bigint;
    price: number;
}
export interface UserSettings {
    theme: string;
    signalNotifications: boolean;
    language: string;
    aiSensitivity: bigint;
    defaultTimeframe: Timeframe;
    dailyOperationLimit: bigint;
}
export interface AnalysisResult {
    direction: AnalysisDirection;
    stopExemplo?: number;
    trendStrength: bigint;
    candlestickPatterns: Array<CandlestickPattern>;
    acaoSugerida?: string;
    breakouts: boolean;
    resistanceLevels: Array<ResistanceLevel>;
    probabilidadeBaixa?: number;
    entradaExemplo?: number;
    alvoExemplo?: number;
    probabilidadeAlta?: number;
    timestamp: bigint;
    confidencePercentage: bigint;
    image: ExternalBlob;
    operationFollowed?: boolean;
    pullbacks: boolean;
}
export interface UserProfile {
    name: string;
    email?: string;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAnalyses(): Promise<Array<AnalysisResult>>;
    getAnalysisHistory(): Promise<Array<AnalysisResult>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCriteria(): Promise<{
        patternRecognitionSensitivity: bigint;
        confidenceBreakpoint: number;
        supportResistancePadding: number;
        bearishThreshold: number;
        trendStrengthMultiplier: number;
        bullishThreshold: number;
    }>;
    getDailyOperationProgress(userId: Principal): Promise<{
        dailyLimit: bigint;
        completedOperations: bigint;
    }>;
    getGeminiApiKey(): Promise<string | null>;
    getSettings(): Promise<UserSettings>;
    getTopResistanceLevels(): Promise<Array<ResistanceLevel>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setDailyOperationLimit(limit: bigint): Promise<string>;
    setGeminiApiKey(apiKey: string): Promise<string>;
    storeExternalAnalysis(result: AnalysisResult): Promise<void>;
    updateSettings(newSettings: UserSettings): Promise<string>;
}
