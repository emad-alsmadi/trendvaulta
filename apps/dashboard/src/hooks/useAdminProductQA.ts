import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminProductQAApi, type ProductQAAnswerPayload } from '../lib/api';

export const ADMIN_PRODUCT_QA_KEY = ['admin', 'product-qa'] as const;

export function useAdminProductQA(params?: { page?: number; limit?: number; productId?: string; approved?: string }) {
  return useQuery({
    queryKey: [...ADMIN_PRODUCT_QA_KEY, params ?? {}] as const,
    queryFn: () => adminProductQAApi.getProductQA(params),
    staleTime: 30_000,
  });
}

export function useAnswerProductQAMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ProductQAAnswerPayload;
    }) => adminProductQAApi.answerProductQA(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCT_QA_KEY });
    },
  });
}

export function useDeleteProductQAMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductQAApi.deleteProductQA(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCT_QA_KEY });
    },
  });
}
