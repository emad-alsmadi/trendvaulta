'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { authApi } from '@/lib/api';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';

/**
 * Shown across /user while the account's email is unconfirmed. Checkout
 * works regardless; reviews and returns need the confirmation (plan D5).
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast(t('account.verifyBanner.sent'), { variant: 'success' });
    } catch (err) {
      toast(getUserFacingErrorMessage(err, t('errors.mailUnavailable'), t), {
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-labelledby='verify-banner-title'
      // A square, ruled band the full width of its parent; UserShell places
      // it edge to edge under the account header.
      className='border-b border-amber-200 bg-amber-50 px-4 sm:px-6 lg:px-20'
    >
      <div className='mx-auto flex max-w-[1400px] flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-start gap-3'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-amber-100 text-amber-800'>
          <MailWarning className='h-5 w-5' strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h2 id='verify-banner-title' className='text-sm font-semibold text-amber-950'>
            {t('account.verifyBanner.title')}
          </h2>
          <p className='mt-0.5 text-sm text-amber-900/80'>
            {t('account.verifyBanner.body', { email })}
          </p>
        </div>
      </div>
      <Button
        type='button'
        variant='solid'
        size='sm'
        disabled={sending}
        onClick={() => void resend()}
        className='shrink-0 self-start rounded-none px-5 sm:self-auto'
      >
        {sending ? t('account.verifyBanner.sending') : t('account.verifyBanner.resend')}
      </Button>
      </div>
    </section>
  );
}
