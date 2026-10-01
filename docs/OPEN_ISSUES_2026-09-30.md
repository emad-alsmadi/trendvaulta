# TrendVaulta — المشاكل المفتوحة بعد التحقق من الكود

| | |
|---|---|
| **التاريخ** | 2026-09-30 |
| **المصدر** | التدقيق التقني بتاريخ 2026-09-27 (`docs/audit/*`، محذوف الآن من الـ repo ومحفوظ في git history) |
| **الطريقة** | قراءة الكود مباشرة لكل بند (static). لم أعتمد على علامات ✅ في التدقيق. لم يُشغَّل أي lint أو typecheck أو test أو build |
| **خارج النطاق** | بنود `docs/QA_REMEDIATION_PLAN_2026-09-30.md` (رموز P0-xxx/P1-xxx): مسار منفصل مبني على QA للموقع المنشور، ولم تُفحص هنا |

**الرموز:** ⬜ مفتوح بالكامل · 🟡 مُصلح جزئياً · 🔄 قيد التنفيذ

أرقام الأسطر صحيحة وقت التحقق، وقد تتغير مع التعديلات اللاحقة.

---

## 1. ما أُغلق في جلسة 2026-09-30

| الرمز | المشكلة | الإصلاح |
|---|---|---|
| SEC-105 | `PUT /users/:id` يغيّر كلمة سر الحساب نفسه بلا كلمة السر الحالية | يرفض الـ API ذلك، ويبقى المسار الوحيد `/password/change` |
| SEC-114 | الـ moderator يرى العناوين والهواتف و`stripeCustomerId` و`adminNotes` | projection محدود لمن لا يملك `users:write` |
| API-214 | فاتورة بلا HTML escaping وبلا رابط في المتجر | escaping + CSP على الـ response + زر "تنزيل الفاتورة" في `/user/orders/[id]` |
| PAY-205 | `/profile` في الإيميلات القديمة يعطي 404، وحماية ميتة في `proxy.ts` | redirect دائم إلى `/user/orders`، والمطابقة في الـ proxy صارت على الـ segment كاملاً |
| OPS-706 | الـ sitemap والـ rewrite قد يطلبان `/api/api` | توحيد عنوان الـ API مع `/api` وبدونها |
| WEB-528 | React Query يعيد المحاولة على 4xx، ولا يوجد `global-error.tsx` | default للـ retry (لا إعادة على 4xx) + `app/global-error.tsx` بالعربي والإنجليزي |

## 🔄 قيد التنفيذ (جلسة أخرى)

| الرمز | المشكلة | الحالة |
|---|---|---|
| API-309 | لا توجد شاشة في الـ Dashboard لرسائل التواصل ولا للمشتركين في النشرة | الـ API (`PATCH /contact/admin/:id`) والـ client والصفحات قيد الكتابة. لم تُربط بعد بـ `App.tsx` ولا بالـ sidebar |

---

## 2. 🔴 وظائف ونواقص في النظام

