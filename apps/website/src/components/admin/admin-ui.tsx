'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export function AdminPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-3xl border border-white/35 bg-white/45 p-5 shadow-sm backdrop-blur-xl sm:p-6'>
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-extrabold text-indigo-950'>{title}</h2>
          {description ? (
            <p className='mt-1 text-sm font-semibold text-indigo-950/70'>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminField({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className='block text-sm font-extrabold text-indigo-950/80'>
        {label}
      </label>
      {children}
      {error ? (
        <p className='text-sm font-semibold text-rose-700'>{error}</p>
      ) : null}
    </div>
  );
}

export function AdminTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[96px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function AdminSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function AdminLoading() {
  return (
    <div className='flex items-center justify-center py-16'>
      <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  return (
    <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900'>
      {message}
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center p-4'>
      <button
        type='button'
        aria-label='Close dialog backdrop'
        className='absolute inset-0 bg-indigo-950/40 backdrop-blur-sm'
        onClick={onClose}
      />
      <div className='relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl'>
        <h3 className='text-xl font-extrabold text-indigo-950'>{title}</h3>
        <div className='mt-5 space-y-4'>{children}</div>
        <div className='mt-6 flex flex-wrap justify-end gap-3'>{footer}</div>
      </div>
    </div>
  );
}

export function AdminTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className='rounded-2xl border border-dashed border-indigo-200/70 bg-white/40 px-4 py-10 text-center text-sm font-semibold text-indigo-950/65'>
        No records yet.
      </div>
    );
  }

  return (
    <div className='overflow-x-auto rounded-2xl border border-white/30'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-white/60'>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className='px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-indigo-900/5'>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminRowActions({
  onEdit,
  onDelete,
  deleteLabel = 'Delete',
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button
        type='button'
        size='sm'
        variant='destructive'
        onClick={onDelete}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}

export { Input as AdminInput };
