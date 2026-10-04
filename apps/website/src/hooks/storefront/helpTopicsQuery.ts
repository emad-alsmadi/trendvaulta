import { useQuery } from '@tanstack/react-query';
import { helpTopicsApi, type HelpTopic } from '@/lib/api';
import type { DemoHelpTopic } from '@/data/demoStorefront';
import type { Locale } from '@/lib/locale';

export type HelpTopicsQueryParams = {
  active?: boolean;
};

export function helpTopicsKey(params: HelpTopicsQueryParams = {}) {
  return ['help-topics', params] as const;
}

function mapHelpTopicToDemo(topic: HelpTopic): DemoHelpTopic {
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    href: topic.href,
    icon: (topic.icon || 'truck') as DemoHelpTopic['icon'],
    translations: topic.translations,
  };
}

/**
 * Title/description in the reader's language. Each field falls back to
 * English on its own (same pattern as localizeContent,
 * hooks/storefront/contentQuery.ts) so a half-translated topic still reads
 * as a whole card rather than mixing an empty Arabic field into English copy.
 */
export function localizeHelpTopic(topic: DemoHelpTopic, locale: Locale) {
  const ar = locale === 'ar' ? topic.translations?.ar : undefined;
  return {
    title: ar?.title?.trim() || topic.title,
    description: ar?.description?.trim() || topic.description,
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
  });
}
