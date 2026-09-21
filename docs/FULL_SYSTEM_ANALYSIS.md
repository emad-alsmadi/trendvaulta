# TrendVaulta — التحليل الشامل للنظام وخارطة الأولويات

> **الخطة التنفيذية:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — مراحل مرتبة بمعرّفات المهام (C1, P2, W1 …) ومعايير قبول لكل مهمة.

**التاريخ:** 2026-09-21 · **الفرع:** `main` (آخر commit: `c252857`) · **النوع:** تدقيق قراءة فقط (لم يُعدَّل أي ملف ولم تُشغَّل أوامر build/test)

> المنهجية: قراءة كاملة لـ `apps/api` (routes / controllers / models / middlewares / utils)، و`apps/website` (كل الصفحات والـ hooks والـ lib)، و`apps/dashboard` + `packages/*`، والبنية التحتية (CI، render.yaml، lockfiles، seeders، tests). كل نتيجة موثّقة بمسار الملف ورقم السطر.

---

## 0. الملخص التنفيذي

| البند | الحالة |
|---|---|
| **هل الـ API يعمل على `main`؟** | **لا.** يتعطل عند الإقلاع (`MODULE_NOT_FOUND`) — 7 ملفات routes تستورد `middlewares/auth` غير موجود |
| **هل CI يعمل؟** | **لا.** ملفات `package-lock.json` غير متزامنة → `npm ci` يفشل في الوظائف الثلاث |
| **هل شاشات CMS في الداشبورد تعمل؟** | **لا.** صلاحيات `content:*` غير معرّفة لأي دور → 403 حتى للـ admin (8 صفحات) |
| **هل يمكن إضافة منتج/براند من الداشبورد؟** | **لا.** قائمة التصنيفات لا تطابق الـ enum، وحقول فارغة يرفضها Joi |
| **هل يمكن إتمام شراء منتج بمقاسات/ألوان؟** | **لا.** المتجر لا يرسل الـ variant المختار → الـ API يرفض الطلب |
| **أمان الدفع** | Stripe موصول بشكل صحيح (signature + idempotency + أسعار من DB)، لكن: لا refund عند الإلغاء، race condition في "mark paid"، oversell ممكن |
| **SEO** | صفر. 32/32 صفحة `'use client'`، لا `generateMetadata`، لا sitemap/robots/JSON-LD |
| **العربية / RTL** | غير موجودة إطلاقًا في المتجر (`lang='en'`, لا `dir`) |
| **الاختبارات** | ~105 اختبار وحدة، لكن CI يشغّل 8 منها فقط. صفر اختبارات routes/controllers |
| **الحزم المشتركة** | `@trendvaulta/types` و`@trendvaulta/api-client` غير مستوردَين من أي تطبيق؛ الأنواع مكررة 3 مرات |

**الخلاصة:** الأساس المعماري جيد (فصل الطبقات، Joi، refresh-token rotation، webhook idempotency)، لكن الدفعة الأخيرة من الميزات (30 commit يوم 2026-09-19) شُحنت **بدون تشغيل** وكسرت الإقلاع. الأولوية المطلقة هي إعادة النظام لحالة "يعمل" ثم إغلاق ثغرات الدفع/المخزون قبل أي ميزة جديدة.

---

## 1. خريطة النظام (كما هو فعليًا)

```
trendvaulta/
├── apps/api        Express 5 + Mongoose 8 + Stripe 17   (port 3000)  — 28 routers، 27 controllers، 19 models
├── apps/website    Next.js 16 App Router + React Query   (port 3001)  — 32 صفحة، كلها Client Components
├── apps/dashboard  Vite 5 + React 19 + react-router 6    (port 3002)  — 18 صفحة، 16 hooks
└── packages/
    ├── types       أنواع مشتركة (فيها alias قديم `Template`)
    └── api-client  غير مستخدم من أي تطبيق (dead package)
```

**نموذج الصلاحيات** (`apps/api/middlewares/rolePermissions.js`): `user` / `moderator` / `admin` مع صلاحيات `resource:action` على products, brands, coupons, offers, orders, reviews, users. **لا يوجد `content:*`** رغم أن 40 route إداري يحرسه.

**تدفق الدفع:** `POST /payments/checkout-session` → ينشئ Order بحالة `pending` + Stripe Session → `success_url=/checkout/success?order_id&session_id` → الصفحة تستدعي `verify-payment` كل 3 ثوانٍ + الـ webhook `checkout.session.completed` يستدعي `markOrderPaidFromSession` (خصم مخزون + عدّاد كوبون + salesCount + إيميل).

---

## 2. إصلاحات حرجة (Blockers) — يجب قبل أي شيء آخر

