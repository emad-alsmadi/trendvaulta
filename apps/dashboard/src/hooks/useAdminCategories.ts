import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminCategoriesApi,
  type CategoryCreatePayload,
  type CategoryUpdatePayload,
} from '../lib/api';

export const ADMIN_CATEGORIES_KEY = ['admin', 'categories'] as const;

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: () => adminCategoriesApi.getCategories(),
    staleTime: 60_000,
  });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) =>
      adminCategoriesApi.createCategory(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
    },
  });
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      adminCategoriesApi.updateCategory(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
    },
  });
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCategoriesApi.deleteCategory(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
    },
  });
}
