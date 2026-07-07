'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { TemplatesQuery } from '@/types';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/Accordion';

interface FilterSidebarProps {
  filters: TemplatesQuery;
  onFiltersChange: (filters: TemplatesQuery) => void;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
}: FilterSidebarProps) {
  const [local, setLocal] = useState(filters);

  const handleChange = (key: keyof TemplatesQuery, value: any) => {
    const newFilters = { ...local, [key]: value };
    setLocal(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClear = () => {
    const cleared = {};
    setLocal(cleared);
    onFiltersChange(cleared);
  };

  return (
    <aside className='w-full rounded-3xl bg-gradient-to-br from-amber-500/25 via-fuchsia-500/20 to-cyan-500/25 p-[1px]'>
      <div className='space-y-4 rounded-3xl border border-white/40 bg-white/45 p-5 shadow-sm backdrop-blur-xl'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-extrabold tracking-tight text-indigo-950'>
            Filters
          </h2>
          <Button
            variant='outline'
            onClick={handleClear}
            className='h-9 rounded-full border-white/50 bg-white/60 px-4 font-extrabold text-indigo-950 hover:bg-white'
          >
            Reset
          </Button>
        </div>

        <Accordion
          type='multiple'
          className='space-y-2'
          defaultValue={['search', 'price', 'sort']}
        >
          <AccordionItem
            value='search'
            className='rounded-2xl border border-white/30 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10'
          >
            <AccordionTrigger>Search</AccordionTrigger>
            <AccordionContent>
              <Input
                placeholder='Search templates...'
                value={local.q || ''}
                onChange={(e) => handleChange('q', e.target.value)}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value='price'
            className='rounded-2xl border border-white/30 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-fuchsia-500/10'
          >
            <AccordionTrigger>Price range</AccordionTrigger>
            <AccordionContent>
              <div className='grid gap-3'>
                <div>
                  <label className='mb-2 block text-xs font-extrabold uppercase tracking-wider text-indigo-900/80'>
                    Min
                  </label>
                  <Input
                    type='number'
                    placeholder='0'
                    value={local.minPrice ?? ''}
                    onChange={(e) =>
                      handleChange(
                        'minPrice',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </div>
                <div>
                  <label className='mb-2 block text-xs font-extrabold uppercase tracking-wider text-indigo-900/80'>
                    Max
                  </label>
                  <Input
                    type='number'
                    placeholder='100'
                    value={local.maxPrice ?? ''}
                    onChange={(e) =>
                      handleChange(
                        'maxPrice',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value='sort'
            className='rounded-2xl border border-white/30 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10'
          >
            <AccordionTrigger>Sort</AccordionTrigger>
            <AccordionContent>
              <select
                className='w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-extrabold text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
                value={local.sort || 'createdAt'}
                onChange={(e) => handleChange('sort', e.target.value)}
              >
                <option value='createdAt'>Newest</option>
                <option value='-createdAt'>Oldest</option>
                <option value='price'>Price: Low to High</option>
                <option value='-price'>Price: High to Low</option>
                <option value='title'>Title A-Z</option>
                <option value='-title'>Title Z-A</option>
              </select>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