| # | المشكلة | الدليل | الإصلاح | الجهد |
|---|---|---|---|---|
| C1 | **الـ API لا يُقلع** | `routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js` تستورد `../middlewares/auth` والملف غير موجود (`ls middlewares` مؤكَّد). commit `5677156` ادّعى الإصلاح لكنه لم يلمس هذه الملفات | تغيير الاستيراد إلى `require('../middlewares/verfiyToken')` أو إنشاء `middlewares/auth.js` يعيد التصدير | S |
| C2 | **كل شاشات CMS/Q&A/Bundles/Lookbooks/Help/GiftFinder في الداشبورد تعطي 403** | `rolePermissions.js` لا يعرّف `content:read/write/delete`؛ `checkRolePermission.js:12-15` يرفض حتى الـ admin | إضافة `content:*` لـ admin و`content:read/write` لـ moderator | S |
| C3 | **`GET /recommendations` و`/products/:id/qa` تعطي 500** | `recommendations.controller.js:2` و`productQA.controller.js:3` تستخدم `const Product = require(...)` بينما الموديل يصدّر `{ Product }`. الأول أيضًا يفلتر على `active` (الحقل `isActive`) ويختار `imageUrl` (الحقل `cover`) | تصحيح الاستيراد؛ حذف `recommendations.controller.js` وربط الـ route بـ `recommendation.controller.js` الصحيح واليتيم | S |
| C4 | **CI معطّل كليًا** | 3 ملفات lock متتبعة؛ `apps/api/package-lock.json` لا يحتوي `helmet`، `apps/website/package-lock.json` لا يحتوي `vitest/jsdom`؛ root lock المحدَّث غير مُلتزَم (`M package-lock.json`) | حذف الـ locks المتداخلة، commit الـ root lock، تحويل `ci.yml` لـ `npm ci` من الجذر | S |
| C5 | **Lint الداشبورد ميت** | لا يوجد أي `eslint.config`/`.eslintrc` في `apps/dashboard` (الـ `.gitignore` يتجاهل `.eslintrc*`!) بينما CI يشغّل `eslint .` | إضافة config وإزالة أنماط tooling من `.gitignore` | S |
| C6 | **CI يشغّل 8 اختبارات من ~105** | `apps/api/package.json:9` → `node --test utils/pagination.test.js` فقط | `test = node --test utils middlewares` وإضافة اختبار دخان `require('./app')` | S |

---

## 3. إصلاحات عالية الأولوية — الدفع والمخزون والأمان

### 3.1 الدفع والطلبات (خسارة مالية محتملة)

| # | المشكلة | الدليل | الإصلاح |
|---|---|---|---|
| P1 | **إلغاء طلب مدفوع لا يعيد المال** | `order.controller.js:233-244` يعيد المخزون ويضع `status='canceled'` لكن `paymentStatus` يبقى `paid`. لا يوجد `stripe.refunds.create` في المشروع | استدعاء refund عند إلغاء طلب مدفوع + معالجة `charge.refunded` + حالة `refunded` في `orderTransitions.js` |
| P2 | **Race condition في mark-paid → خصم مخزون/كوبون مرتين** | `payment.controller.js:210-242` يقرأ الـ flags في الذاكرة ثم يكتب؛ `verify-payment` من المتصفح والـ webhook يتسابقان | claim ذرّي: `findOneAndUpdate({_id, paymentStatus:{$ne:'paid'}}, …)` + `$inc` شرطي للـ variants |
| P3 | **Oversell + طلب مدفوع عالق** | المخزون يُفحص فقط عند إنشاء الجلسة (`commerce.js:143-148`)؛ عميلان يدفعان آخر قطعة → الثاني يرمي 409 والـ webhook يعيد 500 والطلب يبقى `pending` رغم الخصم | عند نقص المخزون بعد الدفع: وسم الطلب `needs_attention` أو refund تلقائي — لا تُفشل الـ webhook أبدًا |
| P4 | **تجاوز آلة الحالات** | `payment.controller.js:238` يضع `status='paid'` بلا شرط → webhook متأخر يحوّل طلبًا ملغيًا إلى مدفوع | فحص الانتقال عبر `orderTransitions` قبل الكتابة |
| P5 | **أحداث Stripe غير معالجة** | فقط `checkout.session.completed`؛ لا `session.expired`، `payment_failed`، `charge.refunded`؛ لا `expires_at` للجلسة؛ كوبون Stripe جديد لكل checkout بلا حذف | إضافة الأحداث + `expires_at: 30min` + تنظيف الكوبونات |

### 3.2 الأمان

