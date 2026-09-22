# Storefront Backend Backlog

**Status:** Not implemented — frontend demos only.  
**Related:** `docs/AMAZON_UX_AUDIT.md`, `docs/STOREFRONT_GAP_ANALYSIS.md`, `apps/website/src/data/demoStorefront.ts`

---

## 1. Homepage modules CMS / config

| Field                 | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **Proposed endpoint** | `GET /api/storefront/home`                                         |
| **Auth**              | Public                                                             |
| **Priority**          | P0                                                                 |
| **Depends on**        | New `StorefrontModule` (or CMS content) model; optional admin CRUD |

**Response shape (draft):**

```json
{
  "message": "ok",
  "modules": [
    {
      "key": "hero",
      "type": "hero",
      "title": "string",
      "subtitle": "string",
      "ctaLabel": "string",
      "ctaHref": "string",
      "imageUrl": "string",
      "active": true,
      "sortOrder": 0
    },
    {
      "key": "trust",
      "type": "trust_strip",
      "items": [{ "icon": "truck", "title": "string", "description": "string" }]
    }
  ]
}
```

**Frontend swap:** Replace `demoStorefront` imports with React Query hook `useStorefrontHome()`.

---

## 2. Deals / offers

| Field                 | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/offers?active=true&limit=12`                                 |
| **Auth**              | Public                                                                 |
| **Priority**          | P0                                                                     |
| **Depends on**        | New `Offer` model or reuse `Coupon` + merchandising flags on `Product` |

**Response shape (draft):**

```json
{
  "message": "ok",
  "results": [
    {
      "_id": "…",
      "title": "Weekend glow set",
      "subtitle": "Up to 25% off select skincare",
      "badge": "Limited",
      "href": "/products?tag=deal",
      "imageUrl": "…",
      "endsAt": "ISO-8601"
    }
  ]
}
```

---

## 3. Best sellers / featured products

| Field                 | Value                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/products?sort=bestselling&limit=8` **or** `GET /api/storefront/featured` |
| **Auth**              | Public                                                                             |
| **Priority**          | P0                                                                                 |
| **Depends on**        | Order line aggregates or curated `featured` / `badge` fields on `Product`          |

**Response shape:** Reuse existing products list envelope `{ results, total, page, limit }`.

**Notes:** Homepage currently uses generic `createdAt` sort. Prefer sales-ranked or curated list.

---

## 4. Product merchandising badges

| Field                 | Value                                               |
| --------------------- | --------------------------------------------------- | ----- | -------------- |
| **Proposed endpoint** | Fields on product payloads: `badges?: ('bestseller' | 'new' | 'lowStock')[]` |
| **Auth**              | Public (read)                                       |
| **Priority**          | P0                                                  |
| **Depends on**        | `Product` schema flags + stock thresholds           |

**Response:** Extend existing `Product` JSON; frontend already accepts optional `badges` on `ProductCard`.

---

## 5. Featured brands

| Field                 | Value                                     |
| --------------------- | ----------------------------------------- |
| **Proposed endpoint** | `GET /api/brands?featured=true&limit=8`   |
| **Auth**              | Public                                    |
| **Priority**          | P1                                        |
| **Depends on**        | Existing Brand model + `featured` boolean |

---

## 6. Recommendations (“inspired by browsing”)

| Field                 | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/recommendations?context=home&limit=8`                        |
| **Auth**              | Optional JWT (stronger personalization when signed in)                 |
| **Priority**          | P1                                                                     |
| **Depends on**        | View events / purchase history; start with category co-occurrence stub |

**Response shape (draft):**

```json
{
  "message": "ok",
  "results": [
    {
      /* Product */
    }
  ],
  "strategy": "similar_category"
}
```

---

## 7. Recently viewed sync

| Field                 | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **Proposed endpoint** | `POST /api/me/recently-viewed` · `GET /api/me/recently-viewed` |
| **Auth**              | JWT required for sync; anonymous stays localStorage            |
| **Priority**          | P1                                                             |
| **Depends on**        | User session; optional `RecentlyViewed` collection             |

**Body:** `{ productId: string }`  
**Response:** `{ results: Product[] }` (max 12, newest first)

---

## 8. Trust / content settings

| Field                 | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/content?type=STOREFRONT_TRUST` (or settings page) |
| **Auth**              | Public                                                      |
| **Priority**          | P1                                                          |
| **Depends on**        | CMS/content model if introduced; else static config env     |

---

## 9. Bundles / frequently bought together (“complete the look”)

| Field                 | Value                                                |
| --------------------- | ---------------------------------------------------- |
| **Proposed endpoint** | `GET /api/products/:id/bundles`                      |
| **Auth**              | Public                                               |
| **Priority**          | P2                                                   |
| **Depends on**        | New `Bundle` model or co-purchase stats from `Order` |

**Response shape (draft):**

```json
{
  "message": "ok",
  "primaryProductId": "…",
  "items": [
    {
      /* Product */
    }
  ],
  "bundlePrice": 99.0,
  "savings": 12.0
}
```

**Frontend swap:** Replace `CompleteTheLookSection` demo picker with this endpoint. Keep “Add selected to cart” on existing cart store only.

---

## 10. Editorial lookbook / inspiration modules

| Field                 | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/storefront/lookbooks` **or** modules inside `GET /api/storefront/home` |
| **Auth**              | Public                                                                           |
| **Priority**          | P2                                                                               |
| **Depends on**        | CMS content / `StorefrontModule` type `lookbook`                                 |

**Response shape (draft):**

```json
{
  "message": "ok",
  "results": [
    {
      "id": "…",
      "eyebrow": "Edit",
      "title": "Soft morning ritual",
      "body": "string",
      "ctaLabel": "Shop the edit",
      "ctaHref": "/products?q=skincare",
      "imageUrl": "…",
      "tone": "rose"
    }
  ]
}
```

**Frontend swap:** Replace `DEMO_LOOKBOOK_STORIES` in `EditorialLookbookSection`.

---

## 11. Gift finder config

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **Proposed endpoint** | `GET /api/storefront/gift-finder`                          |
| **Auth**              | Public                                                     |
| **Priority**          | P2                                                         |
| **Depends on**        | CMS / storefront config; optional curated gift collections |

**Response shape (draft):**

```json
{
  "message": "ok",
  "occasions": [{ "id": "birthday", "label": "Birthday", "q": "gift" }],
  "recipients": [{ "id": "for-her", "label": "For her", "q": "beauty" }],
  "budgets": [{ "id": "under-25", "label": "Under $25", "maxPrice": 25 }]
}
```

**Frontend swap:** Replace `DEMO_GIFT_FINDER` / `buildGiftFinderHref` inputs in `GiftFinderSection`.

---

## Implementation order (backend)

1. Product badges + featured/bestseller query
2. `GET /api/offers` or storefront home aggregate
3. Featured brands flag
4. Recently viewed sync
5. Recommendations stub
6. Bundles / complete-the-look
7. Lookbook CMS modules
8. Gift finder config

**Do not mark any of the above done until APIs exist and demos are swapped off.**
