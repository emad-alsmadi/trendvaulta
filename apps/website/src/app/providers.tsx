'use client';

import { useState, useEffect } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { MotionConfig } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider';
import { TranslationProvider } from '@/contexts/TranslationContext';
import type { Locale } from '@/lib/locale';

/**
 * One retry for network errors and 5xx; none for 4xx, where asking again
 * gets the same answer (404, 403, 400, 429…). Hooks rely on this default.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return !(status && status >= 400 && status < 500);
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetryQuery },
    },
  });
}

function AuthErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthToast = (event: CustomEvent) => {
      const { message, title, variant } = event.detail;
      toast(message, { title, variant });
    };

    window.addEventListener('showAuthToast', handleAuthToast as EventListener);

    return () => {
      window.removeEventListener(
        'showAuthToast',
        handleAuthToast as EventListener,
      );
    };
  }, [toast]);

  return null;
}

export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider initialLocale={locale}>
        {/* Honour the OS "reduce motion" setting for every framer-motion
            animation on the storefront (transforms are skipped). */}
        <MotionConfig reducedMotion='user'>
          <ToastProvider>
            <ConfirmProvider>
              <AuthErrorHandler />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </MotionConfig>
      </TranslationProvider>
    </QueryClientProvider>
  );
}