| # | المشكلة | الدليل | الإصلاح |
|---|---|---|---|
| S1 | **Rate limiter قابل للتجاوز** | `rateLimit.js:6-12` يعتمد على أول قيمة في `X-Forwarded-For` بدون `trust proxy` → المهاجم يضع أي IP ويحصل على bucket جديد لكل طلب (brute-force على `/auth/login`) | `app.set('trust proxy', 1)` + استخدام `req.ip`؛ لاحقًا مخزن مشترك (Redis/Mongo) |
| S2 | **NoSQL injection + تعداد الإيميلات في forgot-password** | `password.controller.js:20-27`: `User.findOne({ email })` بلا Joi + رد 404 صريح | Joi `string().email()` + رد 200 دائمًا |
| S3 | **تسريب إيميلات المستخدمين علنًا** | `review.controller.js:184` و`productQA.controller.js:24-25` تعمل `populate('user','username email')` على endpoints عامة | اختيار `username` فقط |
| S4 | **Tokens في cookies قابلة للقراءة من JS** | `authCookies.ts:36-42`: access + refresh (30 يوم) بلا `secure`/`sameSite`/`httpOnly`؛ والـ token يُخزَّن أيضًا في React Query cache (`authQuery.ts:72-75`) | `secure`+`sameSite`؛ نقل refresh إلى httpOnly cookie عبر route handler؛ عدم تخزين tokens في الـ cache |
| S5 | **XSS محتمل من محتوى CMS** | `shipping/page.tsx:49`, `returns/page.tsx:49` تستخدم `dangerouslySetInnerHTML` بلا تنظيف | DOMPurify أو markdown |
| S6 | **تسريب تفاصيل داخلية في الأخطاء** | `app.js:126-127` يعيد `err.message` الخام (CastError، E11000 مع اسم الـ index)؛ `checkRolePermission.js:15-20` يعيد الصلاحيات في 403 | mapping: CastError→400، 11000→409، رسالة عامة في production |
| S7 | **Regex injection / ReDoS في البحث** | `product.controller.js:87-91`, `brand.controller.js:44-49` تمرر `q` مباشرة إلى `$regex` | escape + حد طول؛ الأفضل text index |
| S8 | **جلسات لا تُبطَل بعد تغيير كلمة المرور** | `password.controller.js:130-131` و`user.controller.js:57-66` لا تستدعي `revokeAllForUser` | استدعاؤها بعد كل reset/تغيير |
| S9 | **NODE_ENV غير مضبوط = وضع تطوير في الإنتاج** | CORS مفتوح، `tls.rejectUnauthorized:false`، رابط reset يُعاد في الـ response body — كلها مشروطة بـ `NODE_ENV !== 'production'`؛ لا تحقق من env عند الإقلاع | وحدة config مركزية تتحقق من المتغيرات المطلوبة وتفشل مبكرًا |

### 3.3 أخطاء صحة منطقية في الـ API

- `GET /brands/:slug` يعطي 500 لأي slug ليس ObjectId (`brand.controller.js:99-104` يستخدم `$or` مع `_id`).
- `getProfile` يعيد `permissions: []` دائمًا (`profile.controller.js:25` يقرأ `req.userPermissions` الذي لا يضبطه إلا `checkRolePermission`) — الداشبورد `Settings.tsx` يعتمد عليه.
- `?limit=abc` → `NaN` → 500 في 8 controllers؛ `utils/pagination.js` موجود ولا يستخدمه إلا products. `getMyOrders/getMyWishlist/getMyReviews/getAllUsers` بلا pagination.
- `User.email` بدون `lowercase` في الـ schema؛ التسجيل يخزّن كما كُتب، وتحديث الملف يصغّر → تكرار حسابات.
- عقود الردود متضاربة: `{data,meta}` / `{message,results}` / `{message,data}` / مصفوفة خام / `{...userDoc, token}` (يسرّب `roles`, `stripeCustomerId`, `__v`).
- لا indexes على `Order(user, createdAt, stripeSessionId, status)`، `Product(category, brand, price, isActive)`؛ لا TTL على `StripeWebhookEvent`.
- `render.yaml` يعرّف `EMAIL_HOST/PORT/FROM_NAME` التي لا يقرأها الكود؛ الكود يقرأ `SMTP_*` → **إيميل استعادة كلمة المرور لا يعمل على Render كما هو مضبوط**.

---

## 4. المتجر (apps/website) — إصلاحات

### 4.1 تجربة الشراء (Critical/High)

