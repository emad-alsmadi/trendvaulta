'use client';

import { useState, useEffect } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider';

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthErrorHandler />
          {children}
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
