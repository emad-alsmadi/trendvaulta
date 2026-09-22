'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productQAApi, type ProductQAResponse } from '@/lib/api';

export function productQAKey(productId: string) {
  return ['product-qa', productId] as const;
}

/**
 * GET /api/products/:id/qa
 */
export function useProductQA(productId: string) {
  return useQuery<ProductQAResponse>({
    queryKey: productQAKey(productId),
    queryFn: () => productQAApi.getProductQA(productId),
    enabled: !!productId,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * POST /api/products/:id/qa - submit a question
 */
export function useCreateProductQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, question }: { productId: string; question: string }) =>
      productQAApi.createQuestion(productId, question),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: productQAKey(productId) });
    },
  });
}

/**
 * POST /api/qa/:id/helpful - mark as helpful/not helpful
 */
export function useMarkProductQAHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ qaId, helpful }: { qaId: string; helpful: boolean }) =>
      productQAApi.markHelpful(qaId, helpful),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-qa'] });
    },
  });
}