| # | المشكلة | الدليل |
|---|---|---|
| W1 | **الـ variant المختار لا يُرسل للسلة** → الـ API يرفض الطلب لأي منتج له مقاسات/ألوان | `products/[id]/page.tsx:83-91` (`addToCart` بدون size/color)؛ `commerce.js:126-132` يشترط variant |
| W2 | **السلة لا تميّز الـ variants** | `cartStore.ts:142-159` remove/setQty بالـ productId فقط؛ `cart/page.tsx:148` key مكرر |
| W3 | **روابط التصنيفات في Navbar/Footer/Hero ميتة** | enum المنتجات: `makeup, perfumes, clothing, skincare, accessories, home`؛ الروابط: `beauty, fashion, wellness, lifestyle` (`Navbar.tsx:51-71`, `Footer.tsx:77-93`) → "No products" |
| W4 | **الكوبون يُتحقق منه عند كل ضغطة مفتاح** عبر `useQuery` على POST | `couponsQuery.ts:12-22` + `checkout/page.tsx:113,574`؛ الحد 60/15 دقيقة → قفل العميل |
| W5 | **السلة تتطلب تسجيل دخول** + لا `?redirect=` بعد الدخول → فقدان `order_id` عند العودة من Stripe | `proxy.ts:9-15,35`, `api.ts:95-97` |
| W6 | **لا حد أقصى للكمية** حسب المخزون؛ الأسعار في السلة لا تُحدَّث؛ الشحن/الضريبة مكتوبة يدويًا (5 / 0) | `[id]/page.tsx:313-318`, `checkout/page.tsx:110,606` |
| W7 | **عنوان شحن وهمي "Digital delivery"** من عصر القوالب يُرسل عند عدم اختيار التوصيل | `checkout/page.tsx:44-48,165-167` |
| W8 | صفحة النجاح: `useEffect` يعتمد على كائن `q` كاملًا → إعادة إنشاء الـ interval كل render؛ `verify-payment` يستهلك حصة checkout rate limit | `checkout/success/page.tsx:43-53` |

### 4.2 ميزات موجودة في الـ API لكن غير موصولة في الواجهة

- **المراجعات على صفحة المنتج:** نص ثابت "No reviews yet" (`[id]/page.tsx:478-480`) رغم وجود `useProductReviews`, `ReviewForm`, `ReviewList` جاهزة وغير مستوردة.
- **Q&A:** demo ثابت (`ProductQaSection.tsx:27-28`) رغم وجود `useProductQA` + `POST /products/:id/qa`.
- **المفضلة:** أزرار القلب في `ProductCard` وصفحة المنتج بلا handler (`ProductCard.tsx:189-195`)؛ `WishlistButton` موجود.
- **العروض:** `/offers` يعرض مصفوفة ثابتة ويتجاهل `useActiveOffers`.
- **تعديل الملف الشخصي:** الرابط يذهب إلى `/profile/edit` غير موجود؛ `useUpdateProfile` ميت.
- **التوصيات:** دائمًا demo لأن الـ API يعطي 500 (C3).
- **Gift finder:** الروابط تُبنى من ids الـ demo فقط → خيارات الـ API تذهب لـ `/products?q=gift` (`demoStorefront.ts:548-556`).
- **الفلاتر:** rating/size/color/brand/inStock تعمل client-side على 12 منتج فقط ومعلّمة "(demo)"؛ الـ API يدعم `brand=<id>`.
- **الشارات:** `getDemoBadgesForIndex` رغم أن الـ API يعيد `badges`.

### 4.3 SEO / الأداء / الوصولية

- **صفر SEO:** كل الصفحات `'use client'`؛ `metadata` واحد في `layout.tsx` فقط؛ لا `generateMetadata`, `metadataBase`, OG, canonical, `sitemap.ts`, `robots.ts`, Product JSON-LD. الزاحف يرى صفحات فارغة.
- **الصور:** 13 استخدام `<img>` خام؛ `remotePatterns` يحوي Goodreads/OpenLibrary/`images.example.com` (بقايا) ولا CDN للمنتجات.
- **الخطوط:** Geist يُحمَّل ثم `globals.css:40` يستبدله بـ Arial.
- **التنقل:** `AppShell` يلف كل route بـ `AnimatePresence` مفتاحه pathname → إعادة mount كاملة لكل صفحة.
- **لا `loading.tsx`/`error.tsx`** على مستوى الـ routes؛ زر Retry يستدعي `router.refresh()` الذي لا يعيد جلب React Query.
- **الوصولية:** Toast بلا `aria-live`؛ أزرار الأيقونات بلا label؛ صور تفاصيل الطلب `alt=''`.
- **العربية/RTL:** غير موجودة إطلاقًا (`<html lang='en'>`، صفر نصوص عربية، لا `dir`).

### 4.4 كود ميت / بقايا "Craftify Templates"

