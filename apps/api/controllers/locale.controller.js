const asyncHandler = require('express-async-handler');
const { User } = require('../models/User');

const LOCALES = ['en', 'ar'];

/**
 * Remember the storefront language of the signed-in customer, so their
 * emails arrive in it (plan P1-02). The storefront calls this after sign-in
 * and sign-up, and whenever the customer switches language.
 *
 * @route PUT /api/auth/locale
 * @access Private
 * @body {{ locale: 'en' | 'ar' }}
 */
const updateLocale = asyncHandler(async (req, res) => {
  const locale = req.body?.locale;
  if (!LOCALES.includes(locale)) {
    return res.status(400).json({ code: 'INVALID_LOCALE', message: 'locale must be "en" or "ar"' });
  }
  const updated = await User.findByIdAndUpdate(
    req.user?.id,
    { $set: { locale } },
    { new: true },
  )
    .select('locale')
    .lean();
  if (!updated) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json({ locale: updated.locale });
});

module.exports = { updateLocale };
