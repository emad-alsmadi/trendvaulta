const mongoose = require('mongoose');

const BASE_CREATORS = [
  {
    name: 'Aya Designs',
    country: 'Jordan',
    bio: 'Designer focused on CV templates and clean, modern typography.',
    roles: ['user'],
  },
  {
    name: 'PixelForge Studio',
    country: 'United Arab Emirates',
    bio: 'UI kit creators specializing in dashboards, SaaS components, and Figma libraries.',
    roles: ['user'],
  },
  {
    name: 'Notion Lab',
    country: 'Saudi Arabia',
    bio: 'Notion templates for productivity, learning, and habit tracking.',
    roles: ['user'],
  },
  {
    name: 'IconNest',
    country: 'Egypt',
    bio: 'Icon packs and design assets optimized for modern product teams.',
    roles: ['user'],
  },
  {
    name: 'ResumeCraft',
    country: 'Palestine',
    bio: 'ATS-friendly CV templates with variations for different industries.',
    roles: ['user'],
  },
  {
    name: 'UI Sparks',
    country: 'Lebanon',
    bio: 'Neon UI kits, landing pages, and playful gradients for startups.',
    roles: ['user'],
  },
  {
    name: 'Minimal Sheets',
    country: 'Turkey',
    bio: 'Minimal Notion + Google Sheets templates for finance and planning.',
    roles: ['user'],
  },
  {
    name: 'BrandBlocks',
    country: 'Kuwait',
    bio: 'Branding kits, icon sets, and presentation templates for agencies.',
    roles: ['user'],
  },
];

const BASE_TEMPLATES = [
  {
    title: 'Modern CV Template (A4)',
    creatorIndex: 0,
    description:
      'A clean CV template with strong hierarchy, perfect for tech and business roles (PDF/Word).',
    price: 6.99,
    cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
  },
  {
    title: 'SaaS Dashboard UI Kit',
    creatorIndex: 1,
    description:
      'Figma UI kit for SaaS dashboards: charts, tables, cards, and settings screens.',
    price: 14.0,
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  },
  {
    title: 'Notion Habit Tracker',
    creatorIndex: 2,
    description:
      'A Notion template to build habits, track streaks, and review weekly progress.',
    price: 4.5,
    cover: 'https://images.unsplash.com/photo-1518976024611-4884d8d7b9a4',
  },
  {
    title: 'Premium Icons Pack (200+)',
    creatorIndex: 3,
    description:
      'A crisp icon pack for product UI (SVG/PNG), designed on a consistent grid.',
    price: 9.99,
    cover: 'https://images.unsplash.com/photo-1526481280695-3c687fd643ed',
  },
  {
    title: 'ATS Resume Template',
    creatorIndex: 4,
    description:
      'An ATS-friendly resume template with multiple sections and easy customization.',
    price: 5.99,
    cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d',
  },
  {
    title: 'Neon Landing Page Kit',
    creatorIndex: 5,
    description: 'Landing sections, pricing, FAQs, and CTAs (Figma).',
    price: 11.5,
    cover: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6',
  },
  {
    title: 'Personal Finance Sheet',
    creatorIndex: 6,
    description:
      'Google Sheets template for budgeting, expenses, and monthly saving goals.',
    price: 3.5,
    cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
  },
  {
    title: 'Brand Identity Starter Kit',
    creatorIndex: 7,
    description:
      'Brand kit with logo grid, colors, typography, and presentation slides.',
    price: 12.99,
    cover: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
  },
];

function buildSeed(multiplier = 4) {
  const nextCreators = [];
  const nextTemplates = [];

  for (let batch = 1; batch <= multiplier; batch++) {
    const ids = BASE_CREATORS.map(() => new mongoose.Types.ObjectId());

    BASE_CREATORS.forEach((c, idx) => {
      nextCreators.push({
        _id: ids[idx],
        name: `${c.name} ${batch}`,
        country: c.country,
        bio: c.bio,
        roles: c.roles,
      });
    });

    BASE_TEMPLATES.forEach((t) => {
      nextTemplates.push({
        title: `${t.title} v${batch}`,
        creator: ids[t.creatorIndex],
        description: t.description,
        price: t.price,
        cover: t.cover,
      });
    });
  }

  return { creators: nextCreators, templates: nextTemplates };
}

const { creators, templates } = buildSeed(4);

module.exports = { creators, templates };
