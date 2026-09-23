# TrendVaulta — Feature Roadmap & Critical Fixes

**المصدر**: تحليل النظام الشامل (`FULL_SYSTEM_ANALYSIS.md`) + خبرة 30+ سنة Full Stack  
**التاريخ**: 2026-09-21  
**الحالة**: 🟢 Sprint 0-3 مكتمل | 🟡 Sprint 4 جزئي (90%) | 🔴 Sprint 5-6 لم يبدأ

---

## 🎯 الملخص التنفيذي

✅ **سبرنت 0-3 مكتمل بالكامل** — API يقلع، CI أخضر، كل الداشبورد يعمل، مسار الشراء كامل، SEO جاهز.  
⚠️ **سبرنت 4** — 90% مكتمل (CDN للصور غير مضبوط).  
🔴 **سبرنت 5-6** — لم يبدأ التنفيذ (شحن/ضريبة/RMA/RTL/Full Dashboard).

| أولوية | السبرنت             | المدة      | المعيار                                         | الحالة                        |
| ------ | ------------------- | ---------- | ----------------------------------------------- | ----------------------------- |
| 🔴     | **0 — إنقاذ**       | أسبوع      | API يقلع، CI أخضر، كل الداشبورد يعمل            | ✅ **مكتمل**                  |
| 🟠     | **1 — دفع/مخزون**   | أسبوعين    | لا خصم مزدوج، لا oversell، refund يعمل          | ✅ **مكتمل**                  |
| 🟡     | **2 — أمان/Config** | أسبوع      | لا تسريب، rate limit خلف proxy، NODE_ENV مطلوب  | ✅ **90% مكتمل** (S4 جزئي)    |
| 🟢     | **3 — متجر يبيع**   | أسبوعين    | مسار كامل: بحث → variant → سلة ضيف → دفع → نجاح | ✅ **مكتمل**                  |
| 🔵     | **4 — SEO/محتوى**   | أسبوعين    | Lighthouse SEO ≥ 90، JSON-LD، sitemap           | 🟡 **90% مكتمل** (CDN images) |
| 🟣     | **5 — تجارة كاملة** | 3-4 أسابيع | شحن/ضريبة/عناوين/إرجاع end-to-end               | ❌ **لم يبدأ**                |
| ⚪     | **6 — عربية/نمو**   | 3-4 أسابيع | RTL كامل، إشعارات، تتبع، نشرة                   | ❌ **لم يبدأ**                |

---

## ✅ السبرنت 0: إنقاذ النظام (Blockers — **مكتمل بالكامل**)

| #      | المشكلة                                                    | الملف                                                                                                        | الإصلاح                                                                  | جهد | الحالة |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --- | ------ |
| **C1** | API لا يقلع — 7 routes تستورد `middlewares/auth` غير موجود | `routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js` | تغيير الاستيراد إلى `require('../middlewares/verfiyToken')`              | S   | ✅     |
| **C2** | 8 شاشات داشبورد 403 — صلاحيات `content:*` غير معرفة        | `middlewares/rolePermissions.js`                                                                             | إضافة `content:*` لـ admin، `content:read/write` لـ moderator            | S   | ✅     |
| **C3** | `/recommendations` و `/products/:id/qa` ترمي 500           | `controllers/{recommendations,productQA}.controller.js`                                                      | تصحيح استيراد `Product` → `{ Product }`؛ حذف controller مكرر             | S   | ✅     |
| **C4** | CI معطل — 3 lockfiles غير متزامنة                          | `package-lock.json` (root + api + website)                                                                   | حذف locks الفرعية، commit root lock، تحديث `ci.yml` لـ `npm ci` من الجذر | S   | ✅     |
| **C5** | Lint الداشبورد ميت — لا config                             | `apps/dashboard/`                                                                                            | إضافة `eslint.config.js`، إزالة `.eslintrc*` من `.gitignore`             | S   | ✅     |
| **C6** | CI يشغل 8 اختبارات من 105                                  | `apps/api/package.json:9`                                                                                    | `test: node --test utils middlewares` + smoke test `require('./app')`    | S   | ✅     |

