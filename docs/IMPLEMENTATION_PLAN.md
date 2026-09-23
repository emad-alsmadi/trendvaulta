# TrendVaulta — Professional Execution Plan

**Document Version:** 1.0  
**Date:** 2026-09-23  
**Based on:** FULL_SYSTEM_ANALYSIS.md  
**Scope:** Complete system stabilization and feature implementation roadmap  
**Status:** Ready for execution

---

## Executive Summary

This execution plan addresses critical system failures, security vulnerabilities, and missing functionality identified in the comprehensive system analysis. The TrendVaulta platform has solid architectural foundations (layered architecture, Joi validation, refresh-token rotation, webhook idempotency) but the September 19, 2026 feature release shipped without testing, breaking system startup and critical workflows.

**Priority Strategy:**

1. **Phase 0 (Critical):** Restore system to working state
2. **Phase 1 (Security):** Close payment/inventory security gaps
3. **Phase 2 (Stability):** Fix dashboard and store workflows
4. **Phase 3 (Growth):** Implement revenue-generating features
5. **Phase 4 (Scale):** SEO, i18n, and advanced features

**Success Metrics:**

- System starts without errors across all services
- All CI/CD pipelines pass consistently
- No security vulnerabilities in OWASP Top 10 categories
- Complete end-to-end purchase workflow operational
- SEO score ≥ 90 (Lighthouse)
- Full Arabic/RTL support implemented

---

## Phase 0: Critical System Recovery (Sprint 0 — 1-2 days)

**Objective:** Restore system to working state, unblock all development

### Task C1: Fix API Startup Failure

**Priority:** CRITICAL  
**Effort:** Small (1-2 hours)  
**Files:** `apps/api/routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js`

**Problem:** 7 route files import non-existent `../middlewares/auth`, causing `MODULE_NOT_FOUND` on startup

**Solution:**

```javascript
// Change from:
const auth = require('../middlewares/auth');
// To:
const { verfiyToken } = require('../middlewares/verfiyToken');
```

**Acceptance Criteria:**

- [x] `node apps/api/app.js` starts without errors
- [x] All 28 routes load successfully
- [x] No `MODULE_NOT_FOUND` errors in logs

---

### Task C2: Fix Dashboard 403 Errors for CMS Screens

**Priority:** CRITICAL  
**Effort:** Small (1 hour)  
**Files:** `apps/api/middlewares/rolePermissions.js`

**Problem:** 8 dashboard screens (HelpTopics, Content, StorefrontModules, Lookbooks, Testimonials, Bundles, GiftFinder, ProductQA) return 403 for all roles including admin

**Solution:**

```javascript
// Add to rolePermissions.js admin object:
content: {
  read: true,
  write: true,
  delete: true
}
// Add to moderator object:
content: {
  read: true,
  write: true
}
```

**Acceptance Criteria:**

- [x] Admin can access all 8 CMS screens
- [x] Moderator can read/write CMS content
- [x] Role permission tests pass
- [x] No 403 errors in dashboard logs

---

### Task C3: Fix 500 Errors in Recommendations and Q&A Endpoints

**Priority:** CRITICAL  
**Effort:** Small (1-2 hours)  
**Files:** `apps/api/controllers/{recommendations,productQA}.controller.js`

**Problem:**

- `recommendations.controller.js:2` uses `const Product = require(...)` but model exports `{ Product }`
- Filters on `active` field instead of `isActive`
- Selects `imageUrl` instead of `cover`

**Solution:**

```javascript
// Fix import:
const { Product } = require('../models/Product');
// Fix field names:
.filter({ isActive: true })
.select('title slug cover price badges')
```

**Acceptance Criteria:**

- [x] `GET /recommendations` returns 200 with valid data
- [x] `GET /products/:id/qa` returns 200 with valid data
- [x] Product fields match model schema
- [x] No 500 errors in API logs

---

### Task C4: Fix CI Pipeline Lockfile Issues

**Priority:** CRITICAL  
**Effort:** Small (2-3 hours)  
**Files:** `package-lock.json`, `.github/workflows/ci.yml`

**Problem:** 3 unsynchronized lockfiles cause `npm ci` failures in all 3 CI jobs

**Solution:**

1. Delete nested `apps/*/package-lock.json` files
2. Commit root `package-lock.json` only
3. Update `ci.yml` to use `npm ci` from root
4. Add `--workspaces` flag to install commands

**Acceptance Criteria:**

- [x] Single lockfile at root
- [x] CI pipeline passes all 3 jobs
- [x] `npm ci` succeeds in clean environment
- [x] No lockfile conflicts

---

### Task C5: Add Missing Dashboard ESLint Configuration

**Priority:** CRITICAL  
**Effort:** Small (1 hour)  
**Files:** `apps/dashboard/.eslintrc.cjs`, `apps/dashboard/.gitignore`

**Problem:** No ESLint config in dashboard; `.gitignore` ignores all `.eslintrc*` files

**Solution:**

1. Create `.eslintrc.cjs` with React/Vite configuration
2. Remove `.eslintrc*` from `.gitignore`
3. Add tooling files to git

**Acceptance Criteria:**

- [ ] ESLint config exists and is committed
- [ ] `npm run lint` passes in dashboard
- [ ] CI lint job passes
- [ ] No tooling files ignored

---

### Task C6: Expand Test Coverage in CI

**Priority:** CRITICAL  
**Effort:** Small (1-2 hours)  
**Files:** `apps/api/package.json`

**Problem:** CI runs only 8 of ~105 unit tests

**Solution:**

```json
// Update test script:
"test": "node --test utils middlewares controllers"
```

**Acceptance Criteria:**

- [ ] All ~105 tests run in CI
- [ ] Smoke test `require('./app')` added
- [ ] Test coverage report generated
- [ ] CI test job passes

---

### Task D2: Fix Product Creation/Update Failures

**Priority:** HIGH  
**Effort:** Medium (3-4 hours)  
**Files:** `apps/dashboard/src/pages/Products.tsx`

