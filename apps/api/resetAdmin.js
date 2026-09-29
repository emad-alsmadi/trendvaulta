// One-off helper: reset the admin password and clear any brute-force lockout.
// Usage from apps/api:  node resetAdmin.js
// Optional overrides:   ADMIN_EMAIL=... ADMIN_NEW_PASSWORD=... node resetAdmin.js
const bcrypt = require('bcryptjs');
const { User } = require('./models/User');
const { connectToDB } = require('./config/db');
require('dotenv').config();

const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
const newPassword = process.env.ADMIN_NEW_PASSWORD || '12345678';

(async () => {
  try {
    await connectToDB();

    const user = await User.findOne({ email }).select(
      '+failedLoginAttempts +lockUntil',
    );
    if (!user) {
      console.error(`❌ No user found with email ${email}`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.disabled = false;
    if (!user.roles?.includes('admin')) {
      user.roles = [...new Set([...(user.roles || []), 'admin'])];
    }
    await user.save();

    console.log(`✅ Reset password for ${email}`);
    console.log(`   New password: ${newPassword}`);
    console.log('   Lockout cleared, account enabled, admin role ensured.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