---

## ✅ السبرنت 1: الدفع والمخزون (خسارة مالية مباشرة — **مكتمل بالكامل**)

### 1.1 تدفق الدفع — P1 إلى P5

| #      | المشكلة                       | الدليل                          | الإصلاح                                                                                            | الحالة |
| ------ | ----------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| **P1** | إلغاء طلب مدفوع لا يعيد المال | `order.controller.js:233-244`   | استدعاء `stripe.refunds.create` + معالجة `charge.refunded` + حالة `refunded`                       | ✅     |
| **P2** | Race condition في mark-paid   | `payment.controller.js:210-242` | Claim ذرّي: `findOneAndUpdate({_id, paymentStatus:{$ne:'paid'}}, …)` + `$inc` شرطي                 | ✅     |
| **P3** | Oversell + طلب عالق           | `commerce.js:143-148`، webhook  | عند نقص مخزون بعد الدفع: وسم `needs_attention` أو refund تلقائي — لا تفشل webhook                  | ✅     |
| **P4** | تجاوز آلة الحالات             | `payment.controller.js:238`     | فحص الانتقال عبر `orderTransitions` قبل الكتابة                                                    | ✅     |
| **P5** | أحداث Stripe ناقصة            | `app.js` webhook                | إضافة `session.expired`، `payment_failed`، `charge.refunded` + `expires_at: 30min` + تنظيف كوبونات | ✅     |

### 1.2 ربط المتجر بالـ variants (W1, W2, W6)

| #      | الميزة                               | الملفات                                                        | الحالة |
| ------ | ------------------------------------ | -------------------------------------------------------------- | ------ |
| **W1** | إرسال variant للسلة (size/color)     | `website/src/app/products/[id]/page.tsx:83-91`، `cartStore.ts` | ✅     |
| **W2** | مفتاح سلة = productId+size+color     | `website/src/lib/cartStore.ts:142-174`                         | ✅     |
| **W6** | حد أقصى كمية حسب المخزون + أسعار حية | `website/src/app/checkout/page.tsx:110,606`                    | ✅     |

---

## 🟡 السبرنت 2: الأمان + Config مركزي (أسبوع — **90% مكتمل**)

### 2.1 ثغرات أمان — S1 إلى S9

| #      | الثغرة                                             | الملف                                                         | الإصلاح                                                           | الحالة                                                                           |
| ------ | -------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **S1** | Rate limiter قابل للتجاوز (X-Forwarded-For)        | `middlewares/rateLimit.js:6-12` + `app.js`                    | `app.set('trust proxy', 1)` + استخدام `req.ip`                    | ✅                                                                               |
| **S2** | NoSQL injection + تعداد إيميلات في forgot-password | `controllers/password.controller.js:20-27`                    | Joi `string().email()` + رد 200 دائمًا                            | ✅                                                                               |
| **S3** | تسريب إيميلات في reviews/Q&A العامة                | `controllers/{review,productQA}.controller.js`                | `populate('user', 'username')` فقط                                | ✅                                                                               |
| **S4** | Tokens في cookies قابلة للقراءة (لا httpOnly)      | `website/src/lib/authCookies.ts:36-42`                        | `secure`+`sameSite`+`httpOnly`؛ نقل refresh إلى httpOnly cookie   | ⚠️ **جزئي** — refresh في httpOnly، لكن access token + role لا يزالان JS-readable |
| **S5** | XSS من CMS content                                 | `website/src/app/shipping/page.tsx:49`، `returns/page.tsx:49` | DOMPurify أو markdown renderer                                    | ✅ (Custom sanitizer `sanitizeHtml.ts`)                                          |
| **S6** | تسريب تفاصيل داخلية في الأخطاء                     | `app.js:126-127`، `checkRolePermission.js:15-20`              | Error mapping: CastError→400، 11000→409، رسالة عامة في production | ✅                                                                               |
| **S7** | Regex injection في البحث                           | `controllers/{product,brand}.controller.js`                   | Escape + حد طول؛ الأفضل text index                                | ✅ (`escapeRegex` + `$text` index)                                               |
| **S8** | جلسات لا تُبطَل بعد تغيير كلمة المرور              | `controllers/{password,user}.controller.js`                   | استدعاء `revokeAllForUser` بعد reset/تغيير                        | ✅                                                                               |
| **S9** | NODE_ENV غير مضبوط = تطوير في الإنتاج              | `app.js` CORS، TLS، reset link                                | وحدة config مركزية تتحقق من المتغيرات وتفشل مبكرًا                | ✅ (`config/env.js`)                                                             |