**Problem:** Dashboard shows `beauty/fashion/wellness` but Joi accepts only `makeup/perfumes/clothing/skincare/accessories/home`, requires `subcategory` and `description`, rejects empty `sku`

**Solution:**

1. Align category dropdown with Joi enum
2. Add required field validation
3. Strip empty strings before submission
4. Add proper error handling

**Acceptance Criteria:**

- [ ] Product creation succeeds with valid data
- [ ] Category dropdown matches API enum
- [ ] Required fields validated client-side
- [ ] Empty strings stripped before API call
- [ ] User-friendly error messages

---

### Task D3: Fix Brand Creation/Update Failures

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/dashboard/src/pages/Brands.tsx`, `apps/api/controllers/brand.controller.js`

**Problem:** Empty optional fields cause Joi validation failures; `GET /brands` filters `isActive:true` and limits to 50

**Solution:**

1. Strip empty strings or allow `''` in Joi schema
2. Add `includeInactive` parameter for admin
3. Implement proper pagination
4. Add validation for URI fields

**Acceptance Criteria:**

- [ ] Brand creation succeeds with partial data
- [ ] Inactive brands visible in admin
- [ ] Pagination works correctly
- [ ] URI fields validated properly

---

### Task D4: Fix Bundle Edit TypeError

**Priority:** HIGH  
**Effort:** Small (1-2 hours)  
**Files:** `apps/dashboard/src/pages/Bundles.tsx`

**Problem:** Controller returns populated `item.product` objects; UI calls `.trim()` on object

**Solution:**

1. Map to `_id` when opening edit form
2. Use product picker instead of raw ID input
3. Handle populated objects correctly

**Acceptance Criteria:**

- [ ] Bundle edit opens without errors
- [ ] Product picker displays correctly
- [ ] Product selection saves properly
- [ ] No TypeError in console

---

## Phase 1: Security & Payment Critical Fixes (Sprint 1 — 3-4 days)

**Objective:** Close all security vulnerabilities and payment/inventory race conditions

### Task P1: Implement Refund on Order Cancellation

**Priority:** CRITICAL  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/api/controllers/order.controller.js`, `apps/api/utils/orderTransitions.js`

**Problem:** Canceling paid order restores inventory but doesn't refund Stripe payment

**Solution:**

```javascript
// In cancelOrder function:
if (order.paymentStatus === 'paid' && order.stripeSessionId) {
  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    reason: 'requested_by_customer',
  });
  // Handle charge.refunded webhook
}
```

**Acceptance Criteria:**

- [ ] Paid order cancellation triggers Stripe refund
- [ ] `charge.refunded` webhook handled
- [ ] Order status transitions to `refunded`
- [ ] Inventory restored correctly
- [ ] Refund amount matches order total

---

### Task P2: Fix Race Condition in Mark-Paid

**Priority:** CRITICAL  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/api/controllers/payment.controller.js`

**Problem:** Memory-based flag checks allow double inventory/coupon deduction; browser polling and webhook race

**Solution:**

```javascript
// Atomic update with conditional:
const order = await Order.findOneAndUpdate(
  { _id: orderId, paymentStatus: { $ne: 'paid' } },
  {
    $set: { paymentStatus: 'paid', status: 'processing' },
    $inc: { 'items.$[].quantity': -1 }, // Conditional decrement
  },
  { new: true },
);
```

**Acceptance Criteria:**

- [ ] Only one mark-paid operation succeeds
- [ ] Inventory decremented atomically
- [ ] Coupon count decremented once
- [ ] No double-deduction possible
- [ ] Race condition tests pass

---

### Task P3: Handle Oversell and Paid Order Stuck State

**Priority:** CRITICAL  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/api/controllers/payment.controller.js`

**Problem:** Inventory checked only at session creation; second customer paying last item gets 409 but webhook fails

**Solution:**

```javascript
// When inventory insufficient after payment:
if (stockAvailable < quantity) {
  await Order.findByIdAndUpdate(orderId, {
    status: 'needs_attention',
    notes: 'Oversell detected - manual review required',
  });
  // Optional: auto-refund
  await stripe.refunds.create({ payment_intent: paymentIntentId });
  return; // Don't fail webhook
}
```

**Acceptance Criteria:**

- [ ] Webhook never fails on oversell
- [ ] Order marked `needs_attention`
- [ ] Optional auto-refund implemented
- [ ] Admin notification sent
- [ ] Order remains in recoverable state

---

### Task P4: Enforce Order State Machine

**Priority:** CRITICAL  
**Effort:** Medium (3-4 hours)  
**Files:** `apps/api/controllers/payment.controller.js`, `apps/api/utils/orderTransitions.js`

**Problem:** Direct status assignment bypasses state machine; late webhook can convert canceled order to paid

**Solution:**

```javascript
// Check transition validity before marking paid:
const canTransition = orderTransitions.canTransitionTo(order.status, 'paid');
if (!canTransition) {
  throw new Error(`Invalid transition from ${order.status} to paid`);
}
```

**Acceptance Criteria:**

- [ ] All status changes validated
- [ ] Invalid transitions rejected
- [ ] State machine enforced everywhere
- [ ] Late webhook handled safely
- [ ] Transition logs maintained

---

### Task P5: Implement Missing Stripe Webhook Events

**Priority:** HIGH  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/api/app.js`, `apps/api/controllers/payment.controller.js`

**Problem:** Only `checkout.session.completed` handled; missing `session.expired`, `payment_failed`, `charge.refunded`

**Solution:**

1. Add handlers for all payment events
2. Set `expires_at: 30min` on checkout sessions
3. Clean up unused Stripe coupons
4. Implement idempotency for all events

**Acceptance Criteria:**

- [ ] `session.expired` handled
- [ ] `payment_failed` handled
- [ ] `charge.refunded` handled
- [ ] Sessions expire after 30 minutes
- [ ] Unused coupons cleaned up
- [ ] All events idempotent

---

### Task S1: Fix Rate Limiter Bypass

**Priority:** CRITICAL  
**Effort:** Small (2-3 hours)  
**Files:** `apps/api/middlewares/rateLimit.js`, `apps/api/app.js`

**Problem:** Rate limiter uses first `X-Forwarded-For` value without `trust proxy`; attacker can spoof IP

**Solution:**

```javascript
// In app.js:
app.set('trust proxy', 1);

