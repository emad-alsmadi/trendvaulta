'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

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

interface LicenseSelectorProps {
  licenseTypes: LicenseType[];
  basePrice: number;
  selectedLicense: string;
  onLicenseSelect: (slug: string) => void;
}

export function LicenseSelector({
  licenseTypes,
  basePrice,
  selectedLicense,
  onLicenseSelect,
}: LicenseSelectorProps) {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {licenseTypes.map((license) => {
          const finalPrice = (basePrice * license.priceMultiplier).toFixed(2);
          const isSelected = selectedLicense === license.slug;
          const isPopular = license.slug === 'commercial';

          return (
            <div
              key={license._id}
              onClick={() => onLicenseSelect(license.slug)}
              className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all duration-300 ${
                isSelected
                  ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-fuchsia-50 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {isPopular && (
                <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                  <span className='inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 px-3 py-1 text-xs font-bold text-white'>
                    POPULAR
                  </span>
                </div>
              )}

              <div className='mb-4'>
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  {license.name}
                </h3>
                <div className='text-3xl font-bold bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent'>
                  ${finalPrice}
                </div>
              </div>

              <p className='text-sm text-gray-600 mb-4'>
                {license.description}
              </p>

              <div className='space-y-2 mb-4'>
                {license.features.map((feature) => (
                  <div
                    key={feature}
                    className='flex items-start gap-2'
                  >
                    <Check className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
                    <span className='text-sm text-gray-700'>{feature}</span>
                  </div>
                ))}
              </div>

              {license.restrictions.length > 0 && (
                <div className='space-y-2 mb-4'>
                  {license.restrictions.map((restriction) => (
                    <div
                      key={restriction}
                      className='flex items-start gap-2'
                    >
                      <X className='h-4 w-4 text-red-500 mt-0.5 flex-shrink-0' />
                      <span className='text-sm text-gray-700'>
                        {restriction}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className='pt-4 border-t border-slate-200'>
                <div className='text-xs text-gray-500'>
                  {license.supportDuration} months support included
                </div>
              </div>

              <div className='mt-4'>
                <div
                  className={`w-full rounded-lg py-3 text-center font-medium transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 text-white'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
