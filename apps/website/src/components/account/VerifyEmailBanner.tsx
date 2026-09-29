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
      className='flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between'
    >
      <div className='flex items-start gap-3'>
        <MailWarning className='mt-0.5 h-5 w-5 shrink-0 text-amber-700' aria-hidden />
        <div>
          <h2 id='verify-banner-title' className='text-sm font-extrabold text-amber-900'>
            {t('account.verifyBanner.title')}
          </h2>
          <p className='text-sm font-semibold text-amber-900/80'>
            {t('account.verifyBanner.body', { email })}
          </p>
        </div>
      </div>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={sending}
        onClick={() => void resend()}
        className='self-start sm:self-auto'
      >
        {sending ? t('account.verifyBanner.sending') : t('account.verifyBanner.resend')}
      </Button>
    </section>
  );
}