// In rateLimit.js:
const key = req.ip || req.connection.remoteAddress;
```

**Acceptance Criteria:**

- [ ] `trust proxy` enabled
- [ ] Rate limiter uses `req.ip`
- [ ] IP spoofing prevented
- [ ] Brute-force attacks mitigated
- [ ] Rate limit tests pass

---

### Task S2: Fix NoSQL Injection and Email Enumeration

**Priority:** CRITICAL  
**Effort:** Small (2-3 hours)  
**Files:** `apps/api/controllers/password.controller.js`

**Problem:** `User.findOne({ email })` without Joi validation; explicit 404 response enables email enumeration

**Solution:**

```javascript
// Add Joi validation:
const schema = Joi.object({
  email: Joi.string().email().required(),
}).validate(req.body);

// Always return 200:
return res.status(200).json({
  message: 'If email exists, reset link sent',
});
```

**Acceptance Criteria:**

- [ ] Email validated with Joi
- [ ] Always returns 200 status
- [ ] Email enumeration prevented
- [ ] NoSQL injection prevented
- [ ] Security tests pass

---

### Task S3: Fix Email Exposure in Public Endpoints

**Priority:** HIGH  
**Effort:** Small (1-2 hours)  
**Files:** `apps/api/controllers/{review,productQA}.controller.js`

**Problem:** Public endpoints populate `user` with `username email`, exposing emails

**Solution:**

```javascript
// Change from:
.populate('user', 'username email')
// To:
.populate('user', 'username')
```

**Acceptance Criteria:**

- [ ] Emails not exposed in public endpoints
- [ ] Only username returned
- [ ] Admin endpoints still show email
- [ ] No data leakage

---

### Task S4: Secure Authentication Cookies

**Priority:** HIGH  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/website/src/lib/authCookies.ts`, `apps/api/controllers/auth.controller.js`

**Problem:** Cookies lack `secure`, `sameSite`, `httpOnly`; tokens stored in React Query cache

**Solution:**

```typescript
// Add security flags:
document.cookie = `token=${token}; path=/; secure; sameSite=strict; httpOnly`;

// Move refresh to httpOnly cookie via API route
// Remove tokens from React Query cache
```

**Acceptance Criteria:**

- [ ] Cookies have `secure` flag
- [ ] Cookies have `sameSite=strict`
- [ ] Refresh token in httpOnly cookie
- [ ] Tokens not in React Query cache
- [ ] XSS token theft prevented

---

### Task S5: Sanitize CMS Content (XSS Prevention)

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/website/src/app/{shipping,returns}/page.tsx`

**Problem:** `dangerouslySetInnerHTML` used without sanitization

**Solution:**

```typescript
import DOMPurify from 'dompurify';

// Replace:
<div dangerouslySetInnerHTML={{ __html: content }} />
// With:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

**Acceptance Criteria:**

- [ ] DOMPurify installed
- [ ] All CMS content sanitized
- [ ] XSS attacks prevented
- [ ] HTML preserved safely

---

### Task S6: Prevent Internal Error Leakage

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/api/app.js`, `apps/api/middlewares/checkRolePermission.js`

**Problem:** Error responses leak internal details (CastError, E11000, permissions)

**Solution:**

```javascript
// Add error mapping:
const errorMap = {
  CastError: { status: 400, message: 'Invalid ID format' },
  MongoError: {
    11000: { status: 409, message: 'Resource already exists' },
  },
};

// In production, return generic message
if (process.env.NODE_ENV === 'production') {
  return res.status(500).json({ message: 'Internal server error' });
}
```

**Acceptance Criteria:**

- [ ] CastError returns 400
- [ ] E11000 returns 409
- [ ] Production errors generic
- [ ] Development errors detailed
- [ ] No internal data leaked

---

### Task S7: Fix Regex Injection / ReDoS

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/api/controllers/{product,brand}.controller.js`

**Problem:** Search queries passed directly to `$regex` without escaping

**Solution:**

```javascript
// Escape regex special characters:
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const searchRegex = new RegExp(escapeRegex(req.query.q), 'i');
```

**Acceptance Criteria:**

- [ ] Regex special characters escaped
- [ ] Query length limited
- [ ] ReDoS attacks prevented
- [ ] Consider text index migration

---

### Task S8: Revoke Sessions on Password Change

**Priority:** HIGH  
**Effort:** Small (1-2 hours)  
**Files:** `apps/api/controllers/{password,user}.controller.js`

**Problem:** Password changes don't revoke existing sessions

**Solution:**

```javascript
// After password reset/change:
await revokeAllForUser(user._id);
```

**Acceptance Criteria:**

- [ ] All sessions revoked on reset
- [ ] All sessions revoked on change
- [ ] User must re-login
- [ ] Session invalidation tested

---

### Task S9: Implement Environment Validation

**Priority:** HIGH  
**Effort:** Medium (3-4 hours)  
**Files:** `apps/api/config/index.js` (new)

**Problem:** `NODE_ENV` not validated; dev settings leak to production

**Solution:**

```javascript
// Create config validation:
const requiredEnvVars = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required env var: ${varName}`);
  }
});

