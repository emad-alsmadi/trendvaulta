# TrendVaulta — خطة تنفيذ شاملة لإصلاح البنود المفتوحة

| | |
|---|---|
| **التاريخ** | 2026-10-03 |
| **المصدر** | `docs/OPEN_ISSUES_2026-09-30.md` + `docs/QA_REMEDIATION_PLAN_2026-09-30.md`، بعد إعادة فحص كل بند مقابل الكود الحالي (ليس نقل حرفي من المستندات) |
| **الطريقة** | قراءة الكود الفعلي لكل بند (static) عبر 3 مسارات بحث متوازية: أمان، a11y/ترجمة، نواقص API + QA remediation |
| **القاعدة** | حسب `AGENTS.md`: مهمة واحدة = PR واحد قابل للمراجعة. هذا المستند يقسّم العمل لمراحل، كل مرحلة = PR منفصل، ولا يبدأ تنفيذ مرحلة قبل موافقة صريحة |

**الرموز:** 🔴 حرج (أمان/بيانات) · 🟠 متوسط · 🟢 منخفض · ✅ تأكد أنه مُصلح فعلاً (لا حاجة لعمل) · ⚠️ يحتاج قرار منك قبل أي كود

---

## 0. تصحيحات مهمة قبل أي تنفيذ — بنود كانت "مفتوحة" بالمستندات القديمة لكنها بالكود الحالي مُصلحة فعلاً

لا تُجدول أي عمل لهذه البنود. فحصها agents بالقراءة المباشرة للكود:

| البند | الحالة الحقيقية |
|---|---|
| SEC-102 | نافذة الـ 30 ثانية تنطبق فقط على rotation الشرعي (تبويبات متزامنة)، لا على logout/password-change — `wasJustRotated` يتحقق من `replacedByHash` الذي لا يُضبط إلا بمسار الـ rotation. **مُصلح فعليًا** |
| SEC-113 | الواجهة فعلاً تعرض أزرار Disable/Delete/Role على حساب الأدمن نفسه، لكن الـ API يرفضها بـ 400 بشكل سليم — الجزء الباقي هو فقط إخفاء الأزرار (موجود بالخطة أدناه) |
| DASH-618 | كل الحقول الأربعة (Bundles, GiftFinderConfig, OrderDetail, GalleryField) عندها `aria-label` فعليًا بجانب `placeholder` |
| DASH-622 (جزء) | تمييز التنقل النشط، وتسمية Logout/theme-toggle — كل هذا مُصلح. الباقي الحقيقي: فقط Escape/focus-trap/inert |
| WEB-521 (جزء) | `aria-current` على الصورة المصغرة المختارة بصفحة المنتج — موجود فعليًا |
| WEB-415 (جزء) | `BrandLogo.tsx` عنده `unoptimized` فعليًا — الفجوة الحقيقية الباقية فقط بصور الـ Lookbook |
| WEB-520 (جزء) | لا يوجد تخطي h1→h3 بصفحة المنتج فعليًا — الفجوة الحقيقية فقط بصفحة `/unauthorized` |
| Emails (قسم 6) | كل إيميلات الطلب/كلمة السر/التحقق مُعرّبة بالفعل (`User.locale`, `Order.locale` موجودان، `mail.js` يمرر الـ locale لكل القوالب). الفجوة الوحيدة الحقيقية: إيميل إشعار التواصل الداخلي (للأدمن نفسه) — أولوية منخفضة جدًا |
| Dashboard lang="en" (قسم 6) | الـ RTL مُفعّل فعليًا pre-paint وبالـ runtime، ومبدّل اللغة يعمل. الفجوة الحقيقية الوحيدة: محرر إدخال العربي موجود فقط لـ hero slides — وهذا نتيجة مباشرة لـ API-311 (الموديلات الأخرى ما عندها حقول عربي أصلاً) |
| API-228 (جزء) | `errorHandler.js` فعليًا عنده envelope موحّد كامل. الفجوة الحقيقية: `checkRolePermission.js` لحقل واحد غلط، و~75 نقطة بالـ controllers بترجع `{message}` مباشرة بدون المرور بالـ handler |