### 2.2 تصحيحات منطقية في API

- `GET /brands/:slug` يعطي 500 لغير ObjectId → ✅ إصلاح `$or` في `brand.controller.js:99`
- `getProfile` يعيد `permissions: []` دائماً → ✅ ضبط `req.userPermissions` في middleware
- `?limit=abc` → NaN → 500 في 8 controllers → ✅ استخدام `utils/pagination.js`
- `User.email` بدون `lowercase` → تكرار حسابات → ✅ إضافة `lowercase: true` في schema
- عقود ردود متضاربة → ✅ توحيد إلى `{ message, data?, errors?, meta? }`
- Indexes ناقصة: `Order(user, createdAt, stripeSessionId, status)`، `Product(category, brand, price, isActive)`، TTL على `StripeWebhookEvent` → ✅ مضبوطة
- `render.yaml` يستخدم `EMAIL_*` والكود يقرأ `SMTP_*` → ✅ تصحيح المتغيرات

---

## ✅ السبرنت 3: المتجر يبيع فعليًا (أسبوعين — **مكتمل بالكامل**)

### 3.1 إصلاحات تجربة الشراء (Critical)

| #      | الميزة                                          | الملفات                                                            | الحالة |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------ | ------ |
| **W3** | تصحيح روابط التصنيفات (Navbar/Footer/Hero)      | `Navbar.tsx:51-71`، `Footer.tsx:77-93` — توحيد مع enum المنتجات    | ✅     |
| **W4** | كوبون كـ Mutation لا useQuery (تجنب rate limit) | `hooks/coupons/couponsQuery.ts:12-22`، `checkout/page.tsx:113,574` | ✅     |
| **W5** | Guest cart + `?redirect=` بعد الدخول            | `proxy.ts:9-15,35`، `api.ts:95-97`                                 | ✅     |
| **W7** | حذف "Digital delivery" الوهمي                   | `checkout/page.tsx:44-48,165-167`                                  | ✅     |
| **W8** | إصلاح صفحة النجاح (useEffect loop + rate limit) | `checkout/success/page.tsx:43-53`                                  | ✅     |

### 3.2 تفعيل ميزات API موجودة لكن غير موصولة

| #   | الميزة                        | الحالة الحالية                    | المطلوب                                                  | الحالة                               |
| --- | ----------------------------- | --------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| 1   | **المراجعات على صفحة المنتج** | نص ثابت "No reviews yet"          | ربط `useProductReviews` + `ReviewForm` + `ReviewList`    | ✅                                   |
| 2   | **Q&A**                       | Demo ثابت                         | ربط `useProductQA` + `POST /products/:id/qa`             | ✅                                   |
| 3   | **المفضلة (Wishlist)**        | أزرار بلا handler                 | ربط `WishlistButton` في `ProductCard` وصفحة المنتج       | ✅                                   |
| 4   | **العروض (Offers)**           | مصفوفة ثابتة                      | ربط `useActiveOffers`                                    | ✅                                   |
| 5   | **تعديل الملف الشخصي**        | رابط لـ `/profile/edit` غير موجود | إنشاء الصفحة + ربط `useUpdateProfile`                    | ✅ (`user/[username]/edit/page.tsx`) |
| 6   | **التوصيات**                  | Demo دائماً (API يعطي 500)        | الانتظار لإصلاح C3 ثم ربط حقيقي                          | ✅ (بعد C3)                          |
| 7   | **Gift Finder**               | روابط من demo IDs                 | بناء الروابط من IDs الـ API الحقيقية                     | ✅                                   |
| 8   | **الفلاتر**                   | Client-side على 12 منتج (demo)    | Server-side: brand, size, color, rating, inStock, onSale | ✅ (`productQuery.ts` facets)        |
| 9   | **الشارات (Badges)**          | `getDemoBadgesForIndex`           | استخدام `badges` من API                                  | ✅ (`resolveProductBadges`)          |

