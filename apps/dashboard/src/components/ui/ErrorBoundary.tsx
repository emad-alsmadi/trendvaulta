import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { reportError } from '../../lib/sentry';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Function component so the fallback can use the translation hook. */
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <div
      role='alert'
      className='rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
    >
      <div className='mb-2 flex items-center gap-2 font-semibold'>
        <AlertCircle className='h-5 w-5' aria-hidden='true' />
        {t('errorBoundary.title')}
      </div>
      <p className='mb-4 text-sm'>{t('errorBoundary.body')}</p>
      <button
        type='button'
        onClick={onRetry}
        className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'
      >
        {t('errorBoundary.retry')}
      </button>
    </div>
  );
}

/**
 * Catches render errors in a page so one broken screen doesn't blank the
 * whole dashboard (sidebar included). Mount with `key={pathname}` so
 * navigating away resets it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard page crashed:', error, info.componentStack);
    reportError(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
  }
}