if (process.env.NODE_ENV === 'production') {
  // Validate production-specific settings
}
```

**Acceptance Criteria:**

- [ ] All required env vars validated
- [ ] App fails fast on missing vars
- [ ] Production settings enforced
- [ ] Dev/production separation clear

---

## Phase 2: Store & Dashboard Workflow Fixes (Sprint 2 — 3-4 days)

**Objective:** Fix complete purchase workflow and dashboard usability

### Task W1: Pass Selected Variant to Cart

**Priority:** CRITICAL  
**Effort:** Small (2-3 hours)  
**Files:** `apps/website/src/app/products/[id]/page.tsx`

**Problem:** `addToCart` doesn't pass size/color; API rejects orders for products with variants

**Solution:**

```typescript
// Pass selected variant:
const addToCart = () => {
  if (selectedSize && selectedColor) {
    addToCartMutation({
      productId,
      variant: { size: selectedSize, color: selectedColor },
    });
  }
};
```

**Acceptance Criteria:**

- [ ] Variant passed to cart
- [ ] API accepts variant data
- [ ] Size selection required for variant products
- [ ] Color selection required for variant products
- [ ] Validation errors clear

---

### Task W2: Fix Cart Variant Handling

**Priority:** HIGH  
**Effort:** Medium (3-4 hours)  
**Files:** `apps/website/src/lib/cartStore.ts`

**Problem:** Cart operations use `productId` only; doesn't distinguish variants

**Solution:**

```typescript
// Change cart item key:
const itemKey = `${productId}_${size}_${color}`;

// Update all operations to use composite key
```

**Acceptance Criteria:**

- [ ] Cart distinguishes variants
- [ ] Remove uses composite key
- [ ] Set quantity uses composite key
- [ ] Cart displays correctly
- [ ] No duplicate variants

---

### Task W3: Fix Category Links

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/website/src/components/navigation/Navbar.tsx`, `apps/website/src/layout/Footer.tsx`

**Problem:** Links use `beauty/fashion/wellness/lifestyle` but enum is `makeup/perfumes/clothing/skincare/accessories/home`

**Solution:**

1. Update all category links to match enum
2. Or add Category model with hierarchy
3. Ensure consistency across Navbar, Footer, Hero

**Acceptance Criteria:**

- [ ] Category links match API enum
- [ ] All category pages return products
- [ ] No "No products" errors
- [ ] Links consistent across site

---

### Task W4: Fix Coupon Validation Rate Limiting

**Priority:** HIGH  
**Effort:** Small (2-3 hours)  
**Files:** `apps/website/src/hooks/coupons/couponsQuery.ts`

**Problem:** Coupon validated on every keystroke via `useQuery` POST; hits rate limit

**Solution:**

```typescript
// Change to useMutation:
const validateCoupon = useMutation({
  mutationFn: (code) => api.post('/coupons/validate', { code }),
  // Debounce or trigger on blur
});
```

**Acceptance Criteria:**

- [ ] Coupon validation uses mutation
- [ ] Validation triggered on blur/submit
- [ ] No rate limit issues
- [ ] User feedback appropriate

---

### Task W5: Implement Guest Cart and Redirect

**Priority:** HIGH  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/website/src/proxy.ts`, `apps/website/src/lib/api.ts`

**Problem:** Cart requires login; no `?redirect=` after login; loses `order_id` returning from Stripe

**Solution:**

1. Remove `/cart` auth requirement
2. Implement guest cart in localStorage
3. Add `?redirect=` to login flow
4. Preserve `order_id` through Stripe redirect

**Acceptance Criteria:**

- [ ] Guest cart functional
- [ ] Login redirect preserves destination
- [ ] Order ID preserved through Stripe
- [ ] Cart merges on login
- [ ] No data loss

---

### Task W6: Implement Stock Limits and Dynamic Pricing

**Priority:** HIGH  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/website/src/app/products/[id]/page.tsx`, `apps/website/src/app/checkout/page.tsx`

**Problem:** No quantity limits based on stock; cart prices not updated; shipping/tax hardcoded

**Solution:**

1. Add max quantity validation
2. Update cart prices dynamically
3. Fetch shipping/tax from API
4. Remove "Digital delivery" placeholder

**Acceptance Criteria:**

- [ ] Quantity limited by stock
- [ ] Cart prices update from API
- [ ] Shipping fetched from API
- [ ] Tax calculated from API
- [ ] No hardcoded values

---

### Task W7: Remove Digital Delivery Placeholder

**Priority:** MEDIUM  
**Effort:** Small (1-2 hours)  
**Files:** `apps/website/src/app/checkout/page.tsx`

**Problem:** "Digital delivery" address sent when delivery not selected

**Solution:**

1. Remove placeholder address
2. Require delivery selection
3. Validate shipping address
4. Add proper address form

**Acceptance Criteria:**

- [ ] No placeholder addresses
- [ ] Delivery required
- [ ] Address validated
- [ ] Proper address form

---

### Task W8: Fix Success Page Polling

**Priority:** MEDIUM  
**Effort:** Small (2-3 hours)  
**Files:** `apps/website/src/app/checkout/success/page.tsx`

**Problem:** `useEffect` depends on entire `q` object; recreates interval on every render

**Solution:**

```typescript
// Fix dependency array:
useEffect(() => {
  // polling logic
}, [orderId, sessionId]); // Only depend on IDs
```

**Acceptance Criteria:**

- [ ] Interval not recreated unnecessarily
- [ ] Only IDs in dependency array
- [ ] Efficient polling
- [ ] No API rate limit issues

---

### Task D5: Implement Dashboard Role Guarding

**Priority:** HIGH  
**Effort:** Medium (4-6 hours)  
**Files:** `apps/dashboard/src/layouts/DashboardLayout.tsx`

**Problem:** Any logged-in user can access dashboard; moderator sees write buttons but gets 403

**Solution:**

1. Redirect non-staff users
2. Hide write buttons based on permissions
3. Add role-based UI rendering
4. Secure cookies

**Acceptance Criteria:**

- [ ] Non-staff users redirected
- [ ] Write buttons hidden for moderators
- [ ] Permissions checked in UI
- [ ] Cookies secured
- [ ] No 403 errors in UI

---

### Task D6: Fix Dark Mode

