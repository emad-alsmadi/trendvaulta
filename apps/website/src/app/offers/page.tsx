'use client';

import { motion } from 'framer-motion';
import { Sparkles, Tag, Clock } from 'lucide-react';

export default function OffersPage() {
  const offers = [
    {
      id: 1,
      title: 'Summer Sale',
      description: 'Get 20% off on all makeup products',
      discount: 20,
      code: 'SUMMER20',
      expires: '2024-08-31',
      icon: Sparkles,
    },
    {
      id: 2,
      title: 'Welcome Offer',
      description: 'New customers get 10% off their first order',
      discount: 10,
      code: 'WELCOME10',
      expires: 'No expiration',
      icon: Tag,
    },
    {
      id: 3,
      title: 'Limited Time',
      description: '$5 off orders over $15',
      discount: 5,
      code: 'FIXED5',
      expires: '2024-09-30',
      icon: Clock,
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-fuchsia-50 via-purple-50 to-cyan-50'>
      <div className='container mx-auto px-4 py-12'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className='text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-purple-700 to-cyan-700 mb-8'>
            Special Offers
          </h1>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {offers.map((offer) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 shadow-lg hover:shadow-xl transition-shadow'
              >
                <div className='flex items-start gap-4 mb-4'>
                  <div className='p-3 bg-gradient-to-br from-fuchsia-600 to-purple-600 rounded-xl'>
                    <offer.icon className='w-6 h-6 text-white' />
                  </div>
                  <div className='flex-1'>
                    <h2 className='text-xl font-bold text-gray-900 mb-2'>
                      {offer.title}
                    </h2>
                    <p className='text-gray-700 text-sm mb-3'>{offer.description}</p>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold text-gray-600'>Discount:</span>
                    <span className='text-lg font-bold text-fuchsia-700'>
                      {offer.discount}% OFF
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold text-gray-600'>Code:</span>
                    <span className='text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg text-gray-900'>
                      {offer.code}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold text-gray-600'>Expires:</span>
                    <span className='text-sm text-gray-700'>{offer.expires}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className='mt-12 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 shadow-lg'
          >
            <h3 className='text-lg font-bold text-gray-900 mb-3'>How to use offers:</h3>
            <ol className='list-decimal list-inside space-y-2 text-gray-700'>
              <li>Add products to your cart</li>
              <li>Proceed to checkout</li>
              <li>Enter the offer code in the coupon field</li>
              <li>Apply the code to see your discount</li>
            </ol>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
