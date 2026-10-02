import { lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { I18nProvider } from './i18n/I18nProvider';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import DashboardLayout from './layouts/DashboardLayout';
// The sign-in screen is the first paint for a signed-out visitor: keep it in
// the entry chunk. Every page behind the layout loads on first visit, inside
// the layout's <Suspense>, so the sidebar never blanks while a page arrives.
import Login from './pages/Login';

const CHUNK_RELOAD_KEY = 'tv_admin_chunk_reload';

/**
 * React.lazy plus one recovery: after a deploy, a tab opened earlier asks for
 * chunk names that no longer exist. Reload once to pick up the new build;
 * if that still fails, let the page's ErrorBoundary show the error.
 */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    load().then(
      (module) => {
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch {
          // Storage blocked: nothing to clear.
        }
        return module;
      },
      (err: unknown) => {
        let reloaded = true;
        try {
          reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
          if (!reloaded) sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        } catch {
          // Without storage we can't tell a reload loop apart: don't retry.
        }
        if (reloaded) throw err;
        window.location.reload();
        // Keep Suspense waiting while the page reloads.
        return new Promise<never>(() => {});
      },
    ),
  );
}

const Dashboard = lazyPage(() => import('./pages/Dashboard'));
const Analytics = lazyPage(() => import('./pages/Analytics'));
const LowStock = lazyPage(() => import('./pages/LowStock'));
const Users = lazyPage(() => import('./pages/Users'));
const Products = lazyPage(() => import('./pages/Products'));
const Brands = lazyPage(() => import('./pages/Brands'));
const Categories = lazyPage(() => import('./pages/Categories'));
const Orders = lazyPage(() => import('./pages/Orders'));
const OrderDetail = lazyPage(() => import('./pages/OrderDetail'));
const Coupons = lazyPage(() => import('./pages/Coupons'));
const Offers = lazyPage(() => import('./pages/Offers'));
const Reviews = lazyPage(() => import('./pages/Reviews'));
const Messages = lazyPage(() => import('./pages/Messages'));
const HelpTopics = lazyPage(() => import('./pages/HelpTopics'));
const Content = lazyPage(() => import('./pages/Content'));
const StorefrontModules = lazyPage(() => import('./pages/StorefrontModules'));
const Lookbooks = lazyPage(() => import('./pages/Lookbooks'));
const Testimonials = lazyPage(() => import('./pages/Testimonials'));
const Bundles = lazyPage(() => import('./pages/Bundles'));
const GiftFinderConfig = lazyPage(() => import('./pages/GiftFinderConfig'));
const ProductQA = lazyPage(() => import('./pages/ProductQA'));
const Settings = lazyPage(() => import('./pages/Settings'));
const ShippingZones = lazyPage(() => import('./pages/ShippingZones'));
const Subscribers = lazyPage(() => import('./pages/Subscribers'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** path → page, in sidebar order. `index` is the dashboard home. */
const PAGES = [
  ['analytics', Analytics],
  ['low-stock', LowStock],
  ['users', Users],
  ['products', Products],
  ['brands', Brands],
  ['categories', Categories],
  ['orders', Orders],
  ['orders/:id', OrderDetail],
  ['coupons', Coupons],
  ['offers', Offers],
  ['reviews', Reviews],
  ['messages', Messages],
  ['help-topics', HelpTopics],
  ['content', Content],
  ['storefront-modules', StorefrontModules],
  ['lookbooks', Lookbooks],
  ['testimonials', Testimonials],
  ['bundles', Bundles],
  ['gift-finder-config', GiftFinderConfig],
  ['product-qa', ProductQA],
  ['shipping-zones', ShippingZones],
  ['subscribers', Subscribers],
  ['settings', Settings],
] as const;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <BrowserRouter>
                <Routes>
                  <Route
                    path='/login'
                    element={<Login />}
                  />
                  <Route
                    path='/'
                    element={<DashboardLayout />}
                  >
                    <Route
                      index
                      element={<Dashboard />}
                    />
                    {PAGES.map(([path, Page]) => (
                      <Route
                        key={path}
                        path={path}
                        element={<Page />}
                      />
                    ))}
                  </Route>
                </Routes>
              </BrowserRouter>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