**Priority:** MEDIUM  
**Effort:** Small (1 hour)  
**Files:** `apps/dashboard/tailwind.config.js`

**Problem:** Missing `darkMode: 'class'` configuration

**Solution:**

```javascript
module.exports = {
  darkMode: 'class',
  // rest of config
};
```

**Acceptance Criteria:**

- [ ] Dark mode works
- [ ] Theme switches correctly
- [ ] Tailwind respects class
- [ ] Icon updates

---

### Task D7: Fix Q&A Display

**Priority:** MEDIUM  
**Effort:** Small (2-3 hours)  
**Files:** `apps/dashboard/src/pages/ProductQA.tsx`, `apps/api/controllers/productQA.controller.js`

**Problem:** Q&A shows "Anonymous"; uses wrong field name

**Solution:**

1. Populate `username` instead of `name`
2. Update UI to use correct field
3. Fix `approved` state handling

**Acceptance Criteria:**

- [ ] Username displayed correctly
- [ ] Not "Anonymous"
- [ ] Approved state updated
- [ ] Edit form works

---

### Task D8: Replace Native Alerts with Toast/Dialog

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Files:** Multiple dashboard pages

**Problem:** 15 pages use `window.alert/confirm`; raw Joi/403 errors; delete buttons not disabled

**Solution:**

1. Implement toast notifications
2. Use Radix Dialog for confirmations
3. Add zod schemas for validation
4. Disable buttons during mutations

**Acceptance Criteria:**

- [ ] No native alerts
- [ ] Toast notifications used
- [ ] Radix Dialog for confirmations
- [ ] Zod validation
- [ ] Buttons disabled during operations

---

### Task D9: Implement Mobile Responsive Dashboard

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Files:** `apps/dashboard/src/layouts/DashboardLayout.tsx`

**Problem:** Fixed 256px sidebar with no breakpoints; unusable on mobile

**Solution:**

1. Implement drawer on small screens
2. Add responsive breakpoints
3. Hamburger menu for mobile
4. Collapsible sidebar

**Acceptance Criteria:**

- [ ] Drawer on mobile
- [ ] Responsive breakpoints
- [ ] Hamburger menu
- [ ] Collapsible sidebar
- [ ] Usable on all screen sizes

---

### Task D10: Clean Dashboard Misc Issues

**Priority:** LOW  
**Effort:** Small (2-3 hours)  
**Files:** Multiple dashboard files

**Problem:** Various small issues: env import, missing field, state ignored, missing favicon, wrong title

**Solution:**

1. Fix `import.meta.env` usage
2. Remove non-existent fields
3. Fix login redirect state
4. Add favicon
5. Update title

**Acceptance Criteria:**

- [ ] No direct env imports
- [ ] Non-existent fields removed
- [ ] Login redirect works
- [ ] Favicon present
- [ ] Title correct

---

## Phase 3: Revenue-Generating Features (Sprint 3-4 — 2-3 weeks)

**Objective:** Implement features that directly impact revenue

### Feature 1: Enable Product Reviews, Q&A, and Wishlist

**Priority:** HIGH  
**Effort:** Medium (1-2 days)  
**Files:** `apps/website/src/app/products/[id]/page.tsx`

**Current State:** API, hooks, and components exist but not wired up

**Implementation:**

1. Import and wire `useProductReviews`, `ReviewForm`, `ReviewList`
2. Import and wire `useProductQA`
3. Add `WishlistButton` handlers
4. Remove demo placeholders

**Acceptance Criteria:**

- [ ] Reviews display on product page
- [ ] Review form functional
- [ ] Q&A displays real data
- [ ] Wishlist buttons work
- [ ] No demo content

---

### Feature 2: Implement Server-Side Filtering and Sorting

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** `apps/api/controllers/product.controller.js`, `apps/website/src/app/products/page.tsx`

**Current State:** Client-side filtering on 12 demo products only

**Implementation:**

1. Add server-side filters: brand, size, color, rating, inStock, onSale
2. Implement text index on `title/description/brand`
3. Replace regex search with text search
4. Add sorting options
5. Update UI to use server endpoints

**Acceptance Criteria:**

- [ ] Server-side filtering works
- [ ] Text index implemented
- [ ] Regex replaced
- [ ] Sorting functional
- [ ] UI uses API filters

---

### Feature 3: Create Real Category Pages

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** `apps/website/src/app/c/[category]/page.tsx` (new)

**Current State:** Category links don't match enum; no real category pages

**Implementation:**

1. Create `/c/[category]` route
2. Add breadcrumbs
3. Unify categories between UI and enum
4. Or implement Category model with hierarchy
5. Filter products by category

**Acceptance Criteria:**

- [ ] Category pages exist
- [ ] Breadcrumbs implemented
- [ ] Categories unified
- [ ] Products filtered correctly
- [ ] SEO metadata

---

### Feature 4: Implement SEO Foundation

**Priority:** HIGH  
**Effort:** Large (3-5 days)  
**Files:** Multiple Next.js files

**Current State:** All pages client components; zero SEO

**Implementation:**

1. Convert PDP/PLP/Brand to Server Components
2. Implement `generateMetadata`
3. Add Open Graph tags
4. Add Product JSON-LD
5. Create `sitemap.ts`
6. Create `robots.ts`
7. Add canonical URLs

**Acceptance Criteria:**

- [ ] Key pages server-rendered
- [ ] Dynamic metadata
- [ ] OG tags present
- [ ] JSON-LD structured data
- [ ] Sitemap generated
- [ ] Robots.txt
- [ ] Lighthouse SEO ≥ 90

---

### Feature 5: Implement Guest Checkout Flow

**Priority:** MEDIUM  
**Effort:** Small (1-2 days)  
**Files:** `apps/website/src/app/checkout/page.tsx`

**Current State:** Cart requires login

**Implementation:**

1. Allow guest checkout
2. Collect guest email at checkout
3. Implement `?redirect=` after login
4. Merge guest cart on login