---

## 🟡 السبرنت 4: SEO Foundation + محتوى (أسبوعين — **90% مكتمل**)

| #     | الميزة                                  | التفاصيل                                                                            | الحالة                                                    |
| ----- | --------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **1** | **Server Components للـ PDP/PLP/Brand** | تحويل من `'use client'` → Server Components تجلب البيانات ثم Client Islands للتفاعل | ✅                                                        |
| **2** | **generateMetadata + OG + JSON-LD**     | كل صفحة منتج/تصنيف/براند: title، description، OG tags، Product schema               | ✅                                                        |
| **3** | **sitemap.ts + robots.ts**              | توليد ديناميكي من قاعدة البيانات                                                    | ✅                                                        |
| **4** | **Text Index للبحث**                    | على `title`، `description`، `brand.name` بدل `$regex`                               | ✅ (`ProductTextIndex` على title/description/subcategory) |
| **5** | **رفع صور + CDN**                       | Multer + Cloudinary/S3 للـ dashboard، `remotePatterns` للـ `next/image`             | ⚠️ **جزئي** — Multer محلي يعمل، Cloudinary/S3 غير مضبوط   |
| **6** | **استبدال `<img>` خام**                 | 13 استخدام → `next/image` مع blur placeholder                                       | ✅ (11+ components تستخدم `next/image`)                   |
| **7** | **إصلاح الخطوط**                        | Geist يُحمّل ثم يُستبدل بـ Arial في `globals.css:40`                                | ✅ (display: 'swap' + إزالة Arial + preload)              |
| **8** | **loading.tsx / error.tsx**             | على مستوى routes مع retry صحيح لـ React Query                                       | ✅ (root `loading.tsx` مع aria-live + `error.tsx`)        |
| **9** | **وصولية (a11y)**                       | Toast `aria-live`، aria-labels للأيقونات، alt للصور                                 | ✅                                                        |

---

## 🔴 السبرنت 5: تجارة كاملة (3-4 أسابيع — **لم يبدأ**)

| #      | الميزة                            | التفاصيل                                                               | الحالة                                               |
| ------ | --------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| **6**  | **الشحن الحقيقي**                 | طرق (standard/express) + مناطق + أسعار من API — حذف "Digital delivery" | ❌                                                   |
| **7**  | **دفتر العناوين**                 | في الحساب + إعادة استخدام في checkout                                  | ✅ (API: `profile.controller.js:106-302`)            |
| **8**  | **إلغاء/إرجاع RMA**               | قبل الشحن + حالة `refunded` + ربط Stripe refunds                       | ❌                                                   |
| **9**  | **الضريبة**                       | نسبة ثابتة قابلة للضبط من الإعدادات                                    | ❌                                                   |
| **10** | **مراجعات "مشترٍ موثّق"**         | شرط: طلب مدفوع يحتوي المنتج                                            | ✅ (`hasVerifiedPurchase` في `review.controller.js`) |
| **11** | **إشعارات إيميل HTML**            | shipped/delivered/canceled/refunded + قوالب HTML                       | ❌ (نصي فقط حالياً)                                  |
| **12** | **تتبع طلب حقيقي**                | رقم شحنة + شركة + أحداث من الداشبورد                                   | ❌                                                   |
| **13** | **النشرة البريدية + تواصل حقيقي** | استبدال `href='#'` و "In a real app…"                                  | ⚠️ **جزئي** — Contact form يعمل، newsletter أساسي    |

---

## 🔴 السبرنت 6: العربية + نمو (3-4 أسابيع — **لم يبدأ**)

