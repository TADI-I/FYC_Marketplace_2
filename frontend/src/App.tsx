import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import { ShoppingBag, Plus, Search, User as Useric, Star, Filter, Locate, TrendingUp, MessageCircle, X } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { User, Product, Message, MessageMap, Category, Campus, getImageUrl as getProductImageUrl, normalizeSAPhoneNumber } from './types';
import logo from './assets/facicon.jpeg';

import './App.css';
import {
  logoutUser,
  getProducts,
  getCurrentUser,
  upgradeUserToSeller,
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
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
      console.log(`✅ Fetched ${fetched.length} products`);
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
      await upgradeUserToSeller(currentUser.id, 'monthly');
      const updatedUser = {
        ...currentUser,
        type: 'seller',
        subscribed: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setShowUpgrade(false);
      setTimeout(() => alert('Congratulations! Your account has been upgraded to a seller account.'), 100);
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
      const needsCheck = currentUser.subscriptionStatus === 'expired' || !currentUser.subscribed;
      if (needsCheck) {
        const interval = setInterval(async () => {
          const fresh = await refreshCurrentUser();
          if (fresh && fresh.subscribed && fresh.subscriptionStatus === 'active') clearInterval(interval);
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
        <p className="text-lg font-semibold mb-4">Monthly Subscription: R25</p>
        <div className="flex gap-2">
          <button onClick={handleUpgrade} className="flex-1 bg-orange-600 text-white p-3 rounded hover:bg-orange-700">Subscribe Now</button>
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
    <div className={`rounded-lg shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="relative overflow-hidden" style={{ height: '20rem' }}>
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
          alert('Link copied! Share it on WhatsApp, Facebook, or anywhere.');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      }
    };

    return (
      <div
        className={`rounded-lg shadow-sm overflow-hidden hover:shadow-xl transition-shadow duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${isHighlighted ? 'ring-4 ring-orange-500 shadow-2xl' : ''}`}
        id={isHighlighted ? 'highlighted-product' : undefined}
      >
        {isHighlighted && (
          <div style={{ background: 'linear-gradient(to right, #f97316, #ea580c)', color: 'white', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg style={{ width: '0.75rem', height: '0.75rem' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Shared Product
            </span>
            <button onClick={() => setHighlightedProduct(null)} style={{ borderRadius: '9999px', padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }} aria-label="Close highlight">
              <X style={{ height: '1rem', width: '1rem' }} />
            </button>
          </div>
        )}

        <div className="relative overflow-hidden group" style={{ height: '20rem' }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 cursor-pointer z-0"
                onClick={() => setMaximizedImage(imageUrl)}
                onError={(e) => {
                  const imgElement = e.currentTarget as HTMLImageElement;
                  if (!imgElement.src.includes('data:image')) {
                    imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center cursor-pointer z-10" onClick={() => setMaximizedImage(imageUrl)}>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Click to enlarge</span>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {whatsappRedirects > 0 && (
            <div className="absolute top-3 right-3 z-20 bg-green-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5" title={`${whatsappRedirects} WhatsApp ${whatsappRedirects === 1 ? 'click' : 'clicks'}`}>
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{whatsappRedirects}</span>
            </div>
          )}

          {product.sellerVerified && (
            <div className="absolute top-14 right-3 z-20 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold">Verified</span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <h3 className={`text-lg font-semibold line-clamp-2 flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.title}</h3>
            <span className="text-xl font-bold text-green-600 ml-3 whitespace-nowrap">R{product.price}</span>
          </div>
          <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.description}</p>
          <div className={`flex items-center justify-between mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Useric className="h-4 w-4" />
                <span className="truncate max-w-[100px]">{product.sellerName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Locate className="h-4 w-4" />
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
          <div className="flex gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer noopener"
                onClick={async () => {
                  if (cleanProductId) trackWhatsAppClick(cleanProductId).catch(err => console.warn('Analytics tracking failed:', err));
                }}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:bg-green-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Chat</span>
              </a>
            )}
            {cleanProductId && (
              <button type="button" onClick={handleShare} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [getImageUrl, API_BASE, darkMode]);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`shadow-sm border-b sticky top-0 z-40 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img className="h-8 w-8" src={logo} alt="FYC Marketplace Logo" loading="eager" />
              <h1 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>FYC Marketplace</h1>
            </div>

            {currentUser ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                <button onClick={() => setCurrentView('my-profile')} className="p-2 md:p-2 rounded-lg hover:bg-gray-100 transition-colors group" title="My Profile">
                  <Useric className="h-5 w-5 md:h-6 md:w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </button>
                {currentUser.type === 'seller' && currentUser.subscribed && (
                  <button onClick={() => setCurrentView('add-product')} className="bg-orange-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 text-sm md:text-base">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Listing</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                )}
                {currentUser.type === 'admin' && (
                  <button onClick={() => setCurrentView('admin-reactivation')} style={{ backgroundColor: '#029002ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                    Admin
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.3s ease' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef4444'; }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-x-2">
                <button onClick={() => setShowLogin(true)} className="bg-orange-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-orange-700 text-sm md:text-base font-medium">Login</button>
                <button onClick={() => setShowRegister(true)} className="bg-orange-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-orange-700 text-sm md:text-base font-medium">Register</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
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
                <button onClick={() => setShowUpgrade(true)} className="mt-4 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700">Upgrade to Seller Account</button>
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
              <div className="flex justify-between items-center mb-8">
                {currentUser?.type === 'seller' && (
                  <button onClick={() => setCurrentView('my-products')} style={{ backgroundColor: '#ef8b44ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
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

              {/* Filters */}
              <div className={`rounded-lg shadow-sm p-4 md:p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className={`absolute left-3 top-3 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        placeholder="Search products and services..."
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className={`h-5 w-5 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <select className={`flex-1 sm:flex-initial px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                        {campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                      </select>
                      <span className={`text-sm hidden lg:inline whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by campus</span>
                    </div>
                    <div className={`text-sm font-semibold px-4 py-2 rounded-lg border w-full sm:w-auto text-center ${darkMode ? 'bg-orange-900 text-orange-200 border-orange-700' : 'bg-orange-50 text-gray-700 border-orange-200'}`}>
                      {products.length} {products.length === 1 ? 'product' : 'products'} available
                    </div>
                  </div>
                </div>
              </div>

              {/* Product grid */}
              {_loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
                </div>
              ) : products.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <LazyCard key={(product as any)._id || product.id} skeleton={<ProductSkeleton />}>
                      <ProductCard product={product} />
                    </LazyCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <ShoppingBag className={`h-20 w-20 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>No products found matching your search.</p>
                  <p className={`mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your filters or search terms</p>
                </div>
              )}
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
            <button onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); }} className="absolute flex items-center justify-center text-white rounded-full transition-all z-50 hover:scale-110" aria-label="Close" style={{ cursor: 'pointer', top: '-20px', right: '-20px', width: '40px', height: '40px', backgroundColor: '#dc2626', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)' }}>
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={maximizedImage ?? undefined} alt="Maximized view" className="object-contain rounded-lg" style={{ maxWidth: '90vw', maxHeight: '90vh', cursor: 'default' }} onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {showBackToTop && (
        <button onClick={scrollToTop} aria-label="Back to top" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, backgroundColor: '#ea580c', color: 'white', padding: '1rem', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(234,88,12,0.5)', transition: 'all 0.3s ease', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c2410c'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ea580c'; e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      <button onClick={toggleDarkMode} aria-label="Toggle dark mode"
        style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 9999, backgroundColor: darkMode ? '#fbbf24' : '#1f2937', color: darkMode ? '#1f2937' : '#fbbf24', padding: '1rem', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: darkMode ? '0 10px 25px rgba(251,191,36,0.5)' : '0 10px 25px rgba(31,41,55,0.5)', transition: 'all 0.3s ease', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95) rotate(0deg)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)'; }}
      >
        {darkMode ? (
          <svg style={{ width: '24px', height: '24px' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg style={{ width: '24px', height: '24px' }} fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default App;