---

## 1. Phase 1 — إصلاحات أمان حرجة بدون تبعيات (لا dependencies جديدة، لا قرار بنية تحتية)

🔴 كل البنود هنا S/M، صفر مخاطر بنيوية، تتبع نمط موجود بالكود فعلاً.

| # | البند | الملفات | الحجم | ملخص الإصلاح |
|---|---|---|---|---|
| 1.1 | SEC-113 | `apps/dashboard/src/pages/Users.tsx` | S | إخفاء أزرار Disable/Delete عن صف الأدمن الحالي (`user._id === currentUserId`) |
| 1.2 | SEC-105 (dashboard) | `apps/api/controllers/password.controller.js` | S | ربط `isAccountLocked`/`recordFailedPassword`/`clearFailedPasswords` بـ `/password/change` (نسخ النمط من `profile.controller.js:100-111`) |
| 1.3 | SEC-115 | `apps/website/src/app/api/auth/login/route.ts`, `register/route.ts` | S | فحص `Content-Type` + `Origin` قبل `request.json()` |
| 1.4 | API-214 (CSP) | `apps/api/app.js` | S | تفعيل CSP أساسي (`default-deny`) على مستوى التطبيق كامل — آمن لأن الـ API يرجع JSON فقط |
| 1.5 | SEC-108 (جزء آمن) | `apps/api/routes/payments.js` | S | ترتيب الـ middleware: `optionalVerifyToken` قبل `checkoutRateLimit`/`verifyPaymentRateLimit` بدل بعدهم |
| 1.6 | API-212 | `apps/dashboard/src/pages/Brands.tsx` + `i18n/en.ts` + `i18n/ar.ts` | S | مفتاح ترجمة جديد `common.deactivateItem` بدل استخدام `common.deleteItem` لزر Brands |
| 1.7 | OPS-712 | `apps/api/controllers/password.controller.js`, `apps/api/utils/mail.js` | S | رفع TTL من 5 دقائق لـ 30-60 دقيقة + حذف الـ transporter المكرر واستخدام `mail.js` الموجود |

**القرار المطلوب:** ⚠️ لا شي — كل بنود Phase 1 بدون تبعيات أو قرارات معلّقة. جاهزة للتنفيذ المباشر بعد موافقتك على المرحلة.

---

## 2. Phase 2 — أمان: بنود تحتاج قرارك أولاً

⚠️ **لا كود قبل الإجابة:**

| البند | السؤال |
|---|---|
| SEC-108 (باقي) | `trust proxy` — كم عدد الـ hops الفعلي بين Vercel والـ API على Render؟ (التخمين الخطأ يفتح ثغرة IP-spoofing أو يكسر الـ rate-limit بالكامل) |
| SEC-111 | إزالة دعم الهيدر القديم `token:` (لصالح `Authorization: Bearer` فقط) — breaking change لأي عميل/سكريبت قديم يستخدمه. موافق على الإزالة؟ |
| SEC-111 | إضافة `tokenVersion` يعني فحص DB بكل request مصادق عليه (كلفة أداء إضافية، لا يوجد Redis cache). موافق على هذا التبادل؟ |
| API-327 | مراجعات جديدة تُنشر فورًا حاليًا (`status` لا يوجد). نضيف moderation بـ default `pending` (تغيير سلوك فعلي) أو `approved` (نفس السلوك، بس البنية التحتية جاهزة لاحقًا)؟ |
| DASH-609/API-203 | تشديد validation الـ handle قد يرفض إعادة حفظ مناطق شحن قديمة غير متوافقة — بدي أفحص بيانات فعلية أول؟ وتغيير "handle غير متطابق = fallback صامت" إلى "خطأ 400" قد يكسر عميل حالي لو بيعتمد على الفولباك — موافق على اعتباره bug fix مباشر؟ |