**Acceptance Criteria:**

- [ ] Guest checkout works
- [ ] Email collected
- [ ] Login redirect functional
- [ ] Cart merge successful

---

### Feature 6: Implement Real Shipping

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** API controllers, website checkout

**Current State:** $5 flat rate hardcoded

**Implementation:**

1. Add shipping methods (standard/express)
2. Add shipping regions/zones
3. Calculate shipping from API
4. Display in cart/checkout
5. Remove "Digital delivery"

**Acceptance Criteria:**

- [ ] Multiple shipping methods
- [ ] Regional pricing
- [ ] API-calculated rates
- [ ] Displayed in UI
- [ ] No placeholders

---

### Feature 7: Implement Address Book

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** User profile, checkout

**Current State:** No address management

**Implementation:**

1. Add address CRUD to profile
2. Store multiple addresses
3. Select address in checkout
4. Set default address

**Acceptance Criteria:**

- [ ] Address CRUD functional
- [ ] Multiple addresses
- [ ] Checkout selection
- [ ] Default address

---

### Feature 8: Implement Order Cancellation and Returns

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** Order controllers, user account

**Current State:** No customer cancellation

**Implementation:**

1. Add cancel button for customer (pre-ship)
2. Implement RMA request flow
3. Add `refunded` status
4. Link to Stripe refunds
5. Add return instructions

**Acceptance Criteria:**

- [ ] Customer can cancel
- [ ] RMA request flow
- [ ] Refunded status
- [ ] Stripe refund linked
- [ ] Return instructions

---

### Feature 9: Implement Image Upload

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard product/brand forms, API

**Current State:** No image upload capability

**Implementation:**

1. Add Multer for uploads
2. Integrate Cloudinary or S3
3. Add upload UI in dashboard
4. Update `remotePatterns` for CDN
5. Use `next/image` everywhere

**Acceptance Criteria:**

- [ ] Multer configured
- [ ] Cloudinary/S3 integrated
- [ ] Upload UI functional
- [ ] CDN configured
- [ ] next/image used

---

### Feature 10: Implement Tax Calculation

**Priority:** MEDIUM  
**Effort:** Small (1 day)  
**Files:** Checkout, API

**Current State:** Tax hardcoded to 0

**Implementation:**

1. Add configurable tax rate
2. Calculate from API
3. Display in checkout
4. Add to order total

**Acceptance Criteria:**

- [ ] Tax rate configurable
- [ ] API calculation
- [ ] Displayed in UI
- [ ] Added to total

---

### Feature 11: Implement Verified Buyer Reviews

**Priority:** LOW  
**Effort:** Small (1 day)  
**Files:** Review controller, UI

**Current State:** No purchase verification

**Implementation:**

1. Check for paid order containing product
2. Add "verified purchase" badge
3. Only allow verified buyers to review

**Acceptance Criteria:**

- [ ] Purchase verified
- [ ] Badge displayed
- [ ] Verified-only reviews optional

---

## Phase 4: Arabic, Growth, and Advanced Features (Sprint 5-6 — 3-4 weeks)

**Objective:** Implement Arabic/RTL support and growth features

### Feature 12: Implement i18n and RTL

**Priority:** HIGH  
**Effort:** Large (1-2 weeks)  
**Files:** Entire application

**Current State:** No Arabic/RTL support

**Implementation:**

1. Install `next-intl` or similar
2. Add dynamic `lang` and `dir`
3. Implement Tailwind logical properties
4. Add currency/locale switching
5. Translate all user-facing text
6. Test RTL layouts

**Acceptance Criteria:**

- [ ] i18n configured
- [ ] RTL layout functional
- [ ] Currency switchable
- [ ] All text translated
- [ ] Arabic tested

---

### Feature 13: Implement Profile Editing and Password Change

**Priority:** MEDIUM  
**Effort:** Small (1-2 days)  
**Files:** User profile pages

**Current State:** Links exist but pages don't

**Implementation:**

1. Create profile edit page
2. Create password change page
3. Wire existing hooks
4. Add validation

**Acceptance Criteria:**

- [ ] Profile edit works
- [ ] Password change works
- [ ] Hooks wired
- [ ] Validation present

---

### Feature 14: Implement Real Order Tracking

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard, order pages

**Current State:** Timeline derived from status only

**Implementation:**

1. Add tracking number field
2. Add carrier field
3. Add tracking events
4. Input from dashboard
5. Display to customer

**Acceptance Criteria:**

- [ ] Tracking number field
- [ ] Carrier field
- [ ] Tracking events
- [ ] Dashboard input
- [ ] Customer display

---

### Feature 15: Implement Email Notifications

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** Email templates, controllers

**Current State:** Only order confirmation email

**Implementation:**

1. Add shipped notification
2. Add delivered notification
3. Add canceled notification
4. Add refunded notification
5. Use HTML templates

**Acceptance Criteria:**

- [ ] Shipped email
- [ ] Delivered email
- [ ] Canceled email
- [ ] Refunded email
- [ ] HTML templates

---

### Feature 16: Implement Newsletter and Contact Form

**Priority:** LOW  
**Effort:** Small (1-2 days)  
**Files:** Landing page, API

**Current State:** Placeholder links

**Implementation:**

1. Create newsletter signup
2. Create contact form
3. Add API endpoints
4. Add email sending

**Acceptance Criteria:**

- [ ] Newsletter signup
- [ ] Contact form
- [ ] API endpoints
- [ ] Email sending

---

### Feature 17: Implement Recently Viewed and Recommendations

**Priority:** LOW  
**Effort:** Medium (2-3 days)  
**Files:** API, storefront

**Current State:** Demo data only

**Implementation:**

1. Fix API endpoints (C3)
2. Implement co-purchase algorithm
3. Implement same-category recommendations
4. Wire to UI
5. Track recently viewed

**Acceptance Criteria:**

