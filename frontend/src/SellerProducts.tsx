import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Image as ImageIcon, Loader2, PackageOpen, Plus, Trash2, TrendingUp, UploadCloud, X } from 'lucide-react';
import { User, Product, getProductId, getImageUrl as getProductImageUrl } from './types';
import ProductAnalytics from './ProductAnalytics';
import { deleteProduct, getProductsBySeller } from './api';
import { showConfirmation, showNotification } from './AppNotificationModal';
import { CardGridSkeleton } from './LoadingSkeletons';
import { supportWhatsAppUrl } from './siteConfig';
import { MARKETPLACE_CATEGORIES } from './marketplaceData';


interface SellerProductsProps {
  currentUser: User | null;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  onBack: () => void;
  onAddProduct: () => void;
}

const SellerProducts: React.FC<SellerProductsProps> = ({
  currentUser,
  onEditProduct,
  onDeleteProduct,
  onBack,
  onAddProduct
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    type: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);
  const [showSupportTooltip, setShowSupportTooltip] = useState(false);
  const [viewingAnalytics, setViewingAnalytics] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_API_BASE;

  // Show support tooltip after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSupportTooltip(true);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setShowSupportTooltip(false);
      }, 10000);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchSellerProducts = async () => {
      if (!currentUser?._id) {
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        setError('');
        const sellerProducts = await getProductsBySeller(currentUser._id.toString());
        const sortedProducts = sellerProducts.sort((a: Product, b: Product) => a.title.localeCompare(b.title));
        setProducts(sortedProducts);
      } catch (err) {
        setError('Failed to load your products. Please try again.');
        showNotification({ type: 'error', title: 'Products could not be loaded', message: 'Refresh the page to try again.' });
      } finally {
        setFetching(false);
      }
    };

    fetchSellerProducts();
  }, [currentUser]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      type: product.type
    });
    
    // Set existing image as preview
    const existingImageUrl = getImageUrl(product);
    if (existingImageUrl) {
      setImagePreview(existingImageUrl);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      type: ''
    });
    setImageFile(null);
    setImagePreview('');
    setError('');
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const productId = getProductId(editingProduct);
    if (!productId) {
      setError('Invalid product ID');
      return;
    }

    if (!editFormData.title || !editFormData.description || !editFormData.price || !editFormData.category) {
      setError('Please fill all required fields.');
      return;
    }

    if (parseFloat(editFormData.price) <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', editFormData.title);
      formData.append('description', editFormData.description);
      formData.append('price', editFormData.price);
      formData.append('category', editFormData.category);
      formData.append('type', editFormData.type);

      // Add new image if selected
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      // Fetch the updated product to get complete data
      const updatedProductResponse = await fetch(`${API_BASE}/api/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const updatedProductData = await updatedProductResponse.json();
      const updatedProduct = {
        ...editingProduct,
        ...editFormData,
        price: parseFloat(editFormData.price),
        image: updatedProductData.product?.image || editingProduct.image,
        imageUrl: updatedProductData.product?.imageUrl || 
                 (updatedProductData.product?.image?.id ? `${API_BASE}/api/images/${updatedProductData.product.image.id}` : null)
      };

      setProducts(prev => prev.map(p => 
        getProductId(p) === productId ? updatedProduct : p
      ));
      
      onEditProduct(updatedProduct);
      handleCancelEdit();
      showNotification({ type: 'success', title: 'Listing updated', message: `${updatedProduct.title} now shows your latest changes.` });
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Failed to update product. Please try again.';
      console.error('Update failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (product: Product) => {
    const productId = getProductId(product);
    
    if (!productId) {
      showNotification({ type: 'error', title: 'Invalid product', message: 'This product could not be identified. Please refresh and try again.' });
      return;
    }

    const confirmed = await showConfirmation({
      type: 'warning',
      title: 'Delete this product?',
      message: `“${product.title}” will be permanently removed. This action cannot be undone.`,
      confirmLabel: 'Delete product',
      cancelLabel: 'Keep product'
    });
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => getProductId(p) !== productId));
      const numericId = product.id || parseInt(productId) || 0;
      onDeleteProduct(numericId);
      showNotification({ type: 'success', title: 'Listing deleted', message: `${product.title} was removed from the marketplace.` });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete product. Please try again.';
      showNotification({ type: 'error', title: 'Product could not be deleted', message: errorMessage, actionLabel: 'Try again' });
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (product: Product) => {
    return getProductImageUrl(product, API_BASE || '');
  };

  if (!currentUser || currentUser.type !== 'seller') {
    return (
      <div className="apple-page max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 text-center">
          <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">You need to be a seller to access this page.</p>
          <button 
            onClick={onBack}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="apple-page max-w-6xl mx-auto p-4 sm:p-6">
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="apple-page seller-products-page max-w-6xl mx-auto p-4 sm:p-6">
      {/* WhatsApp Support Button - Fixed at bottom right */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        {/* Tooltip that appears after 30 seconds */}
        {showSupportTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: '75px',
              right: '0',
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              width: '280px',
              animation: 'slideIn 0.5s ease-out',
              border: '2px solid #007aff'
            }}
          >
            <button
              onClick={() => setShowSupportTooltip(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                fontSize: '20px',
                lineHeight: '1',
                padding: '4px'
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: '#007aff',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg 
                  style={{ width: '24px', height: '24px', color: 'white' }}
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Need help?
                </h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                  Chat with our support team on WhatsApp. We're here to help!
                </p>
              </div>
            </div>
            {/* Pointer arrow */}
            <div
              style={{
                position: 'absolute',
                bottom: '-10px',
                right: '20px',
                width: '0',
                height: '0',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '10px solid #007aff'
              }}
            />
          </div>
        )}

        <a
          href={supportWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'relative',
            display: 'flex',
            backgroundColor: '#007aff',
            color: 'white',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = '#0062cc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#007aff';
          }}
          onClick={() => setShowSupportTooltip(false)}
          title="Contact Support on WhatsApp"
        >
          <svg 
            style={{ width: '32px', height: '32px' }}
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      </div>

      {/* Add keyframe animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <header className="seller-products-heading">
        <div className="seller-products-heading-copy">
          <button type="button" onClick={onBack} className="seller-products-back">
            <ArrowLeft aria-hidden="true" />
            Marketplace
          </button>
          <p className="listing-eyebrow">Seller workspace</p>
          <div className="seller-products-title-row">
            <h1>Manage products</h1>
            <span className="seller-products-count">{products.length} {products.length === 1 ? 'listing' : 'listings'}</span>
          </div>
          <p>Keep your listings accurate, review buyer interest, and manage what is currently visible.</p>
        </div>
        <button type="button" onClick={onAddProduct} disabled={loading} className="seller-products-add">
          <Plus aria-hidden="true" />
          Add listing
        </button>
      </header>

      {error && !editingProduct && <div className="listing-banner listing-banner-error" role="alert">{error}</div>}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="seller-modal-layer" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget && !loading) handleCancelEdit();
        }}>
          <section className="seller-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title" aria-describedby="edit-product-description">
            <header className="seller-modal-header">
              <div>
                <p className="listing-eyebrow">Listing editor</p>
                <h2 id="edit-product-title">Edit product</h2>
                <p id="edit-product-description">Update the information buyers see in the marketplace.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                className="seller-modal-close"
                aria-label="Close product editor"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <form className="seller-edit-form" onSubmit={event => { event.preventDefault(); handleUpdateProduct(); }} noValidate>
              {error && (
                <div className="listing-banner listing-banner-error" role="alert">
                  {error}
                </div>
              )}

              <section className="seller-edit-section" aria-labelledby="edit-image-title">
                <div className="seller-edit-section-heading">
                  <div className="seller-edit-section-icon"><ImageIcon aria-hidden="true" /></div>
                  <div><h3 id="edit-image-title">Listing image</h3><p>Choose a clear image that represents the item or service.</p></div>
                </div>
                <div className="seller-image-editor">
                  {imagePreview && (
                    <div className="seller-image-preview">
                      <img src={imagePreview} alt="Current listing preview" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={loading}
                        className="seller-image-remove"
                        aria-label="Remove selected image"
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {!imagePreview && <div className="seller-image-placeholder"><ImageIcon aria-hidden="true" /><span>No image selected</span></div>}
                  <div className="seller-image-controls">
                    <label className="seller-file-picker">
                      <UploadCloud aria-hidden="true" />
                      <span>{imagePreview ? 'Replace image' : 'Choose image'}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} disabled={loading} />
                    </label>
                    <p>JPEG, PNG, WebP or GIF. Maximum file size 5 MB.</p>
                  </div>
                </div>
              </section>

              <section className="seller-edit-section" aria-labelledby="edit-details-title">
                <div className="seller-edit-section-heading">
                  <div className="seller-edit-section-number">02</div>
                  <div><h3 id="edit-details-title">Listing details</h3><p>Use clear, specific information that is easy to scan.</p></div>
                </div>
                <div className="seller-edit-fields">
                  <div className="listing-field seller-edit-wide">
                    <label htmlFor="edit-product-name">Title <span>Required</span></label>
                    <input id="edit-product-name" type="text" value={editFormData.title} onChange={event => setEditFormData(current => ({ ...current, title: event.target.value }))} disabled={loading} placeholder="e.g. Scientific calculator" />
                  </div>
                  <div className="listing-field">
                    <label htmlFor="edit-product-category">Category <span>Required</span></label>
                    <select id="edit-product-category" value={editFormData.category} onChange={event => setEditFormData(current => ({ ...current, category: event.target.value }))} disabled={loading}>
                      <option value="">Choose a category</option>{MARKETPLACE_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="listing-field">
                    <label htmlFor="edit-product-type">Listing type <span>Required</span></label>
                    <select id="edit-product-type" value={editFormData.type} onChange={event => setEditFormData(current => ({ ...current, type: event.target.value }))} disabled={loading}>
                      <option value="product">Physical product</option><option value="service">Service</option>
                    </select>
                  </div>
                  <div className="listing-field seller-edit-wide">
                    <label htmlFor="edit-product-description">Description <span>Required</span></label>
                    <textarea id="edit-product-description" rows={6} value={editFormData.description} onChange={event => setEditFormData(current => ({ ...current, description: event.target.value }))} disabled={loading} placeholder="Include condition, collection or delivery details, and anything the buyer should know." />
                    <div className="listing-field-meta"><span>Clear details lead to better enquiries.</span><span>{editFormData.description.length} characters</span></div>
                  </div>
                  <div className="listing-field">
                    <label htmlFor="edit-product-price">Price in rand <span>Required</span></label>
                    <div className="listing-price-input"><span>R</span><input id="edit-product-price" type="number" value={editFormData.price} onChange={event => setEditFormData(current => ({ ...current, price: event.target.value }))} min="0.01" step="0.01" inputMode="decimal" disabled={loading} placeholder="0.00" /></div>
                  </div>
                </div>
              </section>

              <footer className="seller-modal-actions">
                <button type="button" onClick={handleCancelEdit} disabled={loading} className="listing-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="listing-primary">
                  {loading ? <><Loader2 className="listing-spinner" aria-hidden="true" /> Saving changes…</> : 'Save changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Analytics Modal - NEW */}
      {viewingAnalytics && (
        <div className="seller-modal-layer" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setViewingAnalytics(null);
        }}>
          <section className="seller-analytics-modal" role="dialog" aria-modal="true" aria-labelledby="product-analytics-title">
            <header className="seller-modal-header">
              <div><p className="listing-eyebrow">Listing performance</p><h2 id="product-analytics-title">Product analytics</h2><p>See how buyers are engaging with this listing.</p></div>
              <button
                type="button"
                onClick={() => setViewingAnalytics(null)}
                className="seller-modal-close"
                aria-label="Close product analytics"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="seller-analytics-body">
              <ProductAnalytics 
                productId={viewingAnalytics}
                productTitle={products.find(p => getProductId(p) === viewingAnalytics)?.title || ''}
              />
            </div>
          </section>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <section className="seller-products-empty">
          <div className="seller-products-empty-icon"><PackageOpen aria-hidden="true" /></div>
          <h2>No listings yet</h2>
          <p>Create your first listing to make it visible to buyers.</p>
          <button type="button" onClick={onAddProduct} disabled={loading} className="seller-products-add"><Plus aria-hidden="true" />Create first listing</button>
        </section>
      ) : (
        <div className="seller-products-grid">
          {products.map(product => {
            const imageUrl = getImageUrl(product);
            return (
              <article key={getProductId(product)} className="seller-product-card">
                <button type="button" className="seller-product-media" onClick={() => imageUrl && setMaximizedImage(imageUrl)} disabled={!imageUrl} aria-label={imageUrl ? `View ${product.title} image` : undefined}>
                  {imageUrl ? (
                    <img 
                      src={imageUrl}
                      alt={product.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                      }}
                    />
                  ) : (
                    <span className="seller-product-image-empty"><ImageIcon aria-hidden="true" />No image</span>
                  )}
                </button>
                
                <div className="seller-product-body">
                  <div className="seller-product-card-heading">
                    <h2>{product.title}</h2>
                    <span>{product.type === 'service' ? 'Service' : 'Product'}</span>
                  </div>
                  <p className="seller-product-description">{product.description}</p>
                  <div className="seller-product-meta">
                    <strong>R{Number(product.price).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>
                    <span>{product.category}</span>
                  </div>
                  <div className="seller-product-actions">
                    <button type="button" onClick={() => setViewingAnalytics(getProductId(product) || null)} disabled={loading} className="seller-card-action"><TrendingUp aria-hidden="true" />Analytics</button>
                    <button type="button" onClick={() => handleEditClick(product)} disabled={loading} className="seller-card-action seller-card-action-primary"><Edit3 aria-hidden="true" />Edit</button>
                    <button type="button" onClick={() => handleDeleteClick(product)} disabled={loading} className="seller-card-delete" aria-label={`Delete ${product.title}`} title="Delete listing"><Trash2 aria-hidden="true" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Image Maximization Modal */}
      {maximizedImage && (
        <div 
          className="seller-image-lightbox"
          onClick={() => setMaximizedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Listing image preview"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedImage(null);
            }}
            className="seller-lightbox-close"
            aria-label="Close image preview"
          >
            <X aria-hidden="true" />
          </button>
          <img
            src={maximizedImage}
            alt="Full-size listing"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default SellerProducts;
