import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { authorsApi } from '@/lib/api';
import type { Creator, CreatorsQuery, CreatorsResponse } from '@/types';

export const CREATORS_LIST_KEY = ['creators', 'list'] as const;

export function creatorsListKey(query: CreatorsQuery) {
  return ['creators', 'list', query] as const;
}

export function creatorByIdKey(id: string) {
  return ['creators', 'byId', id] as const;
}

export function useCreators(query: CreatorsQuery) {
  return useQuery<CreatorsResponse>({
    queryKey: creatorsListKey(query),
    queryFn: async () => {
      return await authorsApi.getAuthors(query);
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreatorById(id?: string) {
  return useQuery<Creator>({
    queryKey: id ? creatorByIdKey(id) : ['creators', 'byId', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing creator id');
      const data = await authorsApi.getAuthorById(id);
      return data as Creator;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}
