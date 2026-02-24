import { useGetSettings, useUpdateSettings } from './useQueries';
import type { UserSettings } from '../backend';

export function useSettings() {
  const { data: settings, isLoading, isFetched } = useGetSettings();
  const updateMutation = useUpdateSettings();

  const updateSettings = async (newSettings: UserSettings) => {
    await updateMutation.mutateAsync(newSettings);
  };

  return {
    settings,
    isLoading,
    isFetched,
    isUpdating: updateMutation.isPending,
    updateSettings,
  };
}