`components/profile/{Orders,Reviews,Wishlist,Followers}Content`, `AccountSidebar`, `StatsBar` (يعرض "10K+ Templates / 500+ Creators"), `LicenseComparison`, `hooks/admin/*` (adminApi كامل غير مستخدم), `deliverRegion`, `/welcome` (غير قابل للوصول), مفتاح التخزين `craftify_cart_v1`, `<title>Craftify Admin Dashboard</title>` في الداشبورد.

---

## 5. لوحة التحكم (apps/dashboard) + الحزم المشتركة

### 5.1 الخريطة الحالية

18 صفحة: Dashboard (إحصائيات + آخر 8 طلبات)، Users، Products، Brands، Orders (تغيير حالة فقط)، Coupons، Offers، Reviews (حذف فقط)، HelpTopics، Content، StorefrontModules، Lookbooks، Testimonials، Bundles، GiftFinderConfig، ProductQA، Settings، Login. الحماية: `DashboardLayout.tsx:61-69` تتحقق من **وجود** token فقط.

### 5.2 إصلاحات (مرتبة)

| # | المشكلة | الدليل | الإصلاح | الجهد |
|---|---|---|---|---|
| D1 | **8 صفحات تعطي 403 لكل الأدوار** (HelpTopics, Content, StorefrontModules, Lookbooks, Testimonials, Bundles, GiftFinder, ProductQA) | = C2؛ `rolePermissions.test.js:28-32` لا يفحص `content` فيبقى أخضر | إضافة `content:*` + توسيع الاختبار | S |
| D2 | **إنشاء/تعديل منتج يفشل دائمًا** | `Products.tsx:29-39` يعرض `beauty/fashion/wellness` والافتراضي `beauty`؛ Joi يقبل `makeup/perfumes/clothing/skincare/accessories/home` فقط، ويشترط `subcategory` و`description` ويرفض `sku:''` | مواءمة القائمة مع الـ enum، حقول مطلوبة، حذف الحقول الفارغة قبل الإرسال | M |
| D3 | **إنشاء/تعديل براند يفشل مع أي حقل اختياري فارغ** | `Brands.tsx:16-23,70-77` ترسل `''`؛ `Brand.js:62-65` `Joi.string()` يرفض الفارغ و`website` يشترط uri. كما أن `GET /brands` يفلتر `isActive:true` ويقصّ على 50 → البراندات غير النشطة مخفية | strip للفارغ أو `.allow('')`؛ `includeInactive` للإدارة + pagination | S |
| D4 | **تعديل Bundle يرمي TypeError** | `bundle.controller.js:96-99` يعيد `items.product` ككائن مُعبَّأ؛ `Bundles.tsx:98,107` تستدعي `item.product.trim()` | mapping إلى `_id` عند فتح التعديل + product picker بدل إدخال ID خام | S |
| D5 | **لا حراسة أدوار في الواجهة** | أي `user` مسجّل يدخل ويرى كل الشريط الجانبي؛ الـ moderator يرى أزرار Add/Edit/Delete ويحصل على 403 خام يتضمن `userPermissions` | redirect لغير الموظفين في `DashboardLayout`، إخفاء أزرار الكتابة حسب الصلاحية، cookies `secure`+`sameSite` | M |
| D6 | **الوضع الداكن لا يعمل** | `tailwind.config.js` بدون `darkMode:'class'`؛ `useTheme.tsx:20` يبدّل `.dark` فيتغير الرمز فقط | إضافة `darkMode: 'class'` | S |
| D7 | **سؤال Q&A يظهر "Anonymous" دائمًا** + اعتماد الموافقة قد يُلغى | `productQA.controller.js:53-54` تعبّئ `name` والحقل `username`؛ `ProductQA.tsx:266-277` تُرسل `approved` قديم من `editing` | populate `username`؛ تحديث حالة `editing` بعد الـ mutation | S |
| D8 | **`window.alert/confirm` في 15 صفحة** + أخطاء Joi/403 خام + أزرار الحذف لا تُعطَّل أثناء التنفيذ + modals بلا `role=dialog`/focus trap | `api.ts:146-152`، `Products.tsx:245-252` وغيرها؛ `@radix-ui/react-dialog` و`react-hook-form` و`zod` مثبتة وغير مستخدمة | Toast + Radix Dialog + zod schemas + تعطيل أثناء pending | M |
| D9 | **غير قابلة للاستخدام على الهاتف** | `DashboardLayout.tsx:74-78,132-136`: sidebar ثابت 256px و`ml-64` بلا breakpoints | drawer على الشاشات الصغيرة | M |
| D10 | `Settings.tsx:111` يقرأ `import.meta.env` مباشرة متجاوزًا `viteEnv` (يكسر Jest)؛ `AdminUser.isAccountVerified` حقل غير موجود في الموديل؛ `Login.tsx:31` يتجاهل `state.from`؛ favicon `/vite.svg` بلا مجلد `public` → 404؛ `<title>Craftify Admin Dashboard</title>` | — | تنظيف | S |

