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
      } catch {
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

export function useGetDailyOperationProgress() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<{ dailyLimit: bigint; completedOperations: bigint } | null>({
    queryKey: ['dailyOperationProgress', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        return await actor.getDailyOperationProgress(identity.getPrincipal());
      } catch {
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
