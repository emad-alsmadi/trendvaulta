import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type {
  CreatorPayload,
  TemplatePayload,
  UserUpdatePayload,
} from '@/types';

export const ADMIN_TEMPLATES_KEY = ['admin', 'templates'] as const;
export const ADMIN_CREATORS_KEY = ['admin', 'creators'] as const;
export const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useAdminTemplates() {
  return useQuery({
    queryKey: ADMIN_TEMPLATES_KEY,
    queryFn: () => adminApi.getTemplates(),
    staleTime: 30_000,
  });
}

export function useAdminCreators() {
  return useQuery({
    queryKey: ADMIN_CREATORS_KEY,
    queryFn: () => adminApi.getCreators(),
    staleTime: 30_000,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: () => adminApi.getUsers(),
    staleTime: 30_000,
  });
}

export function useCreateTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplatePayload) => adminApi.createTemplate(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TEMPLATES_KEY });
      await qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<TemplatePayload>;
    }) => adminApi.updateTemplate(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TEMPLATES_KEY });
      await qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteTemplate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TEMPLATES_KEY });
      await qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useCreateCreatorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatorPayload) => adminApi.createCreator(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CREATORS_KEY });
      await qc.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useUpdateCreatorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreatorPayload>;
    }) => adminApi.updateCreator(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CREATORS_KEY });
      await qc.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useDeleteCreatorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCreator(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CREATORS_KEY });
      await qc.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UserUpdatePayload;
    }) => adminApi.updateUser(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}