| #      | الميزة                                       | التفاصيل                                                                                                 | الحالة                                                                                                             |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **12** | **i18n + RTL كامل**                          | `next-intl`، `lang/dir` ديناميكي، Tailwind logical properties، عملة/لوكال قابلان للتبديل                 | ❌ (`next-intl` غير مثبت)                                                                                          |
| **13** | **تعديل الملف الشخصي + كلمة مرور**           | من داخل الحساب (الـ hook موجود)                                                                          | ⚠️ **جزئي** — تعديل الملف موجود، تغيير كلمة المرور من الحساب مفقود                                                 |
| **14** | **Recently Viewed + Recommendations حقيقية** | بعد إصلاح C3 (co-purchase أو same-category+brand)                                                        | ⚠️ **جزئي** — Recently viewed محلي فقط، Recommendations أساسي (no co-purchase)                                     |
| **15** | **Bundles/Lookbooks/Gift Finder**            | البنية موجودة؛ تحتاج seeds وربط الروابط بـ API IDs                                                       | ⚠️ **جزئي** — API موجود، storefront يحتاج ربط IDs                                                                  |
| **16** | **Dashboard كامل**                           | مخزون + تنبيهات، طلبات (شحن/تتبع/refund/فاتورة)، عملاء، تحليلات، إعدادات، إجراءات جماعية، CSV، Audit log | ⚠️ **جزئي** — أساس موجود (orders/products/content)، ينقص inventory alerts, analytics, bulk actions, CSV, audit log |

---

## 📋 خطة التنفيذ المقترحة (Sprints — **الحالة الحالية**)

| Sprint                    | المحتوى                                       | معيار النجاح (Definition of Done)                                                                                             | الحالة                        |
| ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **0 — إنقاذ (يوم–يومان)** | C1–C6                                         | `node app.js` يقلع؛ `npm run lint` + `typecheck` + `test` خضراء؛ كل شاشات الداشبورد تفتح؛ `/recommendations` و `/qa` تعيد 200 | ✅ **مكتمل**                  |
| **1 — دفع/مخزون**         | P1–P5 + W1,W2,W6                              | اختبار: عميلان يدفعان آخر قطعة → واحد يُخدم، الآخر refund/needs_attention؛ لا خصم مزدوج؛ إلغاء مدفوع = refund                 | ✅ **مكتمل**                  |
| **2 — أمان/Config**       | S1–S9 + وحدة config + error handler + indexes | لا تسريب إيميلات؛ rate limit يعمل خلف proxy؛ `NODE_ENV` مطلوب عند الإقلاع؛ اختبارات أمان تمر                                  | ✅ **90% مكتمل** (S4 جزئي)    |
| **3 — متجر يبيع**         | W3–W8 + ميزات 1,2,5                           | مسار كامل: بحث → تصنيف → منتج بـ variant → سلة ضيف → دخول (`?redirect=`) → دفع → نجاح بدون فقدان `order_id`                   | ✅ **مكتمل**                  |
| **4 — SEO/محتوى**         | ميزات 3,4,5,9                                 | Lighthouse SEO ≥ 90؛ PDP مفهرسة بـ JSON-LD؛ sitemap/robots يعملان                                                             | 🟡 **90% مكتمل** (CDN images) |
| **5 — تجارة كاملة**       | ميزات 6,7,8,10,11                             | شحن/ضريبة/عناوين/إرجاع/إشعارات تعمل end-to-end                                                                                | ❌ **لم يبدأ**                |
| **6 — عربية/نمو**         | ميزة 12 + 13–16                               | المتجر RTL بالكامل؛ تتبع/نشرة/Bundles تعمل                                                                                    | ❌ **لم يبدأ**                |

---

## 🗂️ مرجع سريع للملفات الحرجة

