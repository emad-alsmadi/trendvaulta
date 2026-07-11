'use client';

import { Check, X, Clock } from 'lucide-react';

export interface LicenseType {
  _id: string;
  name: string;
  slug: string;
  priceMultiplier: number;
  description: string;
  features: string[];
  restrictions: string[];
  supportDuration: number;
}

interface LicenseInfoProps {
  license: LicenseType;
  basePrice: number;
}

export function LicenseInfo({ license, basePrice }: LicenseInfoProps) {
  const finalPrice = (basePrice * license.priceMultiplier).toFixed(2);

  return (
    <div className='bg-white rounded-lg border border-slate-200 p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-bold text-gray-900'>{license.name}</h3>
        <div className='text-2xl font-bold bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent'>
          ${finalPrice}
        </div>
      </div>

      <p className='text-gray-600 mb-6'>{license.description}</p>

      <div className='space-y-3 mb-6'>
        <h4 className='font-semibold text-gray-900 flex items-center gap-2'>
          <Check className='h-5 w-5 text-green-500' />
          Included Features
        </h4>
        {license.features.map((feature) => (
          <div
            key={feature}
            className='flex items-start gap-2 text-sm text-gray-700'
          >
            <Check className='h-4 w-4 text-green-500 mt-0.5 shrink-0' />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {license.restrictions.length > 0 && (
        <div className='space-y-3 mb-6'>
          <h4 className='font-semibold text-gray-900 flex items-center gap-2'>
            <X className='h-5 w-5 text-red-500' />
            Restrictions
          </h4>
          {license.restrictions.map((restriction) => (
            <div
              key={restriction}
              className='flex items-start gap-2 text-sm text-gray-700'
            >
              <X className='h-4 w-4 text-red-500 mt-0.5 shrink-0' />
              <span>{restriction}</span>
            </div>
          ))}
        </div>
      )}

      <div className='pt-4 border-t border-slate-200'>
        <div className='flex items-center gap-2 text-sm text-gray-600'>
          <Clock className='h-4 w-4' />
          <span>{license.supportDuration} months of support included</span>
        </div>
      </div>
    </div>
  );
}
