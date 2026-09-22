import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi, type StoreSettingsPayload } from '../lib/api';

export const ADMIN_SETTINGS_KEY = ['admin', 'settings'] as const;

export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: () => adminSettingsApi.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateStoreSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StoreSettingsPayload) =>
      adminSettingsApi.updateSettings(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
    },
  });
}
