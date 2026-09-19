import { useQuery } from '@tanstack/react-query';
import { helpTopicsApi } from '@/lib/api';
import type { DemoHelpTopic } from '@/data/demoStorefront';

export type HelpTopicsQueryParams = {
  active?: boolean;
};

export function helpTopicsKey(params: HelpTopicsQueryParams = {}) {
  return ['help-topics', params] as const;
}

function mapHelpTopicToDemo(topic: {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon?: string;
}): DemoHelpTopic {
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    href: topic.href,
    icon: (topic.icon || 'truck') as DemoHelpTopic['icon'],
  };
}

/** Active storefront help topics for the help center page */
export function useHelpTopics(params: HelpTopicsQueryParams = { active: true }) {
  return useQuery<DemoHelpTopic[]>({
    queryKey: helpTopicsKey(params),
    queryFn: async () => {
      const res = await helpTopicsApi.getHelpTopics(params);
      return (res.topics ?? []).map(mapHelpTopicToDemo);
    },
    staleTime: 60_000,
    retry: 1,
  });
}
