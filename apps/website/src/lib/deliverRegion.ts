/**
 * DEMO deliver-to preference (localStorage only).
 * Not a geo engine — shipping rates stay checkout-authoritative.
 * TODO(api): optional user preference sync later
 */

import {
  DEMO_DEFAULT_DELIVER_REGION_ID,
  DEMO_DELIVER_REGIONS,
  type DemoDeliverRegion,
} from '@/data/demoStorefront';

const STORAGE_KEY = 'tv_deliver_region';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getDeliverRegionById(id: string): DemoDeliverRegion {
  return (
    DEMO_DELIVER_REGIONS.find((r) => r.id === id) ??
    DEMO_DELIVER_REGIONS.find((r) => r.id === DEMO_DEFAULT_DELIVER_REGION_ID) ??
    DEMO_DELIVER_REGIONS[0]
  );
}

export function getDeliverRegion(): DemoDeliverRegion {
  if (!canUseStorage()) {
    return getDeliverRegionById(DEMO_DEFAULT_DELIVER_REGION_ID);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDeliverRegionById(DEMO_DEFAULT_DELIVER_REGION_ID);
    return getDeliverRegionById(raw);
  } catch {
    return getDeliverRegionById(DEMO_DEFAULT_DELIVER_REGION_ID);
  }
}

export function setDeliverRegionId(id: string): DemoDeliverRegion {
  const region = getDeliverRegionById(id);
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, region.id);
    } catch {
      /* ignore quota / private mode */
    }
  }
  return region;
}
