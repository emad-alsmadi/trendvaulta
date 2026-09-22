import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import Brands from './pages/Brands';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Coupons from './pages/Coupons';
import Offers from './pages/Offers';
import Reviews from './pages/Reviews';
import HelpTopics from './pages/HelpTopics';
import Content from './pages/Content';
import StorefrontModules from './pages/StorefrontModules';
import Lookbooks from './pages/Lookbooks';
import Testimonials from './pages/Testimonials';
import Bundles from './pages/Bundles';
import GiftFinderConfig from './pages/GiftFinderConfig';
import ProductQA from './pages/ProductQA';
import Settings from './pages/Settings';
import Login from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
              <Route
                path='users'
                element={<Users />}
              />
              <Route
                path='products'
                element={<Products />}
              />
              <Route
                path='brands'
                element={<Brands />}
              />
              <Route
                path='orders'
                element={<Orders />}
              />
              <Route
                path='orders/:id'
                element={<OrderDetail />}
              />
              <Route
                path='coupons'
                element={<Coupons />}
              />
              <Route
                path='offers'
                element={<Offers />}
              />
              <Route
                path='reviews'
                element={<Reviews />}
              />
              <Route
                path='help-topics'
                element={<HelpTopics />}
              />
              <Route
                path='content'
                element={<Content />}
              />
              <Route
                path='storefront-modules'
                element={<StorefrontModules />}
              />
              <Route
                path='lookbooks'
                element={<Lookbooks />}
              />
              <Route
                path='testimonials'
                element={<Testimonials />}
              />
              <Route
                path='bundles'
                element={<Bundles />}
              />
              <Route
                path='gift-finder-config'
                element={<GiftFinderConfig />}
              />
              <Route
                path='product-qa'
                element={<ProductQA />}
              />
              <Route
                path='settings'
                element={<Settings />}
              />
            </Route>
          </Routes>
        </BrowserRouter>
        </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
