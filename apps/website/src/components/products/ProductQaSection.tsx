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

function askerName(item: ProductQAItem): string {
  return item.askedBy?.username || item.askedBy?.name || 'A shopper';
}

/**
 * PDP questions & answers — GET /api/products/:id/qa (approved only),
 * POST /api/products/:id/qa to ask, POST /api/qa/:id/helpful to vote.
 */
export function ProductQaSection({ productId }: Props) {
  const pathname = usePathname();
  const { toast } = useToast();
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
      toast('Question submitted. It will appear once approved.', {
        variant: 'success',
      });
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not submit your question'), {
        variant: 'error',
      });
    }
  };

  const handleHelpful = async (qaId: string) => {
    if (!isAuthenticated) {
      toast('Sign in to vote on answers', { variant: 'info' });
      return;
    }
    try {
      await markHelpful.mutateAsync({ qaId, helpful: true });
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not record your vote'), {
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
            Customer Q&amp;A
          </p>
          <h2
            id='pdp-qa-heading'
            className='mt-1 text-2xl font-bold text-stone-900'
          >
            Questions &amp; answers
          </h2>
          <p className='mt-1 text-sm font-semibold text-stone-600'>
            Answers come from our team. Questions appear after moderation.
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
              {askOpen ? 'Close' : 'Ask a question'}
            </Button>
          ) : (
            <Link
              href={buildLoginUrl(pathname)}
              className='text-sm font-bold text-fuchsia-700 hover:underline'
            >
              Sign in to ask
            </Link>
          )}
          <Link
            href='/help'
            className='text-sm font-bold text-fuchsia-700 hover:underline'
          >
            Help Center
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
            Your question
          </label>
          <textarea
            id='pdp-qa-question'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={QUESTION_MAX}
            placeholder='What would you like to know about this product?'
            className='w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-200'
            disabled={createQuestion.isPending}
          />
          <div className='mt-2 flex items-center justify-between gap-3'>
            <span className='text-xs text-stone-500'>
              {trimmed.length}/{QUESTION_MAX} · at least {QUESTION_MIN}{' '}
              characters
            </span>
            <Button type='submit' size='sm' disabled={!canSubmit}>
              {createQuestion.isPending ? 'Submitting…' : 'Submit question'}
            </Button>
          </div>
        </form>
      )}

      {qaQuery.isLoading ? (
        <div className='flex items-center gap-2 py-4 text-sm text-stone-500'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          Loading questions…
        </div>
      ) : qaQuery.error ? (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
          <span>Questions could not be loaded right now.</span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => qaQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className='text-sm text-stone-600'>
          No questions yet. Be the first to ask about this product.
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
                  Asked by {askerName(item)}
                </p>
                {item.answer ? (
                  <p className='whitespace-pre-line'>{item.answer}</p>
                ) : (
                  <p className='italic text-stone-500'>
                    Our team hasn&apos;t answered this yet.
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
                    Helpful ({item.helpful ?? 0})
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