| الرمز | الحالة | المشكلة | الدليل |
|---|---|---|---|
| API-315 | ⬜ | `/c/*` والـ navigation تستخدم قائمة ثابتة ولا تقرأ الـ Category CMS. الـ mapper يُسقط `imageUrl` و`description` و`subcategories` | [categoryPage.ts](../apps/website/src/lib/categoryPage.ts)، [categoriesQuery.ts](../apps/website/src/hooks/storefront/categoriesQuery.ts) |
| WEB-418 | ✅ | الـ sitemap محدود بـ 100 منتج و50 brand، بلا subcategories وبلا sharding — انتقل التوليد إلى الـ API (sitemap index + shards + cache) | [sitemap.service.js](../apps/api/services/sitemap.service.js) |
| DASH-609 | 🟡 | Shipping Zones: الـ handle يُتحقق منه في الواجهة فقط. الـ Joi بلا uniqueness ولا pattern ولا منع لـ `none`، والحذف hard delete | [ShippingZone.js:102](../apps/api/models/ShippingZone.js#L102) |
| API-203 | 🟡 | handle غير موجود في الـ zone يُحفظ كما هو ويُحتسب بالسعر الـ standard | [commerce.js](../apps/api/utils/commerce.js) |
| API-202 | 🟡 | الإصلاح في الواجهة فقط. الـ Joi ما زال يرفض `shippingMethod: ''` | [Order.js:422](../apps/api/models/Order.js#L422) |
| API-201 | 🟡 | المخزون يُفحص لكل سطر، فسطران لنفس الـ variant لا يُجمعان قبل الفحص (يُلتقط لاحقاً كـ `needs_attention`) | [commerce.js](../apps/api/utils/commerce.js) |
| API-214 | 🟡 | نص الفاتورة بالإنجليزي، وهي للـ admin فقط (الـ moderator مستثنى) | [order.controller.js](../apps/api/controllers/order.controller.js) |
| PAY-201 | 🟡 | `verify-payment` يعود مبكراً عند `alreadyPaid` دون إكمال side effects متبقية (أثره قليل لأن Stripe يعيد الـ webhook) | [payment.controller.js](../apps/api/controllers/payment.controller.js) |

---

## 3. 🟠 الأمان

| الرمز | الحالة | المشكلة | الدليل |
|---|---|---|---|
| SEC-103 | ⬜ | الـ refresh token في الـ Dashboard في cookie يقرأها الـ JavaScript (`js-cookie`) | [dashboard/lib/auth.ts](../apps/dashboard/src/lib/auth.ts) |
| SEC-109 | 🟡 | access token المتجر يقرأه الـ JavaScript | [website/lib/authCookies.ts](../apps/website/src/lib/authCookies.ts) |
| SEC-115 | ⬜ | الـ BFF login/register يقبل `request.json()` بلا فحص Origin ولا Content-Type | [login/route.ts](../apps/website/src/app/api/auth/login/route.ts)، [register/route.ts](../apps/website/src/app/api/auth/register/route.ts) |
| SEC-111 | 🟡 | الـ JWT يحمل الـ roles بلا `tokenVersion` ولا فحص في الـ DB، فالـ admin الذي نُزّلت رتبته يبقى له وصول حتى 15 دقيقة. الـ header `token:` ما زال مقبولاً | [verfiyToken.js](../apps/api/middlewares/verfiyToken.js) |
| SEC-112 | 🟡 | يمكن معرفة إن كان إيميل مسجلاً: رسالة register، و409 في تحديث الـ profile، وتوقيت forgot-password، و`ACCOUNT_LOCKED` للحسابات الحقيقية فقط | [auth.controller.js](../apps/api/controllers/auth.controller.js)، [profile.controller.js](../apps/api/controllers/profile.controller.js)، [password.controller.js](../apps/api/controllers/password.controller.js) |
| SEC-108 | 🟡 | `trust proxy = 1` بانتظار قرار عدد الـ hops (Vercel ثم Render)، والـ rate-limit في `Map` في الذاكرة، و limiters الدفع قبل `verfiyToken` فمفتاحها دائماً `anonymous` | [app.js](../apps/api/app.js)، [rateLimit.js](../apps/api/middlewares/rateLimit.js)، [payments.js](../apps/api/routes/payments.js) |
| SEC-107 | 🟡 | لا يوجد تحقق من الإيميل الجديد، ولا تُلغى الجلسات الأخرى، والـ admin يغيّر إيميله عبر `PUT /users/:id` بلا كلمة سر | [profile.controller.js](../apps/api/controllers/profile.controller.js)، [user.controller.js](../apps/api/controllers/user.controller.js) |
| SEC-102 | 🟡 | فحص الـ grace window يعتمد على `replacedByHash` و`revokedAt` فقط، فإعادة استخدام التوكن القديم خلال 30 ثانية بعد logout أو تغيير كلمة السر تُنشئ جلسة جديدة | [refreshTokens.js](../apps/api/utils/refreshTokens.js) |
| SEC-113 | 🟡 | الـ API مُصلح، لكن جدول Users يعرض للـ admin أزرار حذف نفسه وتعطيل حسابه وتغيير رتبته (يرفضها الـ API بـ 400) | [Users.tsx](../apps/dashboard/src/pages/Users.tsx) |
| SEC-105 | 🟡 | `/password/change` لا يستخدم الـ lockout الخاص بكل حساب | [password.controller.js](../apps/api/controllers/password.controller.js) |
| OPS-712 | 🟡 | رمز إعادة كلمة السر صالح 5 دقائق فقط، والـ controller ينشئ nodemailer transporter خاصاً به ويتجاهل `FROM_EMAIL` | [password.controller.js:66](../apps/api/controllers/password.controller.js#L66) |
| API-214 | 🟡 | `helmet` ما زال `contentSecurityPolicy: false` على مستوى التطبيق (الفاتورة وحدها لها CSP الآن) | [app.js](../apps/api/app.js) |

---

## 4. 🟡 جودة الواجهة — المتجر (`apps/website`)

| الرمز | الحالة | المشكلة | الدليل |
|---|---|---|---|
| WEB-517 | ⬜ | قائمة الموبايل لا تُغلق بزر Escape ولا تُرجع التركيز إلى زر الفتح | [Navbar.tsx](../apps/website/src/components/navigation/Navbar.tsx) |
| WEB-511 | 🟡 | `aria-current` في الشريط السفلي فقط، وبمطابقة حرفية للمسار. الـ navbar الرئيسي والـ quick links بدونه | [AppShell.tsx](../apps/website/src/components/layout/AppShell.tsx)، [Navbar.tsx](../apps/website/src/components/navigation/Navbar.tsx) |
| WEB-520 | ⬜ | لا يوجد h1 في الصفحة الرئيسية إذا لم يوجد module ‏`hero_carousel`، وصفحة المنتج h1 ثم h3، و`/unauthorized` بلا h1 | [HeroSection.tsx](../apps/website/src/components/home/HeroSection.tsx)، [ProductDetailClient.tsx](../apps/website/src/app/products/[id]/ProductDetailClient.tsx)، [unauthorized/page.tsx](../apps/website/src/app/unauthorized/page.tsx) |
| WEB-516 | ⬜ | أزرار أقسام الفلاتر بلا `aria-expanded`، و`<h4>` داخل `<button>`، وأزرار أسعار الـ presets بلا `aria-pressed` | [CategorySidebar.tsx](../apps/website/src/components/products/CategorySidebar.tsx) |
| WEB-518 | 🟡 | الـ carousel لا يعلن تغيّر الشريحة (لا يوجد live region) | [HeroPromoCarousel.tsx](../apps/website/src/components/home/HeroPromoCarousel.tsx) |
| WEB-521 | ⬜ | أزرار السلة بأسماء عامة لا تذكر المنتج، وخطأ النشرة في الـ footer بلا `aria-describedby` ولا `role=alert`، وروابط social ‏`href='#'`، والصورة المصغرة المختارة بلا `aria-current`، وكتل الخطأ في `/shipping` و`/returns` و`/help` بلا `role=alert` | [cart/page.tsx](../apps/website/src/app/cart/page.tsx)، [Footer.tsx](../apps/website/src/components/layout/Footer.tsx)، [shipping/page.tsx](../apps/website/src/app/shipping/page.tsx) |
| WEB-526 | ⬜ | إضافة review أو تعديلها لا يحدّث تقييم المنتج (يُبطَل cache الـ reviews فقط) | [reviewsQuery.ts](../apps/website/src/hooks/reviews/reviewsQuery.ts) |
| WEB-530 | ⬜ | `localStorage.setItem` في السلة بلا try/catch، والحقل `coupon` ما زال محمولاً | [cartStore.ts](../apps/website/src/lib/cartStore.ts) |
| WEB-531 | ⬜ | تنبيهات السلة لا تُمسح أبداً (`seenRef` يُدمج ولا يُصفَّر) | [cartQuoteQuery.ts](../apps/website/src/hooks/cart/cartQuoteQuery.ts) |
| WEB-507 | ⬜ | عناوين المنتجات بلا `dir="auto"` ولا `<bdi>` | [ProductCard.tsx](../apps/website/src/components/products/ProductCard.tsx) |
| WEB-422 | ⬜ | skeleton واحد (شبكة منتجات) لكل الصفحات، و toast الخروج الإجباري بالإنجليزي، والـ proxy matcher يعمل على الـ assets، والـ access cookie يعيش 7 أيام مقابل 30 للـ refresh | [app/loading.tsx](../apps/website/src/app/loading.tsx)، [lib/api.ts](../apps/website/src/lib/api.ts)، [proxy.ts](../apps/website/src/proxy.ts) |
| WEB-415 | ⬜ | قائمة hosts الصور لا تغطي صور الـ CMS، وشعارات الـ brands بـ `next/image` بلا `unoptimized` | [next.config.ts](../apps/website/next.config.ts)، [brands/page.tsx](../apps/website/src/app/brands/page.tsx) |

## 5. 🟡 جودة الواجهة — الـ Dashboard (`apps/dashboard`)

| الرمز | الحالة | المشكلة | الدليل |
|---|---|---|---|
| DASH-622 | ⬜ | قائمة الموبايل بلا focus trap وبلا Escape وبلا `inert` عند الإخفاء، وروابط الشريط المطوي وزر Logout وزر الثيم (emoji) بلا `aria-label`، والتمييز بمطابقة حرفية فلا يتميّز Orders في `/orders/:id` | [DashboardLayout.tsx](../apps/dashboard/src/layouts/DashboardLayout.tsx) |
| DASH-618 | 🟡 | حقول تعتمد على placeholder فقط: صفوف Bundles (2) وGiftFinderConfig (10)، وحقلا Description وLocation في tracking event، ورابط الصورة في GalleryField | [Bundles.tsx](../apps/dashboard/src/pages/Bundles.tsx)، [GiftFinderConfig.tsx](../apps/dashboard/src/pages/GiftFinderConfig.tsx)، [OrderDetail.tsx](../apps/dashboard/src/pages/OrderDetail.tsx)، [GalleryField.tsx](../apps/dashboard/src/components/products/GalleryField.tsx) |
| API-212 | 🟡 | زر الحذف في Brands ما زال `aria-label="Delete"` مع أن العملية صارت Deactivate | [Brands.tsx](../apps/dashboard/src/pages/Brands.tsx) |

---

## 6. 🟢 الترجمة والمحتوى العربي

| الرمز | الحالة | المشكلة | الدليل |
|---|---|---|---|
| WEB-413 | ⬜ | `<title>` والـ description بالإنجليزي في كل الصفحات، و`generateMetadata` لا يستخدم الترجمة، ولا يوجد `alternates.languages` | [app/layout.tsx](../apps/website/src/app/layout.tsx)، [categoryPage.ts](../apps/website/src/lib/categoryPage.ts) |
| WEB-412 | ⬜ | اللغة في cookie على نفس الـ URL، فلا توجد locale URLs ولا hreflang، والصفحات العربية لا تُفهرس | — |
| API-228 | ⬜ | لا يوجد error envelope موحد. أغلب الـ controllers ترجع `{ message }` فقط، و`checkRolePermission` يستخدم `error: 'NO_TOKEN'` بدل `code` | [errorHandler.js](../apps/api/middlewares/errorHandler.js)، [checkRolePermission.js](../apps/api/middlewares/checkRolePermission.js) |
| WEB-501 | 🟡 | error codes موجودة لحالات قليلة فقط. نحو 200 استجابة 4xx بلا `code` (الكوبونات، المخزون، رسائل Joi، "invalid email or password")، و`userFacingError` يعرض رسالة السيرفر الإنجليزية قبل الترجمة | [userFacingError.ts](../apps/website/src/lib/userFacingError.ts) |
| WEB-505 | ⬜ | "Not authenticated" يظهر بالإنجليزي في `/user/security` | [useChangePassword.ts](../apps/website/src/hooks/auth/useChangePassword.ts) |
| BFF | ⬜ | كل رسائل أخطاء الـ BFF (login و register و refresh و logout) بالإنجليزي | [app/api/auth/](../apps/website/src/app/api/auth/)، [serverAuth.ts](../apps/website/src/lib/serverAuth.ts) |
| WEB-405 | ⬜ | `/privacy` و`/terms` نصوص ثابتة وتتجاهل محتوى CMS ‏`PRIVACY` و`TERMS` | [privacy/page.tsx](../apps/website/src/app/privacy/page.tsx)، [terms/page.tsx](../apps/website/src/app/terms/page.tsx) |
| API-311 | ⬜ | **لا توجد حقول عربية في الـ models** ما عدا hero slides (`StorefrontModule.translations.ar`): Content وHelpTopic وLookbook وTestimonial وOffer وCategory وGiftFinderConfig. الـ trust defaults إنجليزية | [models/](../apps/api/models/) |
| API-311 | ⬜ | `/shipping` و`/returns` و`/help` و`/offers` وبيانات المنتجات والـ brands تظهر بالإنجليزي في الواجهة العربية | [shipping/page.tsx](../apps/website/src/app/shipping/page.tsx)، [help/page.tsx](../apps/website/src/app/help/page.tsx) |
| Emails | ⬜ | كل الإيميلات (تأكيد الطلب، إعادة كلمة السر، إشعار التواصل) نص إنجليزي، ولا يوجد حقل locale في User أو Order | [mail.js](../apps/api/utils/mail.js) |
| Dashboard | ⬜ | الـ Dashboard كله `lang="en"` وبلا RTL، وإدخال العربي ممكن في hero slides فقط | [index.html](../apps/dashboard/index.html)، [HeroSlidesEditor.tsx](../apps/dashboard/src/components/storefront/HeroSlidesEditor.tsx) |

---

## 7. نواقص في الـ API

| الرمز | الحالة | المشكلة |
|---|---|---|
| API-309 | 🔄 | إشعارات التواصل تتجاهل `StoreSettings.contactEmail` (تحقّق بعد انتهاء الجلسة الأخرى) |
| API-306 / API-307 | ⬜ | تصويت "helpful" في Q&A بلا dedupe ولا حدود |
| API-327 | ⬜ | reviews الموظفين غير مستثناة، ولا توجد حالة moderation (pending/approved) |
| API-227 | ⬜ | انتهاء صلاحية الكوبون في بداية اليوم وليس نهايته |
| DASH-615 | ⬜ | Low stock على مستوى المنتج فقط، وليس على مستوى الـ variant |

---

## 8. أماكن كان فيها التدقيق أكثر تفاؤلاً من الكود

| الرمز | ما قاله التدقيق | ما في الكود |
|---|---|---|
| SEC-105 | ✅ | كان جزئياً: `PUT /users/:id` كان يغيّر كلمة السر بلا فحص. **أُصلح في هذه الجلسة** |
| API-202 | ✅ | الإصلاح في الواجهة فقط، والـ Joi يرفض `''` |
| SEC-102 | ✅ | نافذة 30 ثانية لإعادة استخدام التوكن بعد logout |
| SEC-113 | ✅ | الـ API سليم، والواجهة تعرض أفعالاً على الحساب نفسه |
| WEB-511 | ✅ | `aria-current` في الشريط السفلي فقط |
| DASH-618 | حقول OrderDetail مُسمّاة | حقلان في tracking event وحقل في GalleryField بلا label |
| مفاتيح الترجمة | 1274/1274 | 1288/1288، والتطابق كامل (يتضمن مفاتيح أُضيفت بعد التدقيق) |

---

## 9. ترتيب العمل المقترح

| # | البند | الحجم |
|---|---|---|
| 1 | SEC-115 (Origin/Content-Type في الـ BFF) + منع الـ admin من تغيير إيميله عبر `PUT /users/:id` (SEC-107) | S |
| 2 | WEB-517 + DASH-622: Escape وfocus trap في قوائم الموبايل | S |
| 3 | حارس Joi لـ API-202 + تحقق الـ handle في Shipping Zones (DASH-609، API-203) | S |
| 4 | دفعة a11y للمتجر: WEB-520، WEB-516، WEB-521، WEB-511 | M |
| 5 | WEB-526 + WEB-530 + WEB-531 (السلة والـ reviews) | S |
| 6 | C1: error envelope وcodes ثابتة (API-228) ثم ترجمتها في الواجهة (WEB-501، WEB-505، الـ BFF) | M |
| 7 | C2: حقول عربية للـ models وللـ Dashboard والإيميلات (API-311، WEB-405) | L |
| 8 | C3: localised metadata وlocale URLs وhreflang وsitemap shards (WEB-413، WEB-412، WEB-418) | L |
| 9 | C4: التوكنات إلى httpOnly + admin 2FA (SEC-103، SEC-109) | L |
| 10 | SEC-111 (`tokenVersion`)، SEC-108 (shared rate-limit store، بعد تأكيد عدد الـ proxy hops) | M |

**قرارات تنتظر صاحب المشروع** (من التدقيق الأصلي):
- عدد الـ proxy hops بين Vercel وRender (لـ `trust proxy`، SEC-108).
- الاشتراك في أحداث Stripe `checkout.session.async_payment_*` من الـ Stripe dashboard.
- اعتماد Sentry (dependencies وDSNs).
- `npm install --package-lock-only` لتحديث الـ lockfile، ثم حذف الـ dependencies غير المستخدمة وworkspace ‏`packages/types`.
