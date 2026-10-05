import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import {
  ArrowUp,
  BadgeCheck,
  Image as ImageIcon,
  LogOut,
  MapPin,
  Moon,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Sun,
  TrendingUp,
  User as Useric,
  X,
  MessageCircle
} from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { User, Product, Message, MessageMap, SellerOffer, getImageUrl as getProductImageUrl, normalizeSAPhoneNumber } from './types';
import logo from './assets/facicon.jpeg';
import { SellerOfferModal, SellerOfferSuccessModal } from './SellerOfferModal';
import { NOTIFICATION_VISIBILITY_EVENT, showNotification } from './AppNotificationModal';

import './App.css';
import {
  logoutUser,
  getProducts,
  getCurrentUser,
  upgradeUserToSeller,
  getEligibleSellerOffers,
  claimSellerOffer,
  trackWhatsAppClick
} from './api';

// Lazy load heavy components
const LoginForm = lazy(() => import('./LoginForm'));
const RegisterForm = lazy(() => import('./RegisterForm'));
const AddProductForm = lazy(() => import('./AddProduct'));
const ChatWindow = lazy(() => import('./ChatWindow'));
const SellerProducts = lazy(() => import('./SellerProducts'));
const UserProfile = lazy(() => import('./UserProfile'));
const AdminReactivation = lazy(() => import('./AdminReactivation'));
const AboutPage = lazy(() => import('./AboutPage'));
const HowItWorksPage = lazy(() => import('./HowItWorksPage'));
const FAQPage = lazy(() => import('./FAQPage'));
const ContactPage = lazy(() => import('./ContactPage'));
const TermsPage = lazy(() => import('./TermsPage'));
const PrivacyPage = lazy(() => import('./PrivacyPage'));
const Footer = lazy(() => import('./Footer'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12" style={{ border: '2px solid rgba(16,17,15,.18)', borderBottomColor: '#007aff' }}></div>
  </div>
);

// ─── Lazy Card Wrapper ────────────────────────────────────────────────────────
// Each card slot renders a skeleton until it scrolls into view, then swaps to
// the real card. This keeps DOM work minimal regardless of total product count.
const LazyCard = ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : skeleton}</div>;
};
// ─────────────────────────────────────────────────────────────────────────────