### 5.3 قدرات إدارية ناقصة (الـ API يقبلها لكن لا واجهة لها)

- **المنتجات:** `isActive`, `featured`, `images[]`, `variants[{size,color,stock,price,sku}]`, `material/weight/dimensions/shippingInfo` — كلها في `validateUpdateProduct` ولا حقل لها في `ProductFormPayload` (`api.ts:284-294`).
- **الطلبات:** `GET /orders/:id` بلا صفحة تفاصيل (items, shippingAddress, notes)؛ فلتر `paymentStatus` مدعوم server-side بلا UI؛ البحث يقبل ObjectId فقط.
- **البراندات:** `isActive/featured`؛ الحذف hard-delete يترك منتجات يتيمة بلا تحقق.
- **Q&A:** فلاتر `productId/approved` server-side موجودة في `api.ts:1075-1080` لكن الصفحة تفلتر client-side.
- **CMS:** محتوى الـ modules (`slides`, `trustItems`, `items`, `config`) يُمرَّر كما هو بلا محرر (`StorefrontModules.tsx:81-85`).

### 5.4 قدرات غير موجودة في الـ API ولا الواجهة

إدارة التصنيفات، رفع الصور، عرض المخزون المنخفض (الـ API يحسب `lowStock` والواجهة تتجاهله)، رقم تتبع الشحنة، refund/ملاحظات/فاتورة للطلب، سجل طلبات العميل وحظره، الرد على المراجعات، تحليلات زمنية (`recharts` مثبت وغير مستخدم)، إعدادات المتجر (شحن/ضريبة)، إجراءات جماعية، CSV، سجل تدقيق، **فرز وترقيم في أي جدول** (كل الصفحات تجلب 50–100 مرة واحدة).

### 5.5 الحزم المشتركة

- **`@trendvaulta/types` و`@trendvaulta/api-client` غير مستوردَين من أي تطبيق** (`grep -rn "@trendvaulta/"` في src للتطبيقين = صفر). الأنواع مكررة 3 مرات: `packages/types` (269 سطر)، `website/src/types`، و`dashboard/src/lib/api.ts` (1108 سطر) مقابل `website/src/lib/api.ts` (1299 سطر).
- `packages/types`: `Order` ينقصه `stockDecremented/stripeSessionId/allowedNextStatuses/notes`؛ `AuthResponse` بلا `refreshToken`؛ لا أنواع لـ HelpTopic/Content/StorefrontModule/Lookbook/Testimonial/Bundle/GiftFinder/ProductQA/AdminStats؛ ما زال يصدّر `Template`/`Creator`.
- `packages/api-client/src/api.ts:5-8`: يقرأ `process.env` على مستوى الوحدة → `ReferenceError` في Vite لو استُخدم؛ `localhost:3000` ثابت؛ معالج 401 بلا refresh.
- **القرار المقترح:** إما توحيد الأنواع في `@trendvaulta/types` واستيرادها من التطبيقين وحذف `api-client`، أو حذف الحزمتين والـ aliases الميتة. الإبقاء على الوضع الحالي هو الأسوأ.

## 6. البنية التحتية / DevOps / الاختبارات

