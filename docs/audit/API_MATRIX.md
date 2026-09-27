# TrendVaulta — API Matrix

> Part of the 2026-09-27 technical audit. See [AUDIT_REPORT.md](AUDIT_REPORT.md) for the finding details (IDs in the **Issues** column) and [AUDIT_PROMPT.md](AUDIT_PROMPT.md) for the method.
> Source of truth: `apps/api/app.js:23-104` (mounts) + `apps/api/routes/*.js`. All routers are mounted at `/api/`; paths below are full paths.

**Legend**

- **Auth**: `public` = no token · `JWT` = `verfiyToken` · `optJWT` = `optionalVerifyToken` · `Stripe sig` = webhook signature.
- **Permission**: value passed to `checkRolePermission` (exact match; wildcards such as `content:*` are ignored, see OPS-718). `owner` = ownership check in controller.
- **Validator**: `validate(schema)` = Joi middleware (body only, `stripUnknown: true`) · `inline` = Joi/ad-hoc inside the controller · `—` = none.
- **Used by**: `web` = `apps/website/src/lib/api.ts` (or Next route handler) · `dash` = `apps/dashboard/src/lib/api.ts` · `none` = no client caller found.
- **RL**: route-level rate limiter present.

Finding-ID aliases (merged duplicates): API-101 → OPS-701 · API-103 → OPS-712 · API-105/API-324 → API-228 · API-106 → OPS-718 · DASH-601 → API-301 · DASH-604 → SEC-105 · DASH-607 → SEC-103 · DASH-608 → SEC-101/DASH-602 · DASH-610 → API-322 · DASH-611 → API-310 · DASH-614 → API-223 · DASH-616 → SEC-113 · DASH-619/WEB-502 → API-311 · DASH-623 → API-323 · OPS-704 → PAY-205 · OPS-705 → API-304 · OPS-711 → API-214 · WEB-525 → API-312.

---