**محذوف نهائيًا من الخطة بطلب المستخدم (لن يُنفَّذ):**
- SEC-103 (نقل refresh token بالـ dashboard لـ httpOnly cookie)
- SEC-108 الجزء الخاص بمخزن rate-limit مشترك عبر Redis — الجزء الآمن منه (ترتيب middleware) بقي بـ Phase 1، فقط جزء الـ Redis حُذف

**بعد إجاباتك، هذه البنود تتحول لـ Phase 2 فعلية بخطة S/M/L محددة من التحليل أعلاه.**

---

## 3. Phase 3 — مسار الشراء الحرج (QA_REMEDIATION_PLAN، لا تبعيات، تأثير مباشر على المبيعات)

🔴 أولوية عالية لأنها تمنع فقد مبيعات/شحن خاطئ — لا تحتاج قرار، جاهزة فور الموافقة:

| # | البند | الملفات | الحجم |
|---|---|---|---|
| 3.1 | 1.3 P0-002 — حارس شامل لسلة/checkout (`isBlockingNotice`/`hasBlocking`، تعطيل Checkout/Pay now لأي حالة محظورة، لا فقط `variant_required`) | `cartQuoteQuery.ts`, `cart/page.tsx`, `checkout/page.tsx` | M |
| 3.2 | 1.2 P0-001(b) — `replaceCartLine` + منتقي variant داخل صفحة السلة لإصلاح سطور معطوبة بدون مغادرة `/cart` | `cartStore.ts`, `cart/page.tsx` | M |
| 3.3 | 1.4 P2-005 — نص خطأ دفع آمن للعميل + حذف `detail` اللي يفضح أسماء env vars + فحص `setup-status` قبل تعبئة الفورم | `messages/{en,ar}.json`, `payment.controller.js`, `checkout/page.tsx` | S |
| 3.4 | 1b.1 P1-001 — القلب (Wishlist) يتوقف عن التعطل أثناء تحميل حالة أخرى + استبدال 12 request بواحد (`useMyWishlist`) | `WishlistButton.tsx`, `wishlistQuery.ts` | S-M |
| 3.5 | 1b.2 P1-002 — `scrollIntoView` + تركيز أول حقل عند فتح فورم العنوان | `user/addresses/page.tsx` | S |

---

## 4. Phase 4 — نواقص API (لا تبعيات، منطق خلفي)

| # | البند | الملفات | الحجم |
|---|---|---|---|
| 4.1 | API-227 — تطبيع انتهاء الكوبون لآخر اليوم (23:59:59) بدل منتصف الليل | `apps/api/utils/commerce.js` | S |
| 4.2 | DASH-615 (باقي) — شارة "مخزون منخفض" بالمتجر تفحص الـ variants لا المنتج فقط | `apps/api/models/Product.js`, `apps/website/.../ProductCard.tsx` | S |
| 4.3 | API-228 (checkRolePermission) — تصحيح شكل استجابة الخطأ (`code` بدل `error`، إضافة `success:false`) | `apps/api/middlewares/checkRolePermission.js` | S |

**مؤجل لحين قرارك (Phase 2):** DASH-609/API-203، API-327.

---

## 5. Phase 5 — a11y سريعة (صفر مخاطر، صفر تبعيات)

