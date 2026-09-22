# TrendVaulta Storefront Gap Analysis

**Date:** 2026-08-07 (refreshed after P0/P1 demo batch + P2 lookbook/FBT)  
**Source:** `apps/website` inspection + Amazon UX audit mapping  
**Goal:** Classify what exists vs frontend demo vs backend later

---

## Classification legend

| Tag               | Meaning                                     |
| ----------------- | ------------------------------------------- |
| ALREADY EXISTS    | Shipped and usable                          |
| PARTIAL           | Present but incomplete                      |
| MISSING FRONTEND  | UI not built; can demo without API          |
| MISSING BACKEND   | Needs API/models                            |
| DEMO-ONLY FOR NOW | Frontend mock wired; replace with API later |
| OUT OF SCOPE      | Not for this batch                          |

---

## Homepage

| Candidate                        | Status            | Notes                                                             |
| -------------------------------- | ----------------- | ----------------------------------------------------------------- |
| Hero + search                    | ALREADY EXISTS    | Retail TrendVaulta copy; CTAs to `/products`                      |
| Popular categories               | DEMO-ONLY FOR NOW | `DEMO_CATEGORY_SHORTCUTS`                                         |
| Featured / best sellers grid     | ALREADY EXISTS    | `useProducts` + `FeaturedProductsSection`; sort still `createdAt` |
| Trust / service strip            | DEMO-ONLY FOR NOW | `TrustServiceStrip`                                               |
| Deals / offers rail              | DEMO-ONLY FOR NOW | `DealsRail`                                                       |
| Featured brands                  | DEMO-ONLY FOR NOW | `FeaturedBrandsStrip`                                             |
| Recently viewed                  | DEMO-ONLY FOR NOW | localStorage (`recentlyViewed.ts`)                                |
| Recommendations “inspired by”    | DEMO-ONLY FOR NOW | `pickInspiredProducts` stub                                       |
| Editorial lookbook               | DEMO-ONLY FOR NOW | `EditorialLookbookSection`                                        |
| Gift finder                      | DEMO-ONLY FOR NOW | `GiftFinderSection` → PLP query builder                           |
| Bundles / FBT on home            | OUT OF SCOPE      | Lives on PDP                                                      |
| Testimonials / WhyChooseUs / CTA | ALREADY EXISTS    | Retailized                                                        |
| Homepage CMS modules             | MISSING BACKEND   | See backend backlog                                               |

---

## Catalog / discovery

| Candidate               | Status                       | Notes                                                                                               |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Product listing page    | ALREADY EXISTS               | `/products`                                                                                         |
| Search / filters / sort | PARTIAL → improved           | API: `q`, price, category, sort, page in URL; demo: rating/size/color client facets + mobile drawer |
| Product cards           | ALREADY EXISTS + DEMO badges | Sale % + OOS + PLP uses `getDemoBadgesForIndex`                                                     |
| Empty / loading states  | ALREADY EXISTS               | Skeleton grid + keepPreviousData while fetching                                                     |

---

## Product detail

| Candidate                | Status            | Notes                                 |
| ------------------------ | ----------------- | ------------------------------------- |
| Gallery                  | ALREADY EXISTS    |                                       |
| Price / discount         | ALREADY EXISTS    |                                       |
| Variants                 | PARTIAL           | UI present                            |
| Add to cart / buy now    | ALREADY EXISTS    | Do not break                          |
| Ratings summary          | ALREADY EXISTS    |                                       |
| Complete the look / FBT  | DEMO-ONLY FOR NOW | `CompleteTheLookSection` (this batch) |
| Q&A tabs                 | OUT OF SCOPE      |                                       |
| Recently viewed tracking | DEMO-ONLY FOR NOW | Tracked on PDP                        |

---

## Cart / checkout / profile

| Candidate          | Status         | Notes                   |
| ------------------ | -------------- | ----------------------- |
| Cart               | ALREADY EXISTS | Do not break            |
| Checkout + Stripe  | ALREADY EXISTS | OUT OF SCOPE            |
| Coupons            | ALREADY EXISTS | Server-authoritative    |
| Wishlist           | ALREADY EXISTS |                         |
| Orders / profile   | ALREADY EXISTS |                         |
| Trust near pay CTA | PARTIAL        | Keep; no Stripe changes |

---

## Shared UI / data

| Candidate             | Status         | Notes                        |
| --------------------- | -------------- | ---------------------------- |
| Button, layout chrome | ALREADY EXISTS |                              |
| Footer                | ALREADY EXISTS | Retail shop/support links    |
| Demo storefront data  | ALREADY EXISTS | `src/data/demoStorefront.ts` |
| Header account/cart   | ALREADY EXISTS |                              |

---

## This batch decisions

**In scope:**

- Refresh audit + gap docs from live Amazon inspection
- P2 demo: editorial lookbook (home) + complete-the-look (PDP)
- Keep all demos clearly marked and API-swappable

**Out of scope:**

- Backend APIs, Stripe, auth, order mutations
- Recommendation ML infrastructure
- Amazon visual/brand clone or scraped content
- Dense PLP facet rebuild
