import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminBrandsApi,
  adminProductsApi,
  type BrandFormPayload,
  type ProductFormPayload,
} from '../lib/api';

export const ADMIN_BRANDS_KEY = ['admin', 'brands'] as const;
export const ADMIN_PRODUCTS_KEY = ['admin', 'products'] as const;

export function useAdminBrands(params?: {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: [...ADMIN_BRANDS_KEY, params ?? {}] as const,
    queryFn: () => adminBrandsApi.getBrands(params),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateBrandMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandFormPayload) =>
      adminBrandsApi.createBrand(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BRANDS_KEY });
    },
  });
}

export function useUpdateBrandMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<BrandFormPayload>;
    }) => adminBrandsApi.updateBrand(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BRANDS_KEY });
    },
  });
}

export function useDeleteBrandMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBrandsApi.deleteBrand(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BRANDS_KEY });
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}

export function useAdminProducts(params?: {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_KEY, params ?? {}] as const,
    queryFn: () =>
      adminProductsApi.getProducts({
        includeInactive: true,
        ...params,
      }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateProductMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductFormPayload) =>
      adminProductsApi.createProduct(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}

export function useUpdateProductMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ProductFormPayload>;
    }) => adminProductsApi.updateProduct(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}

export function useDeleteProductMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.deleteProduct(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}
