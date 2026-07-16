const { Template } = require('./models/Template');
const { Creator } = require('./models/Creator');
const { LicenseType } = require('./models/LicenseType');
const { Coupon } = require('./models/Coupon');
const { creators, templates } = require('./data');
const { connectToDB } = require('./config/db');
require('dotenv').config();

const licenseTypes = [
  {
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
    isActive: true,
  },
  {
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
    isActive: true,
  },
  {
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
    isActive: true,
  },
];

const coupons = [
  {
    code: 'SUMMER20',
    discountType: 'percentage',
    discountValue: 20,
    expirationDate: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 100,
    usedCount: 0,
    minimumOrderAmount: 10,
    isActive: true,
    description: 'Summer sale - 20% off all templates',
  },
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    expirationDate: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: null,
    usedCount: 0,
    minimumOrderAmount: 0,
    isActive: true,
    description: 'Welcome discount for new customers',
  },
  {
    code: 'FIXED5',
    discountType: 'fixed',
    discountValue: 5,
    expirationDate: new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 50,
    usedCount: 0,
    minimumOrderAmount: 15,
    isActive: true,
    description: '$5 off orders over $15',
  },
  {
    code: 'BIGSALE30',
    discountType: 'percentage',
    discountValue: 30,
    expirationDate: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 20,
    usedCount: 0,
    minimumOrderAmount: 50,
    isActive: true,
    description: 'Big sale - 30% off orders over $50',
  },
  {
    code: 'EXPIRED20',
    discountType: 'percentage',
    discountValue: 20,
    expirationDate: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 100,
    usedCount: 0,
    minimumOrderAmount: 10,
    isActive: true,
    description: 'Expired coupon for testing',
  },
  {
    code: 'LIMITED5',
    discountType: 'fixed',
    discountValue: 10,
    expirationDate: new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 5,
    usedCount: 3,
    minimumOrderAmount: 20,
    isActive: true,
    description: 'Limited use coupon - only 2 uses left',
  },
];

// Import Templates & Creators & LicenseTypes & Coupons
const importData = async () => {
  try {
    await connectToDB();
    await Creator.deleteMany({});
    await Template.deleteMany({});
    await LicenseType.deleteMany({});
    await Coupon.deleteMany({});
    await Creator.insertMany(creators);
    await Template.insertMany(templates);
    await LicenseType.insertMany(licenseTypes);
    await Coupon.insertMany(coupons);
    console.log('Data imported');
    process.exit();
  } catch (error) {
    console.log('Error', error);
    process.exit(1);
  }
};

// Remove Templates & Creators & LicenseTypes & Coupons
const removeData = async () => {
  try {
    await connectToDB();
    await Template.deleteMany({});
    await Creator.deleteMany({});
    await LicenseType.deleteMany({});
    await Coupon.deleteMany({});
    console.log('Data removed');
    process.exit();
  } catch (error) {
    console.log('Error', error);
    process.exit(1);
  }
};
if (process.argv[2] === '-import') {
  importData();
} else if (process.argv[2] === '-remove') {
  removeData();
}