- [ ] API fixed
- [ ] Co-purchase working
- [ ] Category recommendations
- [ ] UI wired
- [ ] Recently viewed tracked

---

### Feature 18: Implement Bundles, Lookbooks, Gift Finder

**Priority:** LOW  
**Effort:** Medium (2-3 days)  
**Files:** API, storefront, dashboard

**Current State:** Structure exists but no seeds

**Implementation:**

1. Add seeds for bundles
2. Add seeds for lookbooks
3. Add seeds for gift finder
4. Wire links to API IDs
5. Update dashboard forms

**Acceptance Criteria:**

- [ ] Bundles seeded
- [ ] Lookbooks seeded
- [ ] Gift finder seeded
- [ ] Links use API IDs
- [ ] Dashboard forms work

---

## Phase 5: Dashboard Enhancements (Parallel to Phase 4)

### Feature 19: Complete Product Form

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard product form

**Current State:** Missing many fields from API

**Implementation:**

1. Add variants (size/color/stock/price/SKU)
2. Add multiple images
3. Add `isActive/featured` toggles
4. Add material/weight/dimensions
5. Add shipping info
6. Integrate image upload

**Acceptance Criteria:**

- [ ] Variants functional
- [ ] Multiple images
- [ ] Active/featured toggles
- [ ] Physical attributes
- [ ] Shipping info
- [ ] Image upload integrated

---

### Feature 20: Order Detail Page

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard

**Current State:** No detail page

**Implementation:**

1. Create order detail page
2. Display items, address, notes
3. Show payment IDs
4. Add tracking input
5. Add refund button
6. Add payment status filter
7. Add email search

**Acceptance Criteria:**

- [ ] Detail page created
- [ ] All details shown
- [ ] Tracking input
- [ ] Refund button
- [ ] Payment status filter
- [ ] Email search

---

### Feature 21: Low Stock Dashboard

**Priority:** MEDIUM  
**Effort:** Small (1-2 days)  
**Files:** Dashboard

**Current State:** API calculates `lowStock` but UI ignores it

**Implementation:**

1. Display low stock products
2. Add sorting by stock level
3. Add quick quantity edit
4. Add stock alerts

**Acceptance Criteria:**

- [ ] Low stock displayed
- [ ] Stock sorting
- [ ] Quick edit
- [ ] Stock alerts

---

### Feature 22: Server-Side Sorting and Pagination

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** All dashboard tables

**Current State:** Client-side only; fetches 50-100 at once

**Implementation:**

1. Add server-side sorting
2. Add server-side pagination
3. Add `placeholderData` to prevent flicker
4. Implement for all tables

**Acceptance Criteria:**

- [ ] Server-side sorting
- [ ] Server-side pagination
- [ ] No loading flicker
- [ ] All tables updated

---

### Feature 23: Analytics Dashboard

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard

**Current State:** `recharts` installed but unused

**Implementation:**

1. Add revenue over time chart
2. Add orders over time chart
3. Add top products chart
4. Add top brands chart
5. Add key metrics cards

**Acceptance Criteria:**

- [ ] Revenue chart
- [ ] Orders chart
- [ ] Top products
- [ ] Top brands
- [ ] Metrics cards

---

### Feature 24: Category Management

**Priority:** MEDIUM  
**Effort:** Large (3-4 days)  
**Files:** API, dashboard

**Current State:** No category model

**Implementation:**

1. Create Category model
2. Add hierarchy support
3. Add CRUD in dashboard
4. Add home module editor
5. Add review reply
6. Add store settings (shipping/tax)

**Acceptance Criteria:**

- [ ] Category model
- [ ] Hierarchy
- [ ] CRUD interface
- [ ] Home editor
- [ ] Review replies
- [ ] Store settings

---

### Feature 25: Customer Management

**Priority:** LOW  
**Effort:** Medium (2-3 days)  
**Files:** Dashboard

**Current State:** No customer management

**Implementation:**

1. Show order history per user
2. Add account disable (not delete)
3. Add customer notes
4. Add customer search

**Acceptance Criteria:**

- [ ] Order history
- [ ] Account disable
- [ ] Customer notes
- [ ] Customer search

---

## Phase 6: Infrastructure and DevOps (Ongoing)

### Task I1: Complete CI/CD Pipeline

**Priority:** HIGH  
**Effort:** Medium (2-3 days)  
**Files:** `.github/workflows/ci.yml`

**Current State:** Only basic CI; no deploy, no Dependabot

**Implementation:**

1. Add deploy job for API (Render)
2. Add deploy job for website (Vercel)
3. Add deploy job for dashboard (Vercel)
4. Add Dependabot configuration
5. Add security audit
6. Add e2e tests (Playwright)

**Acceptance Criteria:**

- [ ] API deploy automated
- [ ] Website deploy automated
- [ ] Dashboard deploy automated
- [ ] Dependabot configured
- [ ] Security audit
- [ ] E2E tests

---

### Task I2: Complete Monitoring and Logging

**Priority:** MEDIUM  
**Effort:** Medium (2-3 days)  
**Files:** API middleware

**Current State:** Basic console logging only

**Implementation:**

1. Implement pino structured logging
2. Add request IDs
3. Add Sentry integration
4. Add graceful shutdown
5. Add health check endpoint

**Acceptance Criteria:**

- [ ] Pino logging
- [ ] Request IDs
- [ ] Sentry integrated
- [ ] Graceful shutdown
- [ ] Health check

---

### Task I3: Complete Seeders

**Priority:** MEDIUM  
**Effort:** Small (1-2 days)  
**Files:** Seeders

**Current State:** Two versions; no admin; no CMS/bundles/lookbooks/QA

**Implementation:**

1. Merge into single seeder
2. Add NODE_ENV guard
3. Create admin user
4. Seed CMS content
5. Seed bundles
6. Seed lookbooks
7. Seed Q&A

**Acceptance Criteria:**

