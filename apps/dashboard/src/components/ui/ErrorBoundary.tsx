import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { reportError } from '../../lib/sentry';
import { Button } from './Button';
import { Alert } from './Alert';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Function component so the fallback can use the translation hook. */
// eslint-disable-next-line react-refresh/only-export-components -- private fallback for the class boundary below
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <Alert
      tone='error'
      title={t('errorBoundary.title')}
      action={
        <Button variant='primary' size='sm' icon={<RotateCcw aria-hidden />} onClick={onRetry}>
          {t('errorBoundary.retry')}
        </Button>
      }
    >
      {t('errorBoundary.body')}
    </Alert>
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
