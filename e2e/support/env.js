/**
 * Ports and seed data shared by the E2E servers and specs. The ports sit
 * away from the dev servers (3000-3002), so a running `npm run dev` is never
 * touched.
 */
const PORTS = {
  api: Number(process.env.E2E_API_PORT) || 3110,
  website: Number(process.env.E2E_WEBSITE_PORT) || 3111,
  dashboard: Number(process.env.E2E_DASHBOARD_PORT) || 3112,
};

const E2E = {
  adminEmail: 'e2e-admin@example.com',
  adminPassword: 'e2e-password-123',
  products: [
    { title: 'Velvet Matte Lipstick', price: 24 },
    { title: 'Silk Gloss', price: 18 },
  ],
  messageSubject: 'Where is my order?',
};

module.exports = { PORTS, E2E };
