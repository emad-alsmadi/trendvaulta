'use client';

import { useState } from 'react';
import { LicenseSelector } from '@/components/LicenseSelector';

export default function TestLicensesPage() {
  const [selectedLicense, setSelectedLicense] = useState('personal');
  const basePrice = 29;

  const licenseTypes = [
    {
      _id: '1',
      name: 'Personal',
      slug: 'personal',
      priceMultiplier: 1,
      description: 'Perfect for personal projects and non-commercial use',
      features: [
        'Use in unlimited personal projects',
        'Lifetime updates',
        '6 months support',
        'Single end product',
      ],
      restrictions: [
        'Cannot be used for commercial purposes',
        'Cannot resell or redistribute',
        'Cannot be used in client projects',
      ],
      supportDuration: 6,
    },
    {
      _id: '2',
      name: 'Commercial',
      slug: 'commercial',
      priceMultiplier: 5,
      description: 'Ideal for commercial projects and client work',
      features: [
        'Use in unlimited commercial projects',
        'Use in client projects',
        'Lifetime updates',
        '6 months support',
        'Create multiple end products',
      ],
      restrictions: [
        'Cannot resell or redistribute',
        'Cannot claim as your own design',
      ],
      supportDuration: 6,
    },
    {
      _id: '3',
      name: 'Extended',
      slug: 'extended',
      priceMultiplier: 10,
      description: 'For agencies and large-scale commercial use',
      features: [
        'All Commercial license benefits',
        '12 months priority support',
        'SaaS application use allowed',
        'Resell as part of a larger product',
        'Create unlimited end products',
      ],
      restrictions: [
        'Cannot resell the template as-is',
        'Cannot claim as your own design',
      ],
      supportDuration: 12,
    },
  ];

  return (
    <div className='min-h-screen bg-slate-50 p-8'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          License System Test
        </h1>
        <p className='text-gray-600 mb-8'>
          Test page for the license selection component
        </p>

        <div className='bg-white rounded-lg border border-slate-200 p-6 mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4'>
            Selected License: {selectedLicense}
          </h2>
          <p className='text-gray-600'>
            Base Price: ${basePrice}
          </p>
        </div>

        <LicenseSelector
          licenseTypes={licenseTypes}
          basePrice={basePrice}
          selectedLicense={selectedLicense}
          onLicenseSelect={setSelectedLicense}
        />
      </div>
    </div>
  );
}
