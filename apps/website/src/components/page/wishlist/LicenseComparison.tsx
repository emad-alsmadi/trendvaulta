'use client';

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

interface LicenseComparisonProps {
  licenseTypes: LicenseType[];
  basePrice: number;
}

export function LicenseComparison({ licenseTypes, basePrice }: LicenseComparisonProps) {
  const allFeatures = Array.from(
    new Set(licenseTypes.flatMap((license) => license.features)),
  );
  const allRestrictions = Array.from(
    new Set(licenseTypes.flatMap((license) => license.restrictions)),
  );

  return (
    <div className='overflow-x-auto'>
      <table className='w-full'>
        <thead>
          <tr>
            <th className='text-left p-4 font-semibold text-gray-900'>Feature</th>
            {licenseTypes.map((license) => (
              <th key={license._id} className='p-4 font-semibold text-gray-900 text-center'>
                {license.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className='bg-slate-50'>
            <td className='p-4 font-semibold text-gray-900'>Price</td>
            {licenseTypes.map((license) => {
              const finalPrice = (basePrice * license.priceMultiplier).toFixed(2);
              return (
                <td key={license._id} className='p-4 text-center font-bold'>
                  ${finalPrice}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className='p-4 font-semibold text-gray-900'>Support Duration</td>
            {licenseTypes.map((license) => (
              <td key={license._id} className='p-4 text-center'>
                {license.supportDuration} months
              </td>
            ))}
          </tr>
          {allFeatures.map((feature) => (
            <tr key={feature} className='border-t border-slate-200'>
              <td className='p-4 text-gray-700'>{feature}</td>
              {licenseTypes.map((license) => (
                <td key={license._id} className='p-4 text-center'>
                  {license.features.includes(feature) ? (
                    <Check className='h-5 w-5 text-green-500 mx-auto' />
                  ) : (
                    <X className='h-5 w-5 text-gray-300 mx-auto' />
                  )}
                </td>
              ))}
            </tr>
          ))}
          {allRestrictions.length > 0 && (
            <>
              <tr className='bg-slate-50'>
                <td colSpan={licenseTypes.length + 1} className='p-4 font-semibold text-gray-900'>
                  Restrictions
                </td>
              </tr>
              {allRestrictions.map((restriction) => (
                <tr key={restriction} className='border-t border-slate-200'>
                  <td className='p-4 text-gray-700'>{restriction}</td>
                  {licenseTypes.map((license) => (
                    <td key={license._id} className='p-4 text-center'>
                      {license.restrictions.includes(restriction) ? (
                        <X className='h-5 w-5 text-red-500 mx-auto' />
                      ) : (
                        <Check className='h-5 w-5 text-green-500 mx-auto' />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
