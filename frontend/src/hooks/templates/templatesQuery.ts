import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/lib/api';
import type { TemplatesQuery, TemplatesResponse, Template } from '@/types';

export function templatesListKey(query: TemplatesQuery) {
  return ['templates', 'list', query] as const;
}

export function templateByIdKey(id: string) {
  return ['templates', 'byId', id] as const;
}

export function useTemplates(query: TemplatesQuery) {
  return useQuery<TemplatesResponse>({
    queryKey: templatesListKey(query),
    queryFn: async () => {
      return await templatesApi.getTemplates(query);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTemplateById(id?: string) {
  return useQuery<Template>({
    queryKey: id ? templateByIdKey(id) : ['templates', 'byId', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing template id');
      return await templatesApi.getTemplateById(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}
