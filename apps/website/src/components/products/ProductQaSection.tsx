'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, MessageCircleQuestion, ThumbsUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  useCreateProductQuestion,
  useMarkProductQAHelpful,
  useProductQA,
} from '@/hooks/storefront/productQAQuery';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import type { ProductQAItem } from '@/lib/api';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { ListSkeleton } from '@/components/ui/Skeleton';

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
  const isAuthenticated = useHasAuthToken();

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
      className='grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16'
    >
      {/* Heading column — mirrors the reviews section above */}
      <div className='lg:sticky lg:top-24 lg:self-start'>
        <p className='inline-flex items-center gap-1.5 text-eyebrow uppercase text-ink-muted rtl:tracking-normal'>
          <HelpCircle className='h-3.5 w-3.5' aria-hidden />
          {t('productQa.eyebrow')}
        </p>
        <h2
          id='pdp-qa-heading'
          className='mt-2 text-2xl font-semibold tracking-tight text-ink'
        >
          {t('productQa.title')}
        </h2>
        <p className='mt-2 text-sm leading-relaxed text-ink-muted'>
          {t('productQa.subtitle')}
        </p>

        <div className='mt-6 space-y-4 border-t border-line pt-6'>
          {isAuthenticated ? (
            <Button
              type='button'
              variant='line'
              className='w-full'
              onClick={() => setAskOpen((v) => !v)}
            >
              <MessageCircleQuestion className='h-4 w-4' aria-hidden />
              {askOpen ? t('confirmDialog.close') : t('productQa.askQuestion')}
            </Button>
          ) : (
            <Link
              href={buildLoginUrl(pathname)}
              className='block text-sm font-semibold text-ink underline underline-offset-4 hover:text-accent'
            >
              {t('productQa.signInToAsk')}
            </Link>
          )}
          <Link
            href='/help'
            className='block text-sm text-ink-muted underline underline-offset-4 hover:text-ink'
          >
            {t('productQa.helpCenter')}
          </Link>
        </div>
      </div>

      <div className='min-w-0'>
        {askOpen && isAuthenticated && (
          <form
            onSubmit={handleAsk}
            className='mb-8 rounded-card bg-surface-muted p-5 sm:p-6'
          >
            <label
              htmlFor='pdp-qa-question'
              className='mb-2 block text-sm font-semibold text-ink'
            >
              {t('productQa.questionLabel')}
            </label>
            <Textarea
              id='pdp-qa-question'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={QUESTION_MAX}
              placeholder={t('productQa.questionPlaceholder')}
              disabled={createQuestion.isPending}
            />
            <div className='mt-3 flex items-center justify-between gap-3'>
              <span className='text-xs tabular-nums text-ink-muted'>
                {t('productQa.charCount', {
                  count: trimmed.length,
                  max: QUESTION_MAX,
                  min: QUESTION_MIN,
                })}
              </span>
              <Button
                type='submit'
                variant='solid'
                size='sm'
                disabled={!canSubmit}
              >
                {createQuestion.isPending
                  ? t('productQa.submitting')
                  : t('productQa.submitQuestion')}
              </Button>
            </div>
          </form>
        )}

        {qaQuery.isLoading ? (
          <ListSkeleton rows={2} thumb={false} label={t('productQa.loading')} className='py-2' />
        ) : qaQuery.error ? (
          <div className='flex flex-wrap items-center gap-3 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
            <span>{t('productQa.loadError')}</span>
            <Button
              type='button'
              size='sm'
              variant='line'
              onClick={() => qaQuery.refetch()}
            >
              {t('productQa.retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-card bg-surface-muted px-6 py-12 text-center'>
            <p className='text-sm text-ink-muted'>{t('productQa.empty')}</p>
          </div>
        ) : (
          <Accordion
            type='single'
            collapsible
            className='border-t border-line'
            defaultValue={items[0]?._id}
          >
            {items.map((item) => (
              <AccordionItem
                key={item._id}
                value={item._id}
                className='border-b border-line'
              >
                <AccordionTrigger className='gap-4 rounded-none px-0 py-5 text-base font-semibold text-ink hover:bg-transparent [&>svg]:shrink-0 [&>svg]:text-ink-muted [&[data-state=open]>svg]:rotate-180'>
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className='px-0 pb-6 font-normal text-ink-muted'>
                  <div className='rounded-control border-s-2 border-ink bg-surface-muted px-4 py-3'>
                    {item.answer ? (
                      <p className='whitespace-pre-line leading-relaxed text-ink/85'>
                        {item.answer}
                      </p>
                    ) : (
                      <p className='italic'>{t('productQa.notAnswered')}</p>
                    )}
                  </div>
                  <div className='mt-3 flex flex-wrap items-center justify-between gap-3 text-xs'>
                    <span>
                      {t('productQa.askedBy', {
                        name: askerName(item, t('productQa.anonymousAsker')),
                      })}
                    </span>
                    {item.answer && (
                      <button
                        type='button'
                        onClick={() => handleHelpful(item._id)}
                        disabled={markHelpful.isPending}
                        className='inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-ink transition-colors hover:border-ink-subtle hover:bg-surface-muted disabled:opacity-60'
                      >
                        <ThumbsUp className='h-3.5 w-3.5' aria-hidden />
                        {t('productQa.helpful', { count: item.helpful ?? 0 })}
                      </button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
}
