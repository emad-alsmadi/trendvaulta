'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Loader2, ThumbsUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  useCreateProductQuestion,
  useMarkProductQAHelpful,
  useProductQA,
} from '@/hooks/storefront/productQAQuery';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import type { ProductQAItem } from '@/lib/api';

type Props = {
  productId: string;
};

const QUESTION_MIN = 10;
const QUESTION_MAX = 500;

function askerName(item: ProductQAItem, fallback: string): string {
  return item.askedBy?.username || item.askedBy?.name || fallback;
}

/**
 * PDP questions & answers — GET /api/products/:id/qa (approved only),
 * POST /api/products/:id/qa to ask, POST /api/qa/:id/helpful to vote.
 */
export function ProductQaSection({ productId }: Props) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isAuthenticated = Boolean(getAuthToken());

  const qaQuery = useProductQA(productId);
  const createQuestion = useCreateProductQuestion();
  const markHelpful = useMarkProductQAHelpful();

  const [question, setQuestion] = useState('');
  const [askOpen, setAskOpen] = useState(false);

  const items = qaQuery.data?.results ?? [];
  const trimmed = question.trim();
  const canSubmit =
    trimmed.length >= QUESTION_MIN &&
    trimmed.length <= QUESTION_MAX &&
    !createQuestion.isPending;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await createQuestion.mutateAsync({ productId, question: trimmed });
      setQuestion('');
      setAskOpen(false);
      toast(t('productQa.submitted'), {
        variant: 'success',
      });
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, t('productQa.submitError'), t), {
        variant: 'error',
      });
    }
  };

  const handleHelpful = async (qaId: string) => {
    if (!isAuthenticated) {
      toast(t('productQa.signInToVote'), { variant: 'info' });
      return;
    }
    try {
      await markHelpful.mutateAsync({ qaId, helpful: true });
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, t('productQa.voteError'), t), {
        variant: 'error',
      });
    }
  };

  return (
    <section
      aria-labelledby='pdp-qa-heading'
      className='mb-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm sm:p-8'
    >
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-stone-500'>
            <HelpCircle className='h-3.5 w-3.5' aria-hidden />
            {t('productQa.eyebrow')}
          </p>
          <h2
            id='pdp-qa-heading'
            className='mt-1 text-2xl font-bold text-stone-900'
          >
            {t('productQa.title')}
          </h2>
          <p className='mt-1 text-sm font-semibold text-stone-600'>
            {t('productQa.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {isAuthenticated ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setAskOpen((v) => !v)}
            >
              {askOpen ? t('confirmDialog.close') : t('productQa.askQuestion')}
            </Button>
          ) : (
            <Link
              href={buildLoginUrl(pathname)}
              className='text-sm font-bold text-fuchsia-700 hover:underline'
            >
              {t('productQa.signInToAsk')}
            </Link>
          )}
          <Link
            href='/help'
            className='text-sm font-bold text-fuchsia-700 hover:underline'
          >
            {t('productQa.helpCenter')}
          </Link>
        </div>
      </div>

      {askOpen && isAuthenticated && (
        <form
          onSubmit={handleAsk}
          className='mb-6 rounded-xl border border-stone-200 bg-stone-50/60 p-4'
        >
          <label
            htmlFor='pdp-qa-question'
            className='mb-2 block text-sm font-semibold text-stone-800'
          >
            {t('productQa.questionLabel')}
          </label>
          <textarea
            id='pdp-qa-question'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={QUESTION_MAX}
            placeholder={t('productQa.questionPlaceholder')}
            className='w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-200'
            disabled={createQuestion.isPending}
          />
          <div className='mt-2 flex items-center justify-between gap-3'>
            <span className='text-xs text-stone-500'>
              {t('productQa.charCount', {
                count: trimmed.length,
                max: QUESTION_MAX,
                min: QUESTION_MIN,
              })}
            </span>
            <Button type='submit' size='sm' disabled={!canSubmit}>
              {createQuestion.isPending
                ? t('productQa.submitting')
                : t('productQa.submitQuestion')}
            </Button>
          </div>
        </form>
      )}

      {qaQuery.isLoading ? (
        <div role='status' className='flex items-center gap-2 py-4 text-sm text-stone-500'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          {t('productQa.loading')}
        </div>
      ) : qaQuery.error ? (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
          <span>{t('productQa.loadError')}</span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => qaQuery.refetch()}
          >
            {t('productQa.retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className='text-sm text-stone-600'>
          {t('productQa.empty')}
        </p>
      ) : (
        <Accordion
          type='single'
          collapsible
          className='space-y-2'
          defaultValue={items[0]?._id}
        >
          {items.map((item) => (
            <AccordionItem
              key={item._id}
              value={item._id}
              className='rounded-xl border border-stone-200 bg-stone-50/50'
            >
              <AccordionTrigger className='text-stone-900 hover:bg-stone-100/80'>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className='text-stone-700'>
                <p className='mb-2 text-xs text-stone-500'>
                  {t('productQa.askedBy', {
                    name: askerName(item, t('productQa.anonymousAsker')),
                  })}
                </p>
                {item.answer ? (
                  <p className='whitespace-pre-line'>{item.answer}</p>
                ) : (
                  <p className='italic text-stone-500'>
                    {t('productQa.notAnswered')}
                  </p>
                )}
                {item.answer && (
                  <button
                    type='button'
                    onClick={() => handleHelpful(item._id)}
                    disabled={markHelpful.isPending}
                    className='mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-fuchsia-700 disabled:opacity-60'
                  >
                    <ThumbsUp className='h-3.5 w-3.5' aria-hidden />
                    {t('productQa.helpful', { count: item.helpful ?? 0 })}
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}