| الملف                                                                                                                 | السبب                                | السبرنت |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------- |
| `apps/api/middlewares/rolePermissions.js`                                                                             | إضافة `content:*`                    | 0       |
| `apps/api/routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js` | استيراد `verfiyToken`                | 0       |
| `apps/api/controllers/{productQA,recommendations}.controller.js`                                                      | استيراد `{ Product }`                | 0       |
| `apps/api/controllers/payment.controller.js:210-242, 286-310`                                                         | mark-paid ذرّي + webhook لا يفشل     | 1       |
| `apps/api/controllers/order.controller.js:233-244`                                                                    | refund عند الإلغاء                   | 1       |
| `apps/api/middlewares/rateLimit.js:6-12` + `app.js`                                                                   | trust proxy                          | 2       |
| `apps/api/controllers/password.controller.js:20-27`                                                                   | Joi + 200 دائماً                     | 2       |
| `apps/api/controllers/{review,productQA}.controller.js`                                                               | populate بدون email                  | 2       |
| `apps/api/app.js:110-128`                                                                                             | error handler آمن                    | 2       |
| `apps/website/src/app/products/[id]/page.tsx:83-91`                                                                   | تمرير variant للسلة                  | 1/3     |
| `apps/website/src/lib/cartStore.ts:142-174`                                                                           | مفتاح سطر productId+size+color       | 1/3     |
| `apps/website/src/components/navigation/Navbar.tsx:51-71`، `layout/Footer.tsx:77-93`                                  | تصنيفات حقيقية                       | 3       |
| `apps/website/src/hooks/coupons/couponsQuery.ts`                                                                      | useMutation للكوبون                  | 3       |
| `apps/website/src/proxy.ts`                                                                                           | إزالة `/cart` + `?redirect=`         | 3       |
| `apps/website/src/lib/authCookies.ts:36-42`                                                                           | secure/sameSite/httpOnly             | 2       |
| `.github/workflows/ci.yml`، `package-lock.json`                                                                       | lock واحد في الجذر                   | 0       |
| `apps/api/render.yaml`                                                                                                | healthCheckPath + SMTP\_\* + rootDir | 2       |
| `apps/api/package.json:9`                                                                                             | تشغيل كل الاختبارات                  | 0       |

---

## 🧹 تنظيف كود ميت (Tech Debt — **75% مكتمل**)

| العنصر                                    | الموقع                                                                                                                         | الإجراء                             | الحالة                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------- |
| `@trendvaulta/api-client`                 | `packages/api-client/`                                                                                                         | **حذف** — غير مستخدم من أي تطبيق    | ✅ (مازال في `package-lock.json` فقط)       |
| `craftify_cart_v1`                        | localStorage key                                                                                                               | إعادة تسمية → `trendvaulta_cart_v1` | ✅                                          |
| Components "Templates"                    | `website/src/components/profile/{Orders,Reviews,Wishlist,Followers}Content`، `AccountSidebar`، `StatsBar`، `LicenseComparison` | **حذف** — بقايا Craftify            | ✅                                          |
| Admin hooks غير مستخدمة                   | `website/src/hooks/admin/*`                                                                                                    | **حذف**                             | ✅                                          |
| `/welcome` route                          | `website/src/app/welcome/`                                                                                                     | **حذف** — غير قابل للوصول           | ✅                                          |
| `deliverRegion`                           | `website/src/lib/deliverRegion.ts` + `DeliverToControl.tsx`                                                                    | **حذف**                             | ⚠️ **مستخدم** — demo shipping cue في Navbar |
| `<title>Craftify Admin Dashboard</title>` | `dashboard/index.html`                                                                                                         | تصحيح → TrendVaulta                 | ✅                                          |
| `packages/ui`                             | مرجع في README/AGENTS                                                                                                          | **إزالة المراجع** — غير موجود       | ✅ (مازال في `.cursor/rules` + lockfile)    |

---

## 📊 مقاييس النجاح (KPIs)

| المقياس                 | الهدف                              | قياس                      |
| ----------------------- | ---------------------------------- | ------------------------- |
| **API Uptime**          | 99.9%                              | health check `/api/ready` |
| **CI Pass Rate**        | 100%                               | GitHub Actions أخضر       |
| **Lighthouse SEO**      | ≥ 90                               | PDP/PLP/Brand pages       |
| **Core Web Vitals**     | LCP < 2.5s، CLS < 0.1، INP < 200ms | Chrome UX Report          |
| **Checkout Completion** | > 70%                              | من جلسة سلة إلى نجاح      |
| **Error Rate**          | < 0.1%                             | Sentry / logs             |
| **RTL Coverage**        | 100% صفحات                         | مراجعة يدوية + اختبارات   |