| البند | الوضع | المطلوب |
|---|---|---|
| **Lockfiles** | 3 ملفات غير متزامنة (C4) | lock واحد في الجذر |
| **CI** | workflow واحد، 3 jobs، كلها تفشل عند التثبيت؛ لا deploy، لا Dependabot، لا audit، لا e2e | إصلاح التثبيت + تشغيل كل الاختبارات + Dependabot |
| **render.yaml** | free plan (cold starts تُصفّر rate limiter)، لا `healthCheckPath` (أُزيل في `21fd8f8`)، `rootDir` معلّق، متغيرات env خاطئة (EMAIL_* بدل SMTP_*)، ناقصة `RATE_LIMIT_*`, `SHIPPING_FLAT_USD`, `PUBLIC_FRONTEND_URL` | تصحيح كامل |
| **الداشبورد** | لا يوجد أي deploy config | vercel.json أو Dockerfile |
| **Seeders** | نسختان (`seeder.js` و`seeders/seeder.js`)؛ كلاهما `deleteMany` بلا حراسة `NODE_ENV`؛ لا ينشئان admin؛ لا يزرعان CMS/bundles/lookbooks/QA → كل ميزات 2026-09-19 تُقلع فارغة | seeder واحد آمن وكامل + إنشاء admin |
| **المراقبة** | logger يطبع method+URL فقط؛ لا request-id، لا Sentry، لا `unhandledRejection`، لا `SIGTERM` graceful shutdown، `console.log(err)` | pino/structured logs + Sentry + shutdown |
| **`engines.node >=18`** | يتعارض مع Next 16 (≥20.9) و CI (Node 20) | `>=20.9` + `.nvmrc` متتبع |
| **الوثائق** | `apps/api/README.md` يوثّق "Craftify API" و`/api/templates`؛ `apps/website/README.md` قالب CNA؛ مراجع لـ `packages/ui` غير موجود في README/AGENTS/MONOREPO_SETUP/.cursorrules؛ `docs/*` من 2026-08-07 وتصف مشاكل حُلّت | إعادة كتابة |
| **Express 5 + express-async-handler** | 115 wrap زائدة لكن غير ضارة | اختياري |
| **Root scripts** | `build/lint/clean --workspaces` بدون `--if-present` → تفشل | إضافة `--if-present` |

---

## 7. الميزات ذات الأولوية العالية (Roadmap)

مرتبة حسب الأثر التجاري ÷ الجهد. **لا تُبدأ قبل إغلاق القسمين 2 و3.**

### المستوى 1 — يفتح الإيراد مباشرة (أسابيع 1–2)

1. **تفعيل المراجعات + Q&A + المفضلة على صفحة المنتج** — الـ API والـ hooks والمكونات جاهزة؛ عمل ربط فقط. (M)
2. **فلاتر وفرز server-side** (brand, size, color, rating, inStock, onSale) + **text index** على `title/description/brand` بدل regex. (M)
3. **صفحات تصنيفات حقيقية** `/c/[category]` مع breadcrumbs + توحيد التصنيفات بين Navbar/Footer/Hero والـ enum (أو إضافة موديل Category بهرمية). (M)
4. **SEO foundation:** تحويل PDP/PLP/Brand إلى Server Components تجلب البيانات ثم client islands؛ `generateMetadata` + OG + Product JSON-LD + `sitemap.ts` + `robots.ts`. (L)
5. **Guest cart + إعادة توجيه بعد الدخول** (`?redirect=`). (S)

### المستوى 2 — اكتمال التجارة الفعلية (أسابيع 3–5)

6. **الشحن الحقيقي:** طرق (standard/express) + مناطق + أسعار من الـ API تُعرض في السلة/الـ checkout بدل 5$ الثابتة؛ حذف "Digital delivery". (M)
7. **دفتر العناوين** في الحساب + إعادة استخدام العنوان في الـ checkout. (M)
8. **إلغاء الطلب من العميل** (قبل الشحن) + **طلب إرجاع/RMA** مع حالة `refunded` وربط Stripe refunds. (L)
9. **رفع الصور** (Multer + Cloudinary/S3) للمنتجات والبراندات من الداشبورد + `remotePatterns` للـ CDN + `next/image` في كل مكان. (M)
10. **الضريبة** (نسبة ثابتة قابلة للضبط من الإعدادات كبداية). (S)
11. **مراجعات "مشترٍ موثّق"** (شرط وجود طلب مدفوع يحتوي المنتج). (S)

### المستوى 3 — العربية والنمو (أسابيع 6–8)

12. **i18n + RTL** (`next-intl` أو ما يعادله، `lang/dir` ديناميكي، Tailwind logical properties، عملة/لوكال قابلان للتبديل). (L)
13. **تعديل الملف الشخصي + تغيير كلمة المرور** من داخل الحساب (الـ hook موجود). (S)
14. **تتبع الطلب الحقيقي:** رقم شحنة + شركة + أحداث تُدخل من الداشبورد بدل الـ timeline المشتق من الحالة. (M)
15. **إشعارات إيميل مكتملة:** shipped/delivered/canceled/refunded + قالب HTML بدل النص العادي. (M)
16. **النشرة البريدية + نموذج تواصل حقيقي** (حاليًا `href='#'` و"In a real app…"). (S)
17. **Recently viewed + Recommendations** حقيقية بعد إصلاح C3 (co-purchase أو same-category+brand). (S)
18. **Bundles/Lookbooks/Gift finder** — البنية موجودة؛ تحتاج seeds وربط الروابط بـ ids الـ API. (S)

### الداشبورد (بعد D1–D10)