## 1. Ops, health, webhooks, static

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| POST | /api/webhooks/stripe | Stripe sig | — | raw body (`app.js:23-27`, before `express.json`) + `constructEvent` | payment.`stripeWebhook` | Stripe | PAY-201, PAY-202, PAY-203, PAY-204, OPS-713 |
| GET | /health | public | — | — | inline `app.js:62` | none | OPS-714 |
| GET | /api/trendvaulta | public | — | — | inline `routes/trendvaulta.js:10` (duplicate unreachable at `app.js:135`) | none | OPS-714, OPS-718 |
| GET | /api/ready | public | — | — | inline `routes/trendvaulta.js:22` | Render healthCheckPath | — |
| GET | /, /api/, /favicon.ico | public | — | — | inline `app.js:107-133` | none | OPS-722 |
| GET | /uploads/* | public | — | `express.static`, `index:false` | static | web, dash (image URLs) | SEC-117 |

## 2. Auth, profile, password

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| POST | /api/auth/register | public, RL | — | inline `validateRegisterUser` | auth.`registerUser` | web (via Next `/api/auth/register`) | SEC-108, SEC-112 |
| POST | /api/auth/login | public, RL | — | inline `validateLoginUser` | auth.`loginUser` | web (Next handler), dash | SEC-108, SEC-112, SEC-115 |
| POST | /api/auth/refresh | refresh token, RL | — | `validate(refreshSchema)` | auth.`refreshAccessToken` | web (Next handler), dash | SEC-102, SEC-103, SEC-116, DASH-606 |
| POST | /api/auth/logout | public (token in body) | — | typeof check | auth.`logoutUser` | web (Next handler), dash | — |
| GET | /api/auth/profile | JWT | — | — | profile.`getProfile` | web, dash | DASH-621 (server `permissions` unused) |
| PUT | /api/auth/profile | JWT | — | ad-hoc inline | profile.`updateProfile` | web, dash | SEC-107, API-102, SEC-112 |
| GET | /api/auth/addresses | JWT | owner | — | profile.`getAddresses` | web | — |
| POST | /api/auth/addresses | JWT | owner | inline `validateCreateAddress` | profile.`createAddress` | web | — |
| PUT | /api/auth/addresses/:addressId | JWT | owner | inline `validateUpdateAddress` | profile.`updateAddress` | web | — |
| DELETE | /api/auth/addresses/:addressId | JWT | owner | — | profile.`deleteAddress` | web | — |
| PATCH | /api/auth/addresses/:addressId/default | JWT | owner | — | profile.`setDefaultAddress` | web | — |
| POST | /api/password/forgot-password | public, RL | — | inline Joi | password.`sendForgotPasswordLink` | web | SEC-106, SEC-112, OPS-712 |
| POST | /api/password/reset-password/:userId/:token | public (reset JWT), RL | — | `validate(resetPasswordSchema)` + inline | password.`resetPassword` | web | OPS-712 |
| POST | /api/password/change | JWT, RL | — | inline Joi | password.`changePassword` | web (not dash) | SEC-110, SEC-118, SEC-105 |

## 3. Users, settings, uploads, admin stats

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| GET | /api/users | JWT | users:read | query parsing (escaped `q`) | user.`getAllUsers` | dash | SEC-114 |
| GET | /api/users/:id | JWT | users:read | — | user.`getUserById` | none | SEC-114 |
| PUT | /api/users/:id | JWT | users:write | inline `validateUpdateUser` | user.`updateUser` | dash (Users, Settings password) | SEC-105, SEC-111, SEC-113 |
| DELETE | /api/users/:id | JWT | users:delete | — | user.`deleteUser` (hard) | dash | SEC-111, SEC-113, OPS-725 |
| GET | /api/admin/settings | JWT | content:read | — | settings.`getSettings` | dash | — |
| PUT | /api/admin/settings | JWT | **content:write** (moderators) | inline `validateUpdateStoreSettings` | settings.`updateSettings` | dash (admin-only UI) | **SEC-101**, API-107 |
| POST | /api/uploads | JWT | inline `products:write` OR `brands:write` | multer 5 MB + MIME + magic bytes | upload.`uploadImage` | dash | SEC-117 |
| GET | /api/admin/stats | JWT | orders:read | — | adminStats.`getAdminStats` | dash | API-221 |
| GET | /api/admin/analytics | JWT | orders:read | — | adminStats.`getAdminAnalytics` | dash | API-221 |
| GET | /api/admin/low-stock | JWT | products:read | — | adminStats.`getLowStockProducts` | dash | API-221, DASH-615 |

## 4. Payments and orders

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| GET | /api/payments/setup-status | public | — | — | payment.`getPaymentsSetupStatus` | web | — |
| POST | /api/payments/quote | public, RL | — | inline `validateQuote` | payment.`quoteOrder` | web | API-202, API-208, API-209 |
| POST | /api/payments/checkout-session | JWT, RL | any user | inline `validateCreateOrder` | payment.`createCheckoutSession` | web | **API-201**, **API-202**, **API-203**, API-207, API-216, PAY-206, PAY-207, PAY-208 |
| POST | /api/payments/verify-payment | JWT, RL | owner (403) | — | payment.`verifyPaymentStatus` | web | PAY-201, PAY-203, API-216 |
| POST | /api/orders | JWT | any user (only when Stripe off or `DEV_ALLOW_DIRECT_ORDERS`) | inline `validateCreateOrder` | order.`createOrder` | web (dev fallback) | API-201, API-203 |
| GET | /api/orders/my | JWT | owner | — | order.`getMyOrders` | web | API-217, API-218 |
| GET | /api/orders | JWT | orders:read | inline query parsing | order.`getAllOrders` | dash | API-229 |
| GET | /api/orders/:id | JWT | owner or admin/moderator | — | order.`getOrderById` | web, dash | API-217 |
| PATCH | /api/orders/:id/status | JWT | orders:write | inline Joi | order.`updateOrderStatus` | dash | API-205, API-206, API-213, API-226 |
| PATCH | /api/orders/:id/tracking | JWT | orders:write | inline Joi | order.`updateOrderTracking` | dash | DASH-602, API-228 |
| POST | /api/orders/:id/cancel | JWT | owner | — | order.`cancelOrder` | web | API-206 |
| GET | /api/orders/:id/invoice | JWT | owner or admin (moderator excluded) | — | order.`getOrderInvoice` | none | API-214 |
| POST | /api/orders/:id/return | JWT | owner | inline Joi | return.`createReturnRequest` | web | API-230 |
| GET | /api/orders/:id/return | JWT | owner or staff | — | return.`getReturnRequest` | none | — |
| PATCH | /api/orders/:id/return | JWT | orders:write | inline Joi | return.`updateReturnRequest` | dash | API-205, API-207 |

## 5. Coupons, offers, shipping, bundles

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| POST | /api/coupons/validate | public, RL | — | inline `validateCouponCode` | coupon.`validateCoupon` | web | API-215, WEB-501 |
| GET | /api/coupons/code/:code | public, RL | — | — | coupon.`getCouponByCode` | none (dead web method) | API-215 |
| GET | /api/coupons | JWT | coupons:read | — | coupon.`getAllCoupons` | dash | — |
| GET | /api/coupons/:id | JWT | coupons:read | — | coupon.`getCouponById` | none | — |
| POST | /api/coupons | JWT | coupons:write | inline `validateCreateCoupon` | coupon.`createCoupon` | dash | API-215, API-227 |
| PUT | /api/coupons/:id | JWT | coupons:write | inline `validateUpdateCoupon` | coupon.`updateCoupon` | dash | API-215 |
| DELETE | /api/coupons/:id | JWT | coupons:delete | — | coupon.`deleteCoupon` (soft) | dash | DASH-612 |
| POST | /api/coupons/:id/use | JWT | coupons:write | — | coupon.`incrementCouponUsage` | none | API-204 |
| GET | /api/offers | public | — | — | offer.`getOffers` | web (`active=true`) | API-222 |
| GET | /api/offers/admin | JWT | offers:read | — | offer.`getAllOffers` | dash | DASH-631 |
| GET | /api/offers/:id | JWT | offers:read | — | offer.`getOfferById` | none | — |
| POST | /api/offers | JWT | offers:write | inline `parseOfferBody` | offer.`createOffer` | dash | API-222 |
| PUT | /api/offers/:id | JWT | offers:write | inline `parseOfferBody` | offer.`updateOffer` | dash | API-222 |
| DELETE | /api/offers/:id | JWT | offers:delete | — | offer.`deleteOffer` (soft) | dash | — |
| GET | /api/shipping/zones | public | — | — | shipping.`getShippingZones` | none | — |
| GET | /api/shipping/methods | JWT | any user | — (`country` required) | shipping.`getShippingMethodsForAddress` | web | API-202, API-208 |
| GET | /api/admin/shipping/zones | JWT | shipping:read | — | shipping.`getAllShippingZonesAdmin` | none | DASH-609 |
| POST | /api/admin/shipping/zones | JWT | shipping:write | inline `validateShippingZone` | shipping.`createShippingZone` | none | API-208, DASH-609 |
| GET | /api/admin/shipping/zones/:id | JWT | shipping:read | — | shipping.`getShippingZoneById` | none | DASH-609 |
| PUT | /api/admin/shipping/zones/:id | JWT | shipping:write | inline `validateShippingZone` | shipping.`updateShippingZone` | none | API-208, DASH-609 |
| DELETE | /api/admin/shipping/zones/:id | JWT | shipping:write | — | shipping.`deleteShippingZone` | none | DASH-609 |
| POST | /api/admin/shipping/zones/:id/methods | JWT | shipping:write | inline `validateShippingMethod` | shipping.`addShippingMethod` | none | API-209, DASH-609 |
| PUT | /api/admin/shipping/zones/:id/methods/:methodId | JWT | shipping:write | inline `validateShippingMethod` | shipping.`updateShippingMethod` | none | DASH-609 |
| DELETE | /api/admin/shipping/zones/:id/methods/:methodId | JWT | shipping:write | — | shipping.`deleteShippingMethod` | none | DASH-609 |
| GET | /api/products/:id/bundles | public | — | — | bundle.`getProductBundles` | web | API-210 |
| GET | /api/bundles/admin | JWT | content:read | — | bundle.`getAllBundles` | dash | DASH-603 |
| GET | /api/bundles/:id | JWT | content:read | — | bundle.`getBundleById` | none (dead dash method) | DASH-630 |
| POST | /api/bundles | JWT | content:write | `validate(createBundleSchema)` | bundle.`createBundle` | dash | API-210, API-224, DASH-626 |
| PUT | /api/bundles/:id | JWT | content:write | `validate(updateBundleSchema)` | bundle.`updateBundle` | dash | API-224 |
| DELETE | /api/bundles/:id | JWT | content:delete | — | bundle.`deleteBundle` (soft) | dash | API-224 |

## 6. Catalog: products, brands, categories, recommendations

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| GET | /api/products | optJWT | staff-only flags | inline `validateProductListQuery` | product.`getAllProducts` | web, dash | API-219, API-228 |
| GET | /api/products/:id | optJWT | inactive → staff only | — | product.`getProductById` | web | WEB-533 |
| POST | /api/products | JWT | products:write | inline `validateCreateProduct` | product.`createProduct` | dash | API-207, API-211, API-220 |
| PUT | /api/products/:id | JWT | products:write | inline `validateUpdateProduct` | product.`updateProduct` | dash | API-211, API-220, DASH-615, DASH-628 |
| DELETE | /api/products/:id | JWT | products:delete | — | product.`deleteProduct` (hard) | dash | API-212, DASH-603 |
| GET | /api/brands | optJWT | staff `includeInactive` | — | brand.`getAllBrands` | web, dash | API-223, API-228 |
| GET | /api/brands/:id | public | — | — | brand.`getBrandById` | web | API-223 |
| POST | /api/brands | JWT | brands:write | inline `validateCreateBrand` | brand.`createBrand` | dash | — |
| PUT | /api/brands/:id | JWT | brands:write | inline `validateUpdateBrand` | brand.`updateBrand` | dash | — |
| DELETE | /api/brands/:id | JWT | brands:delete | — | brand.`deleteBrand` (hard) | dash | API-212 |
| GET | /api/storefront/categories | public | — | — | categories.`getStorefrontCategories` | web | API-315, API-329 |
| GET | /api/categories/admin | JWT | products:read | — | categories.`getAdminCategories` | dash | — |
| POST | /api/categories | JWT | products:write | `validate(createCategorySchema)` | categories.`createCategory` | dash | — |
| PUT | /api/categories/:id | JWT | products:write | `validate(updateCategorySchema)` | categories.`updateCategory` | dash | — |
| DELETE | /api/categories/:id | JWT | products:delete | — | categories.`deleteCategory` | dash | — |
| GET | /api/recommendations | public | — | — (clamped) | recommendation.`getRecommendations` | web | — |

## 7. Reviews, Q&A, wishlist, recently viewed

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| GET | /api/reviews/product/:productId | public | — | — | review.`getProductReviews` | web | API-314 |
| GET | /api/reviews/admin | JWT | reviews:read | manual | review.`getAdminReviews` | dash | API-228 |
| PUT | /api/reviews/admin/:reviewId/reply | JWT | reviews:write | inline Joi | review.`replyToReview` | dash | — |
| DELETE | /api/reviews/admin/:reviewId/reply | JWT | reviews:write | — | review.`deleteReviewReply` | dash | — |
| DELETE | /api/reviews/admin/:reviewId | JWT | reviews:delete | — | review.`adminDeleteReview` | dash | API-314 |
| POST | /api/reviews | JWT | purchase gate (staff bypass) | inline Joi | review.`createReview` | web | API-314, API-327, WEB-509, WEB-526 |
| PUT | /api/reviews/:reviewId | JWT | owner | inline Joi | review.`updateReview` | web | API-314, WEB-526 |
| DELETE | /api/reviews/:reviewId | JWT | owner | — | review.`deleteReview` | web | API-314, WEB-526 |
| GET | /api/reviews/my/:productId | JWT | owner | — | review.`getMyReview` | none (hook unused) | — |
| GET | /api/reviews/my | JWT | owner | — | review.`getMyReviews` | web | API-228 |
| GET | /api/products/:id/qa | public | — | — | productQA.`getProductQA` | web | API-306 |
| POST | /api/products/:id/qa | JWT | — | `validate(createProductQuestionSchema)` | productQA.`createProductQuestion` | web | API-307 |
| POST | /api/qa/:id/helpful | JWT | — | `validate(markHelpfulSchema)` | productQA.`markHelpful` | web | API-306 |
| GET | /api/qa/admin | JWT | content:read | — | productQA.`getAllProductQA` | dash | DASH-603 |
| GET | /api/qa/:id | JWT | content:read | — | productQA.`getProductQAById` | none (dead dash method) | DASH-630 |
| PUT | /api/qa/:id/answer | JWT | content:write | `validate(answerProductQASchema)` | productQA.`answerProductQuestion` | dash | API-327, DASH-624 |
| DELETE | /api/qa/:id | JWT | content:delete | — | productQA.`deleteProductQA` | dash | — |
| POST | /api/wishlist/:productId | JWT | owner | — | wishlist.`addToWishlist` | web | API-316, WEB-527 |
| DELETE | /api/wishlist/:productId | JWT | owner | — | wishlist.`removeFromWishlist` | web | WEB-527 |
| GET | /api/wishlist/my | JWT | owner | — | wishlist.`getMyWishlist` | web | API-316, WEB-522 |
| GET | /api/wishlist/check/:productId | JWT | owner | — | wishlist.`checkWishlist` | web | API-330 |
| POST | /api/me/recently-viewed | JWT | owner | `validate(trackRecentlyViewedSchema)` | recentlyViewed.`trackRecentlyViewed` | web | API-316 |
| GET | /api/me/recently-viewed | JWT | owner | — | recentlyViewed.`getRecentlyViewed` | web | API-316, WEB-410 |

## 8. Storefront CMS

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| GET | /api/storefront/home | public | — | — | storefrontHome.`getStorefrontHome` (static) | web (fallback only) | API-312, API-320 |
| GET | /api/storefront/modules | public | — | — | storefrontModule.`getStorefrontModules` | web | **API-301**, API-310, API-319 |
| GET | /api/storefront-modules/admin | JWT | content:read | — | storefrontModule.`getAllStorefrontModules` | dash | API-228 |
| GET | /api/storefront-modules/:id | JWT | content:read | — | storefrontModule.`getStorefrontModuleById` | none (dead dash method) | DASH-630 |
| POST | /api/storefront-modules | JWT | content:write | `validate(createStorefrontModuleSchema)` | storefrontModule.`createStorefrontModule` | dash | API-301, API-319, API-321, DASH-612 |
| PUT | /api/storefront-modules/:id | JWT | content:write | `validate(updateStorefrontModuleSchema)` | storefrontModule.`updateStorefrontModule` | dash | API-319, DASH-612 |
| DELETE | /api/storefront-modules/:id | JWT | content:delete | — | storefrontModule.`deleteStorefrontModule` (soft) | dash | API-321, DASH-612 |
| GET | /api/storefront/trust | public | — | — | trust.`getStorefrontTrust` (static) | web | API-311 |
| GET | /api/storefront/why-choose-us | public | — | — | whyChooseUs.`getWhyChooseUs` (static) | web | API-311 |
| GET | /api/storefront/testimonials | public | — | — | testimonials.`getTestimonials` | web | **API-302**, API-311, API-313 |
| GET | /api/testimonials/admin | JWT | content:read | — | testimonials.`getAllTestimonials` | dash | — |
| GET | /api/testimonials/:id | JWT | content:read | — | testimonials.`getTestimonialById` | none (dead dash method) | DASH-630 |
| POST | /api/testimonials | JWT | content:write | `validate(createTestimonialSchema)` | testimonials.`createTestimonial` | dash | API-313 |
| PUT | /api/testimonials/:id | JWT | content:write | `validate(updateTestimonialSchema)` | testimonials.`updateTestimonial` | dash | API-313, API-322 |
| DELETE | /api/testimonials/:id | JWT | content:delete | — | testimonials.`deleteTestimonial` (soft) | dash | API-302 |
| GET | /api/storefront/lookbooks | public | — | — | lookbook.`getLookbooks` | web | **API-302**, API-311, API-319 |
| GET | /api/lookbooks/admin | JWT | content:read | — | lookbook.`getAllLookbooks` | dash | DASH-631 |
| GET | /api/lookbooks/:id | JWT | content:read | — | lookbook.`getLookbookById` | none (dead dash method) | DASH-630 |
| POST | /api/lookbooks | JWT | content:write | `validate(createLookbookSchema)` | lookbook.`createLookbook` | dash | API-319, DASH-629 |
| PUT | /api/lookbooks/:id | JWT | content:write | `validate(updateLookbookSchema)` | lookbook.`updateLookbook` | dash | API-322 |
| DELETE | /api/lookbooks/:id | JWT | content:delete | — | lookbook.`deleteLookbook` (soft) | dash | API-302 |
| GET | /api/storefront/gift-finder | public | — | — | giftFinder.`getGiftFinderConfig` | web | API-311, API-320, API-321 |
| GET | /api/gift-finder/admin | JWT | content:read | — | giftFinder.`getAllGiftFinderConfigs` | dash | — |
| GET | /api/gift-finder/:id | JWT | content:read | — | giftFinder.`getGiftFinderConfigById` | none (dead dash method) | DASH-630 |
| POST | /api/gift-finder | JWT | content:write | `validate(createGiftFinderConfigSchema)` | giftFinder.`createGiftFinderConfig` | dash | API-321, API-323 |
| PUT | /api/gift-finder/:id | JWT | content:write | `validate(updateGiftFinderConfigSchema)` | giftFinder.`updateGiftFinderConfig` | dash | API-323 |
| DELETE | /api/gift-finder/:id | JWT | content:delete | — | giftFinder.`deleteGiftFinderConfig` (**hard**) | dash | API-321 |
| GET | /api/storefront/help | public | — | — | helpTopic.`getHelpTopics` | web (`active=true`) | API-311 |
| GET | /api/help-topics/admin | JWT | content:read | — | helpTopic.`getAllHelpTopics` | dash | DASH-631 |
| GET | /api/help-topics/:id | JWT | content:read | — | helpTopic.`getHelpTopicById` | none | — |
| POST | /api/help-topics | JWT | content:write | manual | helpTopic.`createHelpTopic` | dash | — |
| PUT | /api/help-topics/:id | JWT | content:write | manual | helpTopic.`updateHelpTopic` | dash | API-318 |
| DELETE | /api/help-topics/:id | JWT | content:delete | — | helpTopic.`deleteHelpTopic` (soft) | dash | — |
| GET | /api/content?type= | public | — | manual | content.`getContent` | web (shipping, returns) | API-311, API-331 |
| GET | /api/content/admin | JWT | content:read | — | content.`getAllContent` | dash | DASH-631 |
| GET | /api/content/:id | JWT | content:read | — | content.`getContentById` | none | — |
| POST | /api/content | JWT | content:write | manual `parseContentBody` | content.`createContent` | dash | **API-303** |
| PUT | /api/content/:id | JWT | content:write | manual | content.`updateContent` | dash | API-318 |
| DELETE | /api/content/:id | JWT | content:delete | — | content.`deleteContent` (soft) | dash | — |

## 9. Marketing: newsletter, contact

| Method | Path | Auth | Permission | Validator | Controller | Used by | Issues |
|---|---|---|---|---|---|---|---|
| POST | /api/newsletter | public, RL (10/15 min) | — | inline Joi | newsletter.`subscribe` | web (Footer) | API-308 |
| POST | /api/newsletter/unsubscribe | public, RL | — | inline Joi | newsletter.`unsubscribe` | none (hook, no UI) | API-308 |
| GET | /api/newsletter/admin | JWT | content:read | — | newsletter.`getAdminSubscribers` | none | API-309, API-317 |
| POST | /api/contact | public, RL (5/15 min), honeypot | — | inline Joi | contact.`createContactMessage` | web | API-309 |
| GET | /api/contact/admin | JWT | content:read | — | contact.`getAdminContactMessages` | none | API-309, API-317 |

---

## Summary

| Metric | Count |
|---|---|
| Endpoint rows listed | 158 |
| Rows with no client caller (`none`) | 31 (incl. 3 ops rows; notable: 8 shipping-zone admin, contact/newsletter admin, invoice, admin `GET /:id` lookups) |
| Public write endpoints without rate limit | Q&A create, helpful vote, reviews, wishlist, recently viewed (JWT-gated but unthrottled) |
| Routes whose `validate()` covers params/query | 0 (`middlewares/validate.js:10` validates `req.body` only; ObjectId errors fall to the CastError → 400 mapper) |
| Admin routes missing `checkRolePermission` | 0 (confirmed by the SEC slice scan; `/uploads` uses an inline check) |