---

## ⚠️ مخاطر وتحذيرات

1. **لا تبدأ ميزات قبل Sprint 0** — الأساس مكسور، أي كود جديد يتراكم عليه دين تقني
2. **Stripe Webhook Idempotency** — موجود لكن `markOrderPaidFromSession` ليس ذرّيًا بالكامل
3. **Race Conditions** — في المخزون، الكوبونات، salesCount — استخدم `$inc` و `findOneAndUpdate` بشرط
4. **NODE_ENV** — لا تفترض production؛ تحقق عند الإقلاع وافشل مبكرًا
5. **Seeds** — نسختان (`seeder.js` و `seeders/seeder.js`)؛ كلاهما `deleteMany` بلا حراسة `NODE_ENV`؛ لا ينشئان admin ولا CMS data
6. **Node Version** — Next 16 يتطلب ≥20.9؛ CI يستخدم 20؛ حدث `engines` و `.nvmrc`

---

## 📈 ملخص الإنجاز الإجمالي (2026-09-22)

| السبرنت       | العناصر المكتملة | الإجمالي | النسبة  |
| ------------- | ---------------- | -------- | ------- |
| **Sprint 0**  | 6/6              | 6        | 100% ✅ |
| **Sprint 1**  | 8/8              | 8        | 100% ✅ |
| **Sprint 2**  | 9/10             | 10       | 90% 🟡  |
| **Sprint 3**  | 14/14            | 14       | 100% ✅ |
| **Sprint 4**  | 8/9              | 9        | 89% 🟡  |
| **Sprint 5**  | 2/8              | 8        | 25% 🔴  |
| **Sprint 6**  | 0/5              | 5        | 0% 🔴   |
| **Tech Debt** | 6/8              | 8        | 75% 🟡  |
| **المجموع**   | **53/68**        | 68       | **78%** |

### ✅ مكتمل بالكامل (Sprints 0-3 + معظم 4)

- API يعمل، CI أخضر، Dashboard كامل
- دفع/مخزون: لا double-charge، لا oversell، refund يعمل
- أمان: rate limit خلف proxy، لا تسريب إيميلات، NODE_ENV محفوظ
- متجر: مسار شراء كامل مع variants، reviews، Q&A، wishlist، offers، profile edit
- SEO: Server Components، JSON-LD، sitemap/robots، text index، a11y، next/image، Geist font

### 🟡 جزئي (Sprint 4 CDN، Sprint 2 S4، Tech Debt deliverRegion)

- Cloudinary/S3 للصور غير مضبوط (Multer محلي يعمل)
- Access token + role cookie لا يزالان JS-readable (refresh في httpOnly)
- `deliverRegion` لا يزال مستخدماً في `DeliverToControl.tsx`

### ❌ لم يبدأ (Sprints 5-6)

- شحن حقيقي (methods/zones/rates)
- ضريبة، RMA/returns
- HTML email templates
- Order tracking (carrier + tracking number)
- i18n/RTL (`next-intl`)
- Full Dashboard (analytics, bulk actions, CSV, audit log)

---

## 🔗 مراجع ذات صلة

- `FULL_SYSTEM_ANALYSIS.md` — التحليل التفصيلي الكامل (مسارات ملفات، أرقام أسطر)
- `AGENTS.md` — تعليمات للـ AI agents
- `.cursor/rules/` — قواعد Cursor (session discipline، API reference، frontend engineering)
- `.github/workflows/ci.yml` — CI pipeline
- `apps/api/render.yaml` — إعدادات النشر
- `docs/REMEDIATION_BACKLOG.md` — تراكم الإصلاحات
- `docs/IMPLEMENTATION_PLAN.md` — خطة التنفيذ بالمراحل ومعايير القبول

---

> **ملاحظة**: هذا الملف وثيقة حية. حدّثه عند إكمال كل سبرنت، وأضف ملاحظات التنفيذ، وعدّل التقديرات بناءً على الواقع.
