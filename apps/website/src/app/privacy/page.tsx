'use client';

import { motion } from 'framer-motion';
import { Sparkles, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className='min-h-screen bg-gray-50 py-12'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
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
            Privacy Policy
          </h1>
          <p className='text-lg text-gray-600'>Last updated: August 8, 2026</p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-2xl border border-gray-200 p-8 space-y-8'
        >
          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Shield className='h-6 w-6 text-fuchsia-600' />
              1. Information We Collect
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              We collect information you provide directly to us, such as when
              you create an account, make a purchase, or contact us for support.
              This may include your name, email address, payment information,
              and any other information you choose to provide.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              We also collect information automatically when you use our
              service, including your IP address, browser type, device
              information, and usage patterns.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              2. How We Use Your Information
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              We use the information we collect to provide, maintain, and
              improve our services, process transactions, send you technical
              notices and support messages, and respond to your comments and
              questions.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              We may also use your information to send you marketing
              communications about our products and services, if you have
              consented to receive such communications.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              3. Information Sharing
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              We do not sell, trade, or otherwise transfer your personal
              information to third parties without your consent, except as
              described in this policy or as required by law.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              We may share your information with service providers who perform
              services on our behalf, such as payment processing, data analysis,
              and email delivery. These providers are contractually obligated to
              protect your information.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              4. Data Security
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              We implement appropriate security measures to protect your
              personal information against unauthorized access, alteration,
              disclosure, or destruction.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              However, no method of transmission over the internet is 100%
              secure, and we cannot guarantee absolute security of your
              information.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              5. Cookies and Tracking
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              We use cookies and similar tracking technologies to collect and
              track information about your activity on our service. Cookies are
              files with small amounts of data which may include an anonymous
              unique identifier.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              You can instruct your browser to refuse all cookies or to indicate
              when a cookie is being sent. However, if you do not accept
              cookies, you may not be able to use some portions of our service.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              6. Your Rights
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              You have the right to access, correct, or delete your personal
              information. You may also opt out of marketing communications at
              any time.
            </p>
            <p className='text-gray-600 leading-relaxed'>
              To exercise these rights, please contact us at
              support@trendvaulta.com with your request.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              7. Children&apos;s Privacy
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              Our service is not intended for children under the age of 13. We
              do not knowingly collect personal information from children under
              13. If we become aware that we have collected such information, we
              will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              8. Changes to This Policy
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              We may update our privacy policy from time to time. We will notify
              you of any changes by posting the new policy on this page and
              updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              9. Contact Information
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              If you have any questions about this Privacy Policy, please
              contact us at support@trendvaulta.com
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
