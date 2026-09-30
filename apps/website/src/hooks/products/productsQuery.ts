import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import type { ProductsQuery, ProductsResponse, Product } from '@/types';

export type ProductBundlesResponse = {
  message: string;
  primaryProductId: string;
  items: Product[];
  bundlePrice?: number;
  savings?: number;
};

export function productsListKey(query: ProductsQuery) {
  return ['products', 'list', query] as const;
}

export function productByIdKey(id: string) {
  return ['products', 'byId', id] as const;
}

export function productBundlesKey(id: string) {
  return ['products', 'bundles', id] as const;
}

export function useProducts(
  query: ProductsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery<ProductsResponse>({
    queryKey: productsListKey(query),
    queryFn: async () => {
      return await productsApi.getProducts(query);
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useProductById(id?: string) {
  return useQuery<Product>({
    queryKey: id ? productByIdKey(id) : ['products', 'byId', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing product id');
      return await productsApi.getProductById(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useProductBundles(id?: string) {
  return useQuery<ProductBundlesResponse>({
    queryKey: id ? productBundlesKey(id) : ['products', 'bundles', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing product id');
      return await productsApi.getProductBundles(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
