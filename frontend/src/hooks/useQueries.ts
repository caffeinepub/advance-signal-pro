import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { AnalysisResult, UserSettings } from '../backend';
import { useInternetIdentity } from './useInternetIdentity';

export function useGetAnalyses() {
  const { actor, isFetching } = useActor();

  return useQuery<AnalysisResult[]>({
    queryKey: ['analyses'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAnalyses();
      } catch (error) {
        // Return empty array if user not found (first time user)
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAnalyzeChart() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (result: AnalysisResult) => {
      if (!actor) throw new Error('Actor not initialized');
      return await actor.storeExternalAnalysis(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
  });
}

export function useGetSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return await actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!actor) throw new Error('Actor not initialized');
      return await actor.updateSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useGetGeminiApiKey() {
  const { actor, isFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['geminiApiKey'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getGeminiApiKey();
      } catch (error) {
        // Non-admin users cannot retrieve the key
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetGeminiApiKey() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return await actor.setGeminiApiKey(apiKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geminiApiKey'] });
    },
  });
}

export function useGetDailyOperationProgress() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<{ dailyLimit: bigint; completedOperations: bigint } | null>({
    queryKey: ['dailyOperationProgress', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        return await actor.getDailyOperationProgress(identity.getPrincipal());
      } catch (error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useSetDailyOperationLimit() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (limit: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return await actor.setDailyOperationLimit(limit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dailyOperationProgress'] });
    },
  });
}
