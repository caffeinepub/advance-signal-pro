import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { AnalysisResult, UserSettings } from '../backend';

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
      return await actor.addAnalysis(result);
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
