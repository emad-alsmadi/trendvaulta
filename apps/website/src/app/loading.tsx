export default function Loading() {
  return (
    <div
      role='status'
      aria-live='polite'
      className='mx-auto max-w-7xl animate-pulse space-y-6 py-8'
    >
      <span className='sr-only'>Loading…</span>
      <div className='h-8 w-56 rounded bg-gray-200' />
      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='h-64 rounded-2xl bg-gray-200' />
        ))}
      </div>
    </div>
  );
}
