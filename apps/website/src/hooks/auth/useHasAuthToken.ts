import { useSyncExternalStore } from 'react';
import { getAuthToken } from '@/lib/authCookies';

// Cookies have no change event. Nothing is lost: login/logout re-render the
// consumers (query updates, navigation) and the snapshot is re-read then.
const subscribe = () => () => {};

const getSnapshot = () => Boolean(getAuthToken());
// The server can't read the js-cookie token, so it always renders "signed
// out"; the hydrating client must render the same, then update.
const getServerSnapshot = () => false;

/**
 * Whether the access-token cookie is present — hydration-safe. Calling
 * getAuthToken() directly during render made the server HTML (no token)
 * disagree with the first client render (token), causing hydration errors.
 */
export function useHasAuthToken(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