| # | البند | الملفات | الحجم |
|---|---|---|---|
| 5.1 | WEB-520 (باقي) | `<div>`→`<h1>` بصفحة `/unauthorized` | `unauthorized/page.tsx` | S |
| 5.2 | WEB-516 (باقي) | `aria-pressed` لأزرار price preset | `CategorySidebar.tsx` | S |
| 5.3 | WEB-507 | `dir="auto"` لعناوين المنتجات | `ProductCard.tsx` | S |
| 5.4 | WEB-526 | ربط invalidate لتقييم المنتج عند إضافة/تعديل review | `reviewsQuery.ts` | S |
| 5.5 | WEB-530 | `try/catch` حول `localStorage.setItem` بالسلة | `cartStore.ts` | S |
| 5.6 | WEB-415 (باقي) | `unoptimized` لصور Lookbook | `EditorialLookbookSection.tsx` | S |
| 5.7 | WEB-511 | `aria-current` بالـ Navbar الرئيسي و NavMenus (مش فقط الموبايل) | `Navbar.tsx`, `NavMenus.tsx` | M (عدة أماكن) |
| 5.8 | WEB-521 | اسم وصفي لزر حذف من السلة + `role="alert"` لأخطاء الـ newsletter/shipping/returns/help + روابط social حقيقية أو إزالتها | `cart/page.tsx`, `Footer.tsx`, `shipping/page.tsx` + similar | S-M |
| 5.9 | WEB-531 | تنظيف تنبيهات السلة المنتهية بدل تراكمها للأبد | `cartQuoteQuery.ts` | S-M |
| 5.10 | WEB-422 | skeleton عام لكل الصفحات + toast الخروج القسري بالإنجليزي + مطابقة الـ proxy على assets + فرق عمر cookie | 4 ملفات | M |
| 5.11 | DASH-622 (باقي) | Escape + focus trap + `inert` لقائمة الموبايل بالـ Dashboard (نسخ نمط Radix Dialog من `Drawer.tsx`) | `DashboardLayout.tsx` | M |

---

## 6. Phase 6 — الترجمة العربية الكاملة (الأكبر، تحتاج تنسيق محتوى)

⚠️ **قرار مطلوب قبل البلش:** هذا الجزء الأضخم بكل الخطة — إضافة حقول عربي لـ 7 موديلات (Content, HelpTopic, Lookbook, Testimonial, Offer, Category, GiftFinderConfig) بنفس نمط `StorefrontModule.translations.ar` الموجود فعليًا لـ hero slides. كل موديل يحتاج: حقل schema + تعديل الـ controller (merge عند `locale=ar`) + محرر Dashboard (نسخ نمط `HeroSlidesEditor.tsx`) + **إدخال محتوى عربي فعلي من فريقك** (هذا ليس كود — محتوى).

| # | البند | الحجم | ملاحظة |
|---|---|---|---|
| 6.1 | API-311 (نموذج واحد كتجربة، مثلاً Content) | M | نبدأ بموديل واحد لإثبات النمط قبل تكراره على الباقي |
| 6.2 | API-311 (باقي 6 موديلات) | L | بعد قبول نمط 6.1 |
| 6.3 | WEB-405 (privacy/terms تستخدم CMS) | S-M | يعتمد جزئيًا على 6.1 (Content موديل) |
| 6.4 | WEB-413 (metadata مترجمة + alternates.languages) | M | الجزء الثابت (Shop/at/Product) مستقل، الجزء الديناميكي يعتمد على 6.2 |
| 6.5 | API-228 (الباقي) — ~75 نقطة بالـ controllers تحتاج `code` | L | ميكانيكي لكن واسع، 28 ملف |
| 6.6 | WEB-501 | — | يُحل تلقائيًا بعد 6.5 (لا يحتاج كود بالواجهة) |
| 6.7 | WEB-505 | S | نقل فحص `isAuthenticated` لمستوى الواجهة |
| 6.8 | BFF (أخطاء Route Handlers بالإنجليزي) | S-M | 4 ملفات، استخدام `i18n-server.ts` الموجود |
| 6.9 | WEB-412 (locale URLs/hreflang) | **L، خطر SEO عالي** | قرار بنية منفصل — تغيير هيكلة الروابط بالكامل |

---

## الأولوية المقترحة للتنفيذ

```
Phase 1 (أمان بدون قرارات)  →  Phase 3 (مسار الشراء)  →  Phase 4 (API)  →  Phase 5 (a11y)
                ↓
        إجابتك على Phase 2 (قرارات أمان)
                ↓
        Phase 2 الفعلية  →  Phase 6 (ترجمة، تبدأ بـ 6.1 كتجربة)
```

**كل Phase = commit/PR مستقل بعد موافقتك الصريحة على بدئها، حسب قاعدة "one task per conversation" بـ AGENTS.md.**
