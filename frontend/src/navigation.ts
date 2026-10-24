export type AppView =
  | 'home'
  | 'add-product'
  | 'my-products'
  | 'my-profile'
  | 'messages'
  | 'admin-reactivation'
  | 'about'
  | 'how-it-works'
  | 'faq'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'not-found';

export type AppRoute = {
  view: AppView;
  modal?: 'login' | 'register';
  chatWith?: string;
  chatProductId?: string;
  productId?: string;
  isEmailAction?: boolean;
};

const VIEW_PATHS: Record<Exclude<AppView, 'not-found'>, string> = {
  home: '/',
  'add-product': '/seller/products/new',
  'my-products': '/seller/products',
  'my-profile': '/profile',
  messages: '/messages',
  'admin-reactivation': '/admin/reactivation',
  about: '/about',
  'how-it-works': '/how-it-works',
  faq: '/faq',
  contact: '/contact',
  terms: '/terms',
  privacy: '/privacy'
};

const PATH_VIEWS = new Map(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as AppView]));
const EMAIL_ACTION_PATHS = new Set(['/verify-email', '/reset-password', '/confirm-email-change']);

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function pathForView(view: AppView): string {
  return view === 'not-found' ? '/' : VIEW_PATHS[view];
}

export function resolveAppRoute(pathname: string, search = ''): AppRoute {
  const path = normalizePath(pathname);
  if (path === '/login') return { view: 'home', modal: 'login' };
  if (path === '/register') return { view: 'home', modal: 'register' };
  if (EMAIL_ACTION_PATHS.has(path)) return { view: 'home', isEmailAction: true };

  const messageMatch = path.match(/^\/messages\/([^/]+)$/);
  if (messageMatch) return {
    view: 'messages',
    chatWith: decodeURIComponent(messageMatch[1]),
    chatProductId: new URLSearchParams(search).get('product') || undefined
  };

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) return { view: 'home', productId: decodeURIComponent(productMatch[1]) };

  // Backwards compatibility for previously shared root query links.
  const legacyProductId = new URLSearchParams(search).get('product');
  if (path === '/' && legacyProductId) return { view: 'home', productId: legacyProductId };

  const view = PATH_VIEWS.get(path);
  return view ? { view } : { view: 'not-found' };
}
