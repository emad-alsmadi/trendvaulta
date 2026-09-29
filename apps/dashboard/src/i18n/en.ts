/**
 * English dashboard copy — the source of truth for message keys.
 * ar.ts is typed against this shape, so a missing Arabic string fails tsc.
 * `{name}` placeholders are filled by t(key, vars).
 */
export const en = {
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    dismiss: 'Dismiss notification',
    unread: 'unread',
    switchLanguage: 'العربية',
    switchLanguageLabel: 'Switch to Arabic',
  },
  nav: {
    label: 'Dashboard navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    toggleTheme: 'Toggle theme',
    logout: 'Log out',
    items: {
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      users: 'Users',
      products: 'Products',
      brands: 'Brands',
      categories: 'Categories',
      lowStock: 'Low Stock',
      orders: 'Orders',
      shippingZones: 'Shipping Zones',
      coupons: 'Coupons',
      offers: 'Offers',
      reviews: 'Reviews',
      messages: 'Messages',
      helpTopics: 'Help Topics',
      content: 'Content',
      storefrontModules: 'Storefront Modules',
      lookbooks: 'Lookbooks',
      testimonials: 'Testimonials',
      bundles: 'Bundles',
      giftFinder: 'Gift Finder',
      productQa: 'Product Q&A',
      settings: 'Settings',
    },
  },
  login: {
    brandBadge: 'Admin',
    headline: 'Run the store from one calm place.',
    highlightOrders: 'Orders, returns and fulfilment in one queue',
    highlightAnalytics: 'Sales and catalogue analytics',
    highlightAccess: 'Role-based access for every staff member',
    title: 'Sign in',
    subtitle: 'Use a staff account to access the dashboard.',
    email: 'Email address',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    capsLock: 'Caps Lock is on',
    remember: 'Keep me signed in',
    submit: 'Sign in',
    submitting: 'Signing in…',
    errorInvalid: 'Invalid email or password',
    errorNoAccess: 'This account does not have dashboard access (staff role required).',
    errorNoToken: 'Sign-in succeeded but no session was returned. Please try again.',
  },
  pagination: {
    label: 'Pagination',
    range: '{from}–{to} of {total}',
    rows: 'Rows',
    rowsPerPage: 'Rows per page',
    previous: 'Previous page',
    next: 'Next page',
  },
  errorBoundary: {
    title: 'Something went wrong on this page.',
    body: 'The rest of the dashboard still works. Try again, or open another page from the sidebar.',
    retry: 'Try again',
  },
};

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Messages = DeepStrings<typeof en>;

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<typeof en>;