19. **نموذج منتج كامل:** variants (مقاس/لون/مخزون/سعر/SKU) + صور متعددة + `isActive/featured` + رفع صور. (M)
20. **صفحة تفاصيل الطلب** (items, عنوان, ملاحظات, payment ids) + رقم تتبع + refund + فلتر `paymentStatus` + بحث بالإيميل. (M)
21. **المخزون:** عرض low-stock + فرز + تعديل سريع للكمية. (S)
22. **فرز + ترقيم server-side** في كل الجداول + `placeholderData` لمنع وميض "Loading". (M)
23. **تحليلات:** إيراد/طلبات عبر الزمن، أعلى المنتجات والبراندات (`recharts` مثبت). (M)
24. **إدارة التصنيفات** (موديل Category) + محرر محتوى الـ home modules + رد على المراجعات + إعدادات المتجر (شحن/ضريبة). (L)
25. **العملاء:** سجل الطلبات لكل مستخدم + تعطيل الحساب بدل الحذف النهائي. (S)

---

## 8. خطة تنفيذ مقترحة

| Sprint | المحتوى | معيار النجاح |
|---|---|---|
| **0 — إنقاذ (يوم–يومان)** | C1–C6 + D2, D3, D4 | `node app.js` يقلع؛ CI أخضر؛ كل شاشات الداشبورد تفتح؛ `/recommendations` و`/qa` تعيد 200 |
| **1 — الدفع والمخزون** | P1–P5 + W1, W2, W6 | اختبار: عميلان يدفعان آخر قطعة → واحد يُخدم والآخر refund/needs_attention؛ لا خصم مزدوج؛ إلغاء مدفوع = refund |
| **2 — الأمان** | S1–S9 + وحدة config + error handler + indexes | لا تسريب إيميلات؛ rate limit يعمل خلف proxy؛ `NODE_ENV` مطلوب |
| **3 — المتجر يبيع** | W3, W4, W5, W7, W8 + D5–D8 + ميزات 1, 2, 5 | مسار كامل: بحث → تصنيف → منتج بـ variant → سلة ضيف → دخول → دفع → نجاح بدون فقدان order_id |
| **4 — SEO + محتوى** | ميزات 3, 4, 9 | Lighthouse SEO ≥ 90؛ PDP مفهرسة بـ JSON-LD |
| **5 — التجارة الكاملة** | ميزات 6, 7, 8, 10, 11 | شحن/ضريبة/عناوين/إرجاع تعمل end-to-end |
| **6 — العربية** | ميزة 12 + 13–16 | المتجر يعمل RTL بالكامل |

---

## 9. ملحق — مرجع سريع للملفات الحرجة

| الملف | لماذا |
|---|---|
| `apps/api/middlewares/rolePermissions.js` | إضافة `content:*` |
| `apps/api/routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js` | استيراد `verfiyToken` |
| `apps/api/controllers/{productQA,recommendations}.controller.js` | `{ Product }` |
| `apps/api/controllers/payment.controller.js:210-242, 286-310` | mark-paid ذرّي + عدم إفشال webhook |
| `apps/api/controllers/order.controller.js:233-244` | refund عند الإلغاء |
| `apps/api/middlewares/rateLimit.js:6-12` + `app.js` | trust proxy |
| `apps/api/controllers/password.controller.js:20-27` | Joi + 200 دائمًا |
| `apps/api/controllers/{review,productQA}.controller.js` | populate بدون email |
| `apps/api/app.js:110-128` | error handler آمن |
| `apps/website/src/app/products/[id]/page.tsx:83-91` | تمرير variant |
| `apps/website/src/lib/cartStore.ts:142-174` | مفتاح السطر productId+size+color |
| `apps/website/src/components/navigation/Navbar.tsx:51-71`, `layout/Footer.tsx:77-93` | تصنيفات حقيقية |
| `apps/website/src/hooks/coupons/couponsQuery.ts` | useMutation بدل useQuery |
| `apps/website/src/proxy.ts` | إزالة `/cart` + `?redirect=` |
| `apps/website/src/lib/authCookies.ts:36-42` | secure/sameSite/httpOnly |
| `.github/workflows/ci.yml`, `package-lock.json` | lock واحد |
| `apps/api/render.yaml` | healthCheckPath + SMTP_* + rootDir |
| `apps/api/package.json:9` | تشغيل كل الاختبارات |
| `apps/dashboard/src/pages/Products.tsx:29-39`, `Brands.tsx:16-23` | مواءمة Joi |
| `apps/dashboard/src/pages/Bundles.tsx:57,98,107` | product._id |
| `apps/dashboard/tailwind.config.js` | `darkMode: 'class'` |
| `apps/dashboard/src/layouts/DashboardLayout.tsx:61-69` | حراسة الأدوار |