- [ ] Single seeder
- [ ] NODE_ENV guard
- [ ] Admin created
- [ ] CMS seeded
- [ ] Bundles seeded
- [ ] Lookbooks seeded
- [ ] Q&A seeded

---

### Task I4: Complete Documentation

**Priority:** LOW  
**Effort:** Medium (2-3 days)  
**Files:** README files, docs

**Current State:** Outdated documentation

**Implementation:**

1. Update API README
2. Update website README
3. Update dashboard README
4. Archive old docs
5. Add setup guide
6. Add deployment guide

**Acceptance Criteria:**

- [ ] API README updated
- [ ] Website README updated
- [ ] Dashboard README updated
- [ ] Old docs archived
- [ ] Setup guide
- [ ] Deployment guide

---

### Task I5: Clean Shared Packages

**Priority:** MEDIUM  
**Effort:** Small (1 day)  
**Files:** `packages/types`, `packages/api-client`

**Current State:** Unused packages; types duplicated 3 times

**Implementation:**

1. Decide: unify or remove
2. If unify: import from apps, remove api-client
3. If remove: delete packages, update aliases
4. Update all imports

**Acceptance Criteria:**

- [ ] Decision made
- [ ] Imports updated
- [ ] Dead code removed
- [ ] No duplication

---

## Phase 7: Optional Technical Debt (Post-Launch)

### Task T1: Remove Express Async Handler Wrappers

**Priority:** LOW  
**Effort:** Small (1 day)  
**Files:** API controllers

**Current State:** 115 unnecessary wraps (harmless but clutter)

**Implementation:**

1. Remove `express-async-handler` wraps
2. Express 5 handles async errors natively

**Acceptance Criteria:**

- [ ] Wrappers removed
- [ ] Error handling maintained
- [ ] Code cleaner

---

### Task T2: Standardize Response Contracts

**Priority:** LOW  
**Effort:** Medium (2-3 days)  
**Files:** All API controllers

**Current State:** Conflicting response shapes

**Implementation:**

1. Choose standard contract
2. Update all controllers
3. Update frontend clients
4. Add validation

**Acceptance Criteria:**

- [ ] Standard contract
- [ ] All controllers updated
- [ ] Clients updated
- [ ] Validation added

---

### Task T3: Add Database Indexes

**Priority:** MEDIUM  
**Effort:** Small (1 day)  
**Files:** Model files

**Current State:** Missing critical indexes

**Implementation:**

1. Add indexes to Order (user, createdAt, stripeSessionId, status)
2. Add indexes to Product (category, brand, price, isActive)
3. Add TTL to StripeWebhookEvent

**Acceptance Criteria:**

- [ ] Order indexes
- [ ] Product indexes
- [ ] TTL on webhooks
- [ ] Performance improved

---

## Execution Guidelines

### Sprint Planning

- Each sprint = 1-2 weeks
- Assign tasks based on team capacity
- Prioritize critical path items
- Leave buffer for unexpected issues

### Code Review Standards

- All changes require review
- Security changes require 2 approvals
- Payment changes require thorough testing
- Database changes require migration scripts

### Testing Requirements

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical workflows
- Security tests for all auth/payment flows
- Performance tests for high-traffic endpoints

### Deployment Strategy

- Phase 0-1: Immediate deployment to fix critical issues
- Phase 2-3: Feature flags for gradual rollout
- Phase 4-5: A/B testing for UX changes
- Phase 6-7: Maintenance windows for infrastructure

### Risk Mitigation

- Backup database before schema changes
- Test payment flows in Stripe sandbox
- Monitor error rates post-deployment
- Have rollback plan for each deployment
- Schedule changes during low-traffic periods

---

## Success Metrics by Phase

### Phase 0 (Critical Recovery)

- [ ] All services start without errors
- [ ] CI/CD passes consistently
- [ ] Dashboard fully accessible
- [ ] No 500 errors in production

### Phase 1 (Security)

- [ ] No OWASP Top 10 vulnerabilities
- [ ] Payment flows secure
- [ ] Rate limiting effective
- [ ] Security audit passes

### Phase 2 (Stability)

- [ ] Complete purchase workflow works
- [ ] Dashboard fully functional
- [ ] No data loss scenarios
- [ ] Error rates < 0.1%

### Phase 3 (Revenue)

- [ ] Conversion rate increases
- [ ] Cart abandonment decreases
- [ ] Average order value increases
- [ ] Customer satisfaction improves

### Phase 4 (Growth)

- [ ] Arabic users can use site
- [ ] SEO traffic increases
- [ ] Organic search improves
- [ ] International expansion possible

### Phase 5 (Dashboard)

- [ ] Admin efficiency improves
- [ ] Time to task decreases
- [ ] Data accuracy increases
- [ ] User satisfaction high

### Phase 6 (Infrastructure)

- [ ] Uptime > 99.9%
- [ ] Deployment time < 5 minutes
- [ ] Error detection < 1 minute
- [ ] Documentation complete

---

## Conclusion

This execution plan provides a comprehensive roadmap for transforming TrendVaulta from its current unstable state into a production-ready, secure, and scalable e-commerce platform. The phased approach ensures critical issues are addressed first, followed by security hardening, workflow stabilization, and finally feature expansion.

**Key Success Factors:**

1. Execute Phase 0 immediately to unblock development
2. Prioritize security fixes in Phase 1 before processing real payments
3. Implement comprehensive testing before each deployment
4. Monitor metrics continuously and adjust course as needed
5. Maintain code quality through rigorous review

**Estimated Timeline:**

- Phase 0: 1-2 weeks (critical)
- Phase 1: 3-4 weeks (security)
- Phase 2: 3-4 weeks (stability)
- Phase 3: 4-6 weeks (revenue features)
- Phase 4: 4-6 weeks (growth features)
- Phase 5: 4-6 weeks (dashboard)
- Phase 6: Ongoing (infrastructure)

**Total Estimated Time:** 4-6 months to full production readiness

---

_This document should be reviewed and updated regularly as the project progresses and new requirements emerge._