const App = () => {
  const API_BASE = process.env.REACT_APP_API_BASE;

  const [_error, setError] = useState<string>('');
  const [_loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sellerOffers, setSellerOffers] = useState<SellerOffer[]>([]);
  const [dismissedOfferIds, setDismissedOfferIds] = useState<string[]>([]);
  const [claimingOfferId, setClaimingOfferId] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string>('');
  const [claimedOfferExpiry, setClaimedOfferExpiry] = useState<string | Date | null>(null);
  const [appNotificationOpen, setAppNotificationOpen] = useState(false);
  const [highlightedProduct, setHighlightedProduct] = useState<Product | null>(null);
  const hasScrolledToHighlighted = useRef(false);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const data = await getCurrentUser();
          const freshUser = data?.user || data;
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem('user_data', JSON.stringify(freshUser));
            return;
          }
        }
        const stored = localStorage.getItem('user_data');
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch (err) {
        console.warn('Session restore failed', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setCurrentUser(null);
      }
    };
    restore();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setSellerOffers([]);
      return;
    }

    let cancelled = false;
    getEligibleSellerOffers()
      .then(offers => {
        if (!cancelled) setSellerOffers(offers);
      })
      .catch(error => {
        if (!cancelled) console.warn('Could not load seller offers:', error);
      });
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    setDismissedOfferIds([]);
    setOfferError('');
  }, [currentUser?._id]);

  useEffect(() => {
    const handleNotificationVisibility = (event: Event) => {
      setAppNotificationOpen((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(NOTIFICATION_VISIBILITY_EVENT, handleNotificationVisibility);
    return () => window.removeEventListener(NOTIFICATION_VISIBILITY_EVENT, handleNotificationVisibility);
  }, []);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const [currentView, setCurrentView] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [chatWith, setChatWith] = useState<number | null>(null);
  const [_messages, setMessages] = useState<MessageMap>({});
  const [_newMessage, _setNewMessage] = useState('');
  const [users, _setUsers] = useState<User[]>([]);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // All products fetched once — no pagination
  const [products, setProducts] = useState<Product[]>([]);

  const categories = useMemo(() => [
    { id: 'all', name: 'All Items' },
    { id: 'books', name: 'Books' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'services', name: 'Services' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'food', name: 'Food' },
    { id: 'other', name: 'Other' }
  ], []);

  const campuses = useMemo(() => [
    { id: 'all', name: 'All Locations' },
    { id: 'pretoria-main', name: '🔥 Pretoria Central' },
    { id: 'soshanguve-S', name: '🔥 Soshanguve South' },
    { id: 'soshanguve-N', name: 'Soshanguve North' },
    { id: 'ga-rankuwa', name: 'Ga-Rankuwa' },
    { id: 'pretoria-west', name: 'Pretoria Arcadia' },
    { id: 'arts', name: 'Arts' },
    { id: 'emalahleni', name: 'eMalahleni' },
    { id: 'mbombela', name: 'Mbombela' },
    { id: 'polokwane', name: 'Polokwane' }
  ], []);

  const selectedCategoryName = useMemo(() => {
    return categories.find(category => category.id === selectedCategory)?.name || 'All Items';
  }, [categories, selectedCategory]);

  const selectedCampusName = useMemo(() => {
    return campuses.find(campus => campus.id === selectedCampus)?.name.replace('🔥 ', '') || 'All Locations';
  }, [campuses, selectedCampus]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCampus('all');
  }, []);

  // Fetch and highlight a specific shared product
  const fetchAndHighlightProduct = useCallback(async (productId: string) => {
    if (!API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/api/products/${productId}`);
      const data = await response.json();
      if (data.success || data._id) {
        const product = data.success ? data : { ...data, id: data._id };
        hasScrolledToHighlighted.current = false;
        setHighlightedProduct(product);
      }
    } catch (err) {
      console.error('❌ Failed to fetch product:', err);
    }
  }, [API_BASE]);

  // Handle ?product= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (productId && API_BASE) {
      setHighlightedProduct(null);
      fetchAndHighlightProduct(productId);
      window.history.replaceState({}, '', '/');
    }
  }, [API_BASE, fetchAndHighlightProduct]);

  // Scroll to highlighted product once rendered
  useEffect(() => {
    if (highlightedProduct && products.length > 0 && !hasScrolledToHighlighted.current) {
      const scrollToProduct = (attempts = 0, maxAttempts = 20) => {
        const element = document.getElementById('highlighted-product');
        if (element) {
          const headerOffset = 120;
          const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          hasScrolledToHighlighted.current = true;
        } else if (attempts < maxAttempts) {
          setTimeout(() => scrollToProduct(attempts + 1, maxAttempts), 100);
        } else {
          hasScrolledToHighlighted.current = true;
        }
      };
      const timeoutId = setTimeout(() => scrollToProduct(), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [highlightedProduct?.id, products.length]);

  // Fetch ALL products in one shot — re-runs only when filters change
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setProducts([]);

      const response = await getProducts({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        campus: selectedCampus !== 'all' ? selectedCampus : '',
        search: searchTerm || ''
      });

      const fetched = Array.isArray(response.products) ? response.products : [];
      setProducts(fetched);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedCampus, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Back to top button
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.pageYOffset > 1200);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!currentUser) { setError('User not found'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await upgradeUserToSeller(currentUser._id || String(currentUser.id), 'monthly');
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      if (!result.user) throw new Error('Seller activation response was incomplete.');
      setCurrentUser(result.user);
      localStorage.setItem('user_data', JSON.stringify(result.user));
      if (result.offers) setSellerOffers(result.offers);
      setShowUpgrade(false);
      setCurrentView('my-profile');
    } catch (error) {
      let errorMessage = 'Upgrade failed. Please try again.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleClaimOffer = useCallback(async (offer: SellerOffer) => {
    setClaimingOfferId(offer.id);
    setOfferError('');
    try {
      const result = await claimSellerOffer(offer.id);
      if (!result.user) throw new Error('The claimed offer did not return an updated account.');
      setCurrentUser(result.user);
      localStorage.setItem('user_data', JSON.stringify(result.user));
      setSellerOffers(current => current.filter(item => item.id !== offer.id));
      setClaimedOfferExpiry(result.claim?.expiresAt || result.user.subscriptionEndDate || null);
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Could not claim this offer.');
    } finally {
      setClaimingOfferId(null);
    }
  }, []);

  const visibleSellerOffer = useMemo(
    () => sellerOffers.find(offer => !dismissedOfferIds.includes(offer.id)) || null,
    [sellerOffers, dismissedOfferIds]
  );

  const handleDismissSellerOffer = useCallback(() => {
    if (visibleSellerOffer) {
      setDismissedOfferIds(current => [...current, visibleSellerOffer.id]);
    }
    setOfferError('');
  }, [visibleSellerOffer]);

  const handleOfferSuccessClose = useCallback(() => {
    setClaimedOfferExpiry(null);
    setCurrentView('add-product');
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('home');
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const fresh = await getCurrentUser();
        if (fresh) {
          setCurrentUser(fresh);
          localStorage.setItem('user_data', JSON.stringify(fresh));
          return fresh;
        }
      }
      return null;
    } catch (err) {
      console.warn('Failed to refresh user:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (currentView === 'home' && currentUser && currentUser.type === 'seller') {
      const needsCheck = !currentUser.subscribed;
      if (needsCheck) {
        const interval = setInterval(async () => {
          const fresh = await refreshCurrentUser();
          if (fresh && fresh.subscribed) clearInterval(interval);
        }, 10000);
        setTimeout(() => clearInterval(interval), 300000);
        return () => clearInterval(interval);
      }
    }
  }, [currentView, currentUser, refreshCurrentUser]);

  const handleLoginSuccess = useCallback((user: any, token?: string) => {
    setCurrentUser(user);
    try {
      if (token) localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
    } catch (e) { console.warn('Failed to persist session', e); }
    setShowLogin(false);
  }, []);

  const handleEditProduct = useCallback((updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  }, []);

  const handleDeleteProduct = useCallback((productId: number) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const UpgradeModal = useMemo(() => () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Upgrade to Seller Account</h2>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Seller Benefits:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Upload unlimited products and services</li>
            <li>• Direct customer communication</li>
            <li>• Analytics and insights</li>
            <li>• Priority listing placement</li>
          </ul>
        </div>
        <p className="text-lg font-semibold mb-1">Monthly Subscription: R25</p>
        <p className="text-sm text-gray-600 mb-4">
          Eligible free periods and discounts appear as separate offers and only start after you claim them.
        </p>
        <div className="flex gap-2">
          <button onClick={handleUpgrade} className="flex-1 bg-blue-600 text-white p-3 rounded hover:bg-blue-700">
            Continue
          </button>
          <button onClick={() => setShowUpgrade(false)} className="flex-1 bg-gray-300 p-3 rounded hover:bg-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  ), [handleUpgrade]);

  const handleNewMessage = useCallback((message: Message) => {
    if (!currentUser || !chatWith) return;
    const key = `${Math.min(currentUser.id, chatWith)}-${Math.max(currentUser.id, chatWith)}`;
    setMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), message] }));
  }, [currentUser, chatWith]);

  const handleLoadMessages = useCallback((loadedMessages: Message[]) => {
    if (!currentUser || !chatWith) return;
    const key = `${Math.min(currentUser.id, chatWith)}-${Math.max(currentUser.id, chatWith)}`;
    setMessages(prev => ({ ...prev, [key]: loadedMessages }));
  }, [currentUser, chatWith]);

  const getImageUrl = useCallback((product: Product) => {
    return getProductImageUrl(product, API_BASE || '');
  }, [API_BASE]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Skeleton — used as fallback inside LazyCard
  const ProductSkeleton = useMemo(() => () => (
    <div className={`product-card product-card-skeleton rounded-lg shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="product-media relative overflow-hidden">
        <div className={`absolute inset-0 w-full h-full shimmer ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className="absolute top-3 right-3 z-10 h-7 w-20 shimmer rounded-full" />
        <div className="absolute top-14 right-3 z-10 h-7 w-24 shimmer rounded-full" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="h-6 shimmer rounded flex-1" />
          <div className="h-6 w-16 shimmer rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 shimmer rounded w-full" />
          <div className="h-4 shimmer rounded w-4/5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 shimmer rounded" />
            <div className="h-4 w-28 shimmer rounded" />
          </div>
          <div className="h-4 w-8 shimmer rounded" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-12 shimmer rounded-lg w-full" />
          <div className="h-10 shimmer rounded-lg w-full" />
        </div>
      </div>
    </div>
  ), [darkMode]);

  // Full product card
  const ProductCard = useCallback(({ product, isHighlighted = false }: { product: Product; isHighlighted?: boolean }) => {
    const imageUrl = getImageUrl(product);
    const raw = (product as any).sellerWhatsApp || (product as any).seller?.whatsapp || (product as any).whatsapp || '';
    const normalized = normalizeSAPhoneNumber(raw);
    const waMessage = encodeURIComponent(`Hi ${product.sellerName || ''}, I'm interested in your listing "${product.title}".`);
    const waLink = normalized ? `https://wa.me/${normalized}?text=${waMessage}` : null;
    const whatsappRedirects = (product as any).whatsappRedirects || 0;
    const productIdRaw = (product as any)._id || product.id;
    const cleanProductId = productIdRaw ? String(productIdRaw) : '';

    const handleShare = async () => {
      try {
        const shareUrl = `${API_BASE}/p/${cleanProductId}`;
        if (navigator.share) {
          await navigator.share({ url: shareUrl, title: `${product.title} - R${product.price}`, text: `Check out "${product.title}" on FYC Marketplace` });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          showNotification({
            type: 'success',
            title: 'Link copied',
            message: 'The listing link is ready to share on WhatsApp, Facebook, or anywhere else.'
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      }
    };

    return (
      <div
        className={`product-card rounded-lg shadow-sm overflow-hidden hover:shadow-xl transition-shadow duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${isHighlighted ? 'ring-4 ring-orange-500 shadow-2xl' : ''}`}
        style={isHighlighted ? { borderColor: '#007aff', boxShadow: '0 0 0 4px rgba(216,255,79,.55), 0 24px 60px -38px rgba(16,17,15,.68)' } : undefined}
        id={isHighlighted ? 'highlighted-product' : undefined}
      >
        {isHighlighted && (
          <div className="shared-product-banner">
            <span style={{ fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star style={{ width: '0.85rem', height: '0.85rem' }} fill="currentColor" />
              Shared Product
            </span>
            <button onClick={() => setHighlightedProduct(null)} className="shared-product-close" aria-label="Close highlight">
              <X style={{ height: '1rem', width: '1rem' }} />
            </button>
          </div>
        )}

        <div className="product-media relative overflow-hidden group">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="product-image absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 cursor-pointer z-0"
                onClick={() => setMaximizedImage(imageUrl)}
                onError={(e) => {
                  const imgElement = e.currentTarget as HTMLImageElement;
                  if (!imgElement.src.includes('data:image')) {
                    imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }
                }}
              />
              <div className="product-image-overlay absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center cursor-pointer z-10" onClick={() => setMaximizedImage(imageUrl)}>
                <div className="product-enlarge opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Click to enlarge</span>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-400" />
            </div>
          )}

          {whatsappRedirects > 0 && (
            <div className="product-badge product-badge-trend absolute top-3 right-3 z-20 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5" title={`${whatsappRedirects} WhatsApp ${whatsappRedirects === 1 ? 'click' : 'clicks'}`}>
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{whatsappRedirects}</span>
            </div>
          )}

          {product.sellerVerified && (
            <div className="product-badge product-badge-verified absolute top-14 right-3 z-20 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" />
              <span className="text-xs font-semibold">Verified</span>
            </div>
          )}
        </div>

        <div className="product-body p-5">
          <div className="product-title-row flex justify-between items-start mb-3">
            <h3 className={`product-title text-lg font-semibold line-clamp-2 flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.title}</h3>
            <span className="product-price text-xl font-bold text-blue-600 ml-3 whitespace-nowrap">R{product.price}</span>
          </div>
          <p className={`product-description text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.description}</p>
          <div className="mobile-product-perks" aria-hidden="true">
            <div className="mobile-perk-box">
              <span>Campus pickup</span>
              <strong>{product.sellerCampus || 'Nearby'}</strong>
            </div>
            <div className="mobile-arrival-row">
              <MapPin className="h-4 w-4" />
              <span>Message seller to arrange collection</span>
            </div>
          </div>
          <div className={`product-meta flex items-center justify-between mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Useric className="h-4 w-4" />
                <span className="truncate max-w-[100px]">{product.sellerName}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[100px]">{product.sellerCampus}</span>
              </div>
            </div>
            {product.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="font-medium">{product.rating}</span>
              </div>
            )}
          </div>
          <div className="product-actions flex gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer noopener"
                onClick={async () => {
                  if (cleanProductId) trackWhatsAppClick(cleanProductId).catch(err => console.warn('Analytics tracking failed:', err));
                }}
                className="product-action product-action-primary flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Chat</span>
              </a>
            )}
            {cleanProductId && (
              <button type="button" onClick={handleShare} className="product-action product-action-secondary flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Share2 className="h-5 w-5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [getImageUrl, API_BASE, darkMode]);

  return (
    <div className={`app-shell min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`app-header shadow-sm border-b sticky top-0 z-40 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="brand-lockup flex items-center space-x-4 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img className="h-8 w-8" src={logo} alt="FYC Marketplace Logo" loading="eager" />
              <h1 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>FYC Marketplace</h1>
            </div>

            {currentUser ? (
              <div className="header-actions flex items-center space-x-2 md:space-x-4">
                <button onClick={() => setCurrentView('my-profile')} className="profile-trigger p-2 md:p-2 rounded-lg hover:bg-gray-100 transition-colors group" title="My Profile" aria-label="Open profile">
                  <Useric className="h-5 w-5 md:h-6 md:w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </button>
                {currentUser.type === 'seller' && currentUser.subscribed && (
                  <button onClick={() => setCurrentView('add-product')} className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm md:text-base">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Listing</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                )}
                {currentUser.type === 'admin' && (
                  <button onClick={() => setCurrentView('admin-reactivation')} style={{ backgroundColor: '#007aff', color: '#10110f', padding: '0.5rem 1rem', borderRadius: 0, border: '1px solid #007aff', cursor: 'pointer' }}>
                    Admin
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="logout-button"
                  style={{
                    backgroundColor: darkMode ? 'rgba(235,235,245,.1)' : 'rgba(118,118,128,.1)',
                    color: darkMode ? '#f5f5f7' : '#1d1d1f',
                    padding: '0.5rem 1rem',
                    borderRadius: 0,
                    border: darkMode ? '1px solid rgba(235,235,245,.18)' : '1px solid rgba(60,60,67,.18)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = darkMode ? 'rgba(235,235,245,.16)' : 'rgba(118,118,128,.16)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = darkMode ? 'rgba(235,235,245,.1)' : 'rgba(118,118,128,.1)'; }}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="logout-button-icon h-4 w-4" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="header-actions header-actions-public space-x-2">
                <button onClick={() => setShowLogin(true)} className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 text-sm md:text-base font-medium">Login</button>
                <button onClick={() => setShowRegister(true)} className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 text-sm md:text-base font-medium">Register</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {visibleSellerOffer && !claimedOfferExpiry && !appNotificationOpen && (
        <SellerOfferModal
          offer={visibleSellerOffer}
          claiming={claimingOfferId === visibleSellerOffer.id}
          error={offerError}
          onClaim={() => handleClaimOffer(visibleSellerOffer)}
          onClose={handleDismissSellerOffer}
        />
      )}
      {claimedOfferExpiry && (
        <SellerOfferSuccessModal
          expiresAt={claimedOfferExpiry}
          onClose={handleOfferSuccessClose}
        />
      )}

      <main className="marketplace-main flex-1 max-w-7xl mx-auto px-4 py-4">
        <Analytics />
        <SpeedInsights />
        <Suspense fallback={<LoadingFallback />}>
          {chatWith ? (
            <ChatWindow currentUser={currentUser} chatWith={chatWith} users={users} onCloseChat={() => setChatWith(null)} onNewMessage={handleNewMessage} onLoadMessages={handleLoadMessages} />
          ) : currentView === 'add-product' ? (
            currentUser?.type === 'seller' && currentUser?.subscribed ? (
              <AddProductForm currentUser={currentUser} onProductAdded={(newProduct) => { setProducts(prev => [newProduct, ...prev]); setCurrentView('home'); }} onCancel={() => setCurrentView('home')} />
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">You need a seller subscription to add listings.</p>
                <button onClick={() => setShowUpgrade(true)} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Upgrade to Seller Account</button>
              </div>
            )
          ) : currentView === 'my-products' ? (
            <SellerProducts currentUser={currentUser} onEditProduct={handleEditProduct} onDeleteProduct={handleDeleteProduct} onBack={() => setCurrentView('home')} onAddProduct={() => setCurrentView('add-product')} />
          ) : currentView === 'my-profile' ? (
            <UserProfile currentUser={currentUser} onLogout={handleLogout} onBack={() => setCurrentView('home')} onUserUpdate={(updatedUser) => { setCurrentUser(updatedUser); localStorage.setItem('user_data', JSON.stringify(updatedUser)); }} />
          ) : currentView === 'admin-reactivation' && currentUser?.type === 'admin' ? (
            <AdminReactivation darkMode={darkMode} />
          ) : currentView === 'about' ? (
            <AboutPage onBack={() => setCurrentView('home')} />
          ) : currentView === 'how-it-works' ? (
            <HowItWorksPage onBack={() => setCurrentView('home')} />
          ) : currentView === 'faq' ? (
            <FAQPage onBack={() => setCurrentView('home')} />
          ) : currentView === 'contact' ? (
            <ContactPage onBack={() => setCurrentView('home')} />
          ) : currentView === 'terms' ? (
            <TermsPage onBack={() => setCurrentView('home')} />
          ) : currentView === 'privacy' ? (
            <PrivacyPage onBack={() => setCurrentView('home')} />
          ) : (
            <>
              <div className="mobile-commerce-topbar" aria-label="Mobile marketplace controls">
                <button type="button" className="mobile-round-control" onClick={scrollToTop} aria-label="Back to top">
                  <ShoppingBag className="h-5 w-5" />
                </button>
                <div className="mobile-commerce-title">
                  {searchTerm ? searchTerm : 'Marketplace'}
                </div>
                <div className="mobile-commerce-pill">
                  <Search className="h-5 w-5" />
                  <button type="button" aria-label="Share marketplace" onClick={scrollToTop}>
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button type="button" aria-label="Focus filters" onClick={() => document.getElementById('category-filter')?.focus()}>
                    <SlidersHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="home-toolbar flex justify-between items-center mb-8">
                {currentUser?.type === 'seller' && (
                  <button onClick={() => setCurrentView('my-products')} style={{ backgroundColor: '#10110f', color: '#fbfaf6', padding: '0.5rem 1rem', borderRadius: 0, border: '1px solid rgba(16,17,15,.7)', cursor: 'pointer' }}>
                    My Products
                  </button>
                )}
              </div>

              {/* Highlighted shared product */}
              {highlightedProduct && (
                <div className="mb-8 scroll-mt-20">
                  <ProductCard product={highlightedProduct} isHighlighted={true} />
                </div>
              )}

              <section className="storefront-shell">
                <aside className={`filter-rail ${darkMode ? 'bg-gray-800' : 'bg-white'}`} aria-label="Marketplace filters">
                  <div className="filter-rail-header">
                    <div>
                      <span className="eyebrow">Browse</span>
                      <h2>Marketplace</h2>
                    </div>
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>

                  <div className="filter-group">
                    <label htmlFor="category-filter">Category</label>
                    <select id="category-filter" className={`filter-select px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="campus-filter">Campus</label>
                    <select id="campus-filter" className={`filter-select px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                      {campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                    </select>
                  </div>

                  <div className="filter-summary">
                    <span>{products.length}</span>
                    <small>{products.length === 1 ? 'listing available' : 'listings available'}</small>
                  </div>

                  <button type="button" className="clear-filters-button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </aside>

                <div className="storefront-content">
                  <div className={`browse-panel rounded-lg shadow-sm p-4 md:p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="browse-stack flex flex-col gap-4">
                      <div className="browse-row browse-row-primary flex flex-col md:flex-row gap-4">
                        <div className="search-field flex-1 relative">
                          <Search className={`absolute left-3 top-3 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                          <input
                            type="text"
                            placeholder="Search products, services, sellers..."
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className={`product-count text-sm font-semibold px-4 py-2 rounded-lg border w-full sm:w-auto text-center ${darkMode ? 'bg-blue-900 text-blue-200 border-blue-700' : 'bg-blue-50 text-gray-700 border-blue-200'}`}>
                          {products.length} {products.length === 1 ? 'product' : 'products'}
                        </div>
                      </div>
                      <div className="active-filters" aria-label="Active filters">
                        <span>{selectedCategoryName}</span>
                        <span>{selectedCampusName}</span>
                        {searchTerm && <span>{searchTerm}</span>}
                      </div>
                    </div>
                  </div>

                  {_loading ? (
                    <div className="product-grid grid grid-cols-2 gap-6">
                      {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                  ) : products.length > 0 ? (
                    <div className="product-grid grid grid-cols-2 gap-6">
                      {products.map(product => (
                        <LazyCard key={(product as any)._id || product.id} skeleton={<ProductSkeleton />}>
                          <ProductCard product={product} />
                        </LazyCard>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state text-center py-20">
                      <ShoppingBag className={`h-20 w-20 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>No products found matching your search.</p>
                      <p className={`mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </Suspense>
      </main>

      <Suspense fallback={<div className="h-20" />}>
        <Footer onNavigate={(view) => setCurrentView(view)} />
      </Suspense>

      <Suspense fallback={null}>
        {showLogin && (
          <LoginForm onLoginSuccess={handleLoginSuccess} onShowRegister={() => { setShowLogin(false); setShowRegister(true); }} onClose={() => setShowLogin(false)} />
        )}
        {showRegister && (
          <RegisterForm
            onRegisterSuccess={(user, token) => { setCurrentUser(user); if (token) localStorage.setItem('auth_token', token); localStorage.setItem('user_data', JSON.stringify(user)); setShowRegister(false); }}
            onShowLogin={() => { setShowRegister(false); setShowLogin(true); }}
            onClose={() => setShowRegister(false)}
          />
        )}
        {showUpgrade && <UpgradeModal />}
      </Suspense>

      {maximizedImage && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${darkMode ? 'bg-black bg-opacity-98' : 'bg-black bg-opacity-95'}`} onClick={() => setMaximizedImage(null)} style={{ cursor: 'pointer' }}>
          <div className="relative" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <button onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); }} className="absolute flex items-center justify-center text-white rounded-full transition-all z-50 hover:scale-110" aria-label="Close" style={{ cursor: 'pointer', top: '-20px', right: '-20px', width: '40px', height: '40px', backgroundColor: '#000000', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)' }}>
              <X style={{ width: '24px', height: '24px' }} />
            </button>
            <img src={maximizedImage ?? undefined} alt="Maximized view" className="object-contain rounded-lg" style={{ maxWidth: '90vw', maxHeight: '90vh', cursor: 'default' }} onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {showBackToTop && (
        <button onClick={scrollToTop} aria-label="Back to top" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, backgroundColor: '#007aff', color: '#10110f', padding: '1rem', borderRadius: 0, border: '1px solid #10110f', cursor: 'pointer', boxShadow: '0 14px 34px -20px rgba(16,17,15,.8)', transition: 'all 0.2s ease', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0062cc'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#007aff'; e.currentTarget.style.transform = 'translateY(0)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        >
          <ArrowUp style={{ width: '24px', height: '24px' }} />
        </button>
      )}

      <button onClick={toggleDarkMode} aria-label="Toggle dark mode"
        style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 9999, backgroundColor: darkMode ? '#007aff' : '#10110f', color: darkMode ? '#10110f' : '#007aff', padding: '1rem', borderRadius: 0, border: darkMode ? '1px solid #10110f' : '1px solid rgba(251,250,246,.28)', cursor: 'pointer', boxShadow: '0 14px 34px -20px rgba(16,17,15,.8)', transition: 'all 0.2s ease', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95) rotate(0deg)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)'; }}
      >
        {darkMode ? (
          <Sun style={{ width: '24px', height: '24px' }} />
        ) : (
          <Moon style={{ width: '24px', height: '24px' }} />
        )}
      </button>
    </div>
  );
};

export default App;
