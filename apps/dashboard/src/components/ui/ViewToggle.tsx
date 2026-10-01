import { LayoutGrid, List, ListTree } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n/I18nProvider';
import { focusRing } from './styles';

export type ViewMode = 'card' | 'list' | 'tree';

export type ViewToggleProps = {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  availableViews?: ViewMode[];
  className?: string;
  disabled?: boolean;
};

/** Segmented icon toggle between card, list and tree views. */
export function ViewToggle({
  currentView,
  onViewChange,
  availableViews = ['card', 'list'],
  className,
  disabled = false,
}: ViewToggleProps) {
  const { t } = useT();

  if (availableViews.length <= 1) return null;

  const views = [
    { mode: 'card' as const, Icon: LayoutGrid, label: t('common.cardView') },
    { mode: 'list' as const, Icon: List, label: t('common.listView') },
    { mode: 'tree' as const, Icon: ListTree, label: t('common.treeView') },
  ].filter((v) => availableViews.includes(v.mode));

  return (
    <div
      className={cn(
        'inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-muted p-0.5',
        className,
      )}
      role='group'
      aria-label={t('common.viewAs')}
    >
      {views.map(({ mode, Icon, label }) => {
        const selected = currentView === mode;
        return (
          <button
            key={mode}
            type='button'
            onClick={() => onViewChange(mode)}
            disabled={disabled}
            aria-label={label}
            title={label}
            aria-pressed={selected}
            className={cn(
              'inline-flex h-full w-9 items-center justify-center rounded transition-colors duration-fast',
              'disabled:cursor-not-allowed disabled:opacity-50',
              focusRing,
              selected
                ? 'border border-border bg-background text-foreground shadow-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon
              className='size-4'
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
