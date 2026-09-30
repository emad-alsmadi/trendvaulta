import { LayoutGrid, List, TreePine } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n/I18nProvider';

export type ViewMode = 'card' | 'list' | 'tree';

export type ViewToggleProps = {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  availableViews?: ViewMode[];
  className?: string;
  disabled?: boolean;
};

/**
 * Professional view toggle component for switching between card, list, and tree views.
 * Uses lucide-react icons and follows the monochrome design system.
 */
export function ViewToggle({
  currentView,
  onViewChange,
  availableViews = ['card', 'list'],
  className,
  disabled = false,
}: ViewToggleProps) {
  const { t } = useT();

  if (availableViews.length <= 1) return null;

  const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'card', icon: <LayoutGrid className='icon-sm' aria-hidden />, label: t('common.cardView') },
    { mode: 'list', icon: <List className='icon-sm' aria-hidden />, label: t('common.listView') },
    { mode: 'tree', icon: <TreePine className='icon-sm' aria-hidden />, label: t('common.treeView') },
  ];

  const visibleViews = views.filter((v) => availableViews.includes(v.mode));

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-control border border-border bg-card p-1',
        className
      )}
      role='group'
      aria-label={t('common.viewAs')}
    >
      {visibleViews.map((view) => (
        <Button
          key={view.mode}
          variant={currentView === view.mode ? 'primary' : 'ghost'}
          size='sm'
          onClick={() => onViewChange(view.mode)}
          disabled={disabled}
          icon={view.icon}
          aria-label={view.label}
          aria-pressed={currentView === view.mode}
          className={cn(
            'min-w-[2.5rem]',
            currentView === view.mode && 'shadow-sm'
          )}
        />
      ))}
    </div>
  );
}
