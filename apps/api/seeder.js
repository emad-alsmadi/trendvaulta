const { Template } = require('./models/Template');
const { Creator } = require('./models/Creator');
const { LicenseType } = require('./models/LicenseType');
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

// Import Templates & Creators & LicenseTypes
const importData = async () => {
  try {
    await connectToDB();
    await Creator.deleteMany({});
    await Template.deleteMany({});
    await LicenseType.deleteMany({});
    await Creator.insertMany(creators);
    await Template.insertMany(templates);
    await LicenseType.insertMany(licenseTypes);
    console.log('Data imported');
    process.exit();
  } catch (error) {
    console.log('Error', error);
    process.exit(1);
  }
};

// Remove Templates & Creators & LicenseTypes
const removeData = async () => {
  try {
    await connectToDB();
    await Template.deleteMany({});
    await Creator.deleteMany({});
    await LicenseType.deleteMany({});
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
