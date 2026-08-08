'use client';

import { motion } from 'framer-motion';
import { Sparkles, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className='min-h-screen bg-gray-50 py-12'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-12'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 mb-4'>
            <Sparkles className='h-4 w-4' />
            Legal
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            Terms of Service
          </h1>
          <p className='text-lg text-gray-600'>Last updated: August 8, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-2xl border border-gray-200 p-8 space-y-8'
        >
          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <FileText className='h-6 w-6 text-fuchsia-600' />
              1. Acceptance of Terms
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              By accessing and using TrendVaulta, you accept and agree to be
              bound by these Terms of Service. If you do not agree, please do
              not use the store.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              2. User Accounts
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              You are responsible for maintaining the confidentiality of your
              account and password. You agree to accept responsibility for all
              activities that occur under your account.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              TrendVaulta reserves the right to refuse or suspend access to the
              website for any user when necessary to protect the store or other
              customers.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              3. Products &amp; Orders
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              TrendVaulta sells physical beauty, fashion, and lifestyle products.
              Product descriptions, images, and pricing are provided for
              shopping clarity; minor variations in color or packaging may
              occur.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              Placing an order constitutes an offer to purchase. We may cancel
              or refuse an order if an item is unavailable, mispriced, or
              suspected of fraud.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              4. Payment Terms
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              Payments are processed securely (including Stripe when
              configured). You authorize us to charge the payment method you
              provide for the order total, including applicable shipping and
              taxes.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              Prices may change without notice for future orders. Coupons and
              promotions are subject to their stated conditions and may be
              withdrawn at any time.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              5. Shipping, Returns &amp; Refunds
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              Delivery timelines and costs depend on destination and the method
              selected at checkout. Risk of loss passes according to the carrier
              once the order has shipped.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              Eligible returns follow our store return policy (typically within
              the stated window, unused and in original condition). Refunds are
              processed to the original payment method after we receive and
              inspect the return, except where local law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              6. Intellectual Property
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              All content on TrendVaulta — including text, graphics, logos,
              images, and software — is the property of TrendVaulta or its
              licensors and is protected by applicable intellectual property
              laws.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              Brand names and product imagery belonging to third parties remain
              the property of those brands. You may not copy or reuse store
              content for commercial purposes without permission.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              7. User Conduct
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              You agree not to use the service for any unlawful purpose, or to
              solicit others to perform or participate in any unlawful acts.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              You may not upload, post, or otherwise transmit any content that
              is infringing, libelous, defamatory, obscene, or otherwise
              objectionable — including abusive reviews or fraudulent claims.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              8. Limitation of Liability
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              To the fullest extent permitted by law, TrendVaulta shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the
              service.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              9. Changes to Terms
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              TrendVaulta reserves the right to modify these terms at any time.
              Continued use of the service after changes are posted constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              10. Contact Information
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              If you have any questions about these Terms of Service, please
              contact us at support@trendvaulta.com
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
