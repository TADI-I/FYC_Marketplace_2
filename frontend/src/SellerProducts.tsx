import React, { useState, useEffect } from 'react';
import { Edit, Trash2, ArrowLeft, Plus, Loader, X, TrendingUp } from 'lucide-react';
import { User, Product, getProductId, getImageUrl as getProductImageUrl } from './types';
import ProductAnalytics from './ProductAnalytics';
import { deleteProduct, getProductsBySeller } from './api';


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
        console.log('📁 Adding new image to update:', {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size
        });
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('📤 Sending update request for product:', productId);

      // Use the correct endpoint without /api prefix (API_BASE already includes it)
      const response = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();
      console.log('📥 Update response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      // Fetch the updated product to get complete data
      const updatedProductResponse = await fetch(`${API_BASE}/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const updatedProductData = await updatedProductResponse.json();
      console.log('✅ Product updated successfully:', updatedProductData);

      const updatedProduct = {
        ...editingProduct,
        ...editFormData,
        price: parseFloat(editFormData.price),
        image: updatedProductData.product?.image || editingProduct.image,
        imageUrl: updatedProductData.product?.imageUrl || 
                 (updatedProductData.product?.image?.id ? `${API_BASE}/images/${updatedProductData.product.image.id}` : null)
      };

      setProducts(prev => prev.map(p => 
        getProductId(p) === productId ? updatedProduct : p
      ));
      
      onEditProduct(updatedProduct);
      handleCancelEdit();
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Failed to update product. Please try again.';
      console.error('❌ Update failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (product: Product) => {
    const productId = getProductId(product);
    
    if (!productId) {
      alert('Invalid product. Please try again.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => getProductId(p) !== productId));
      const numericId = product.id || parseInt(productId) || 0;
      onDeleteProduct(numericId);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete product. Please try again.';
      alert(errorMessage);
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
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-10 sm:py-20">
          <Loader className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-base sm:text-lg">Loading your products...</span>
        </div>
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
          href="https://wa.me/27711126204?text=Hi%2C%20I%20need%20support%20with%20FYC%20Marketplace"
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">My Products</h1>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs sm:text-sm">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={onAddProduct}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold">Edit Product</h2>
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Image Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image (Optional - will be stored in database)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JPEG, PNG, WebP accepted. Max 5MB. Image will be stored securely in database.
                    </p>
                  </div>
                  
                  {imagePreview && (
                    <div className="relative flex-shrink-0">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{
                          width: '7rem',
                          height: '7rem',
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          border: '1px solid #ccc'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={loading}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Product/Service Title"
                  className="p-3 border rounded text-base"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={loading}
                />
                <select 
                  className="p-3 border rounded text-base" 
                  value={editFormData.category}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                  disabled={loading}
                >
                  <option value="">Select Category</option>
                  <option value="books">Books</option>
                  <option value="electronics">Electronics</option>
                  <option value="services">Services</option>
                  <option value="clothing">Clothing</option>
                  <option value="food">Food</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <textarea
                placeholder="Detailed description, cell number, location, delivery options, etc."
                className="w-full p-3 border rounded mb-4 text-base"
                rows={4}
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={loading}
              />
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <input
                  type="number"
                  placeholder="Price (R)"
                  className="p-3 border rounded text-base"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <select 
                  className="p-3 border rounded text-base" 
                  value={editFormData.type}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                  disabled={loading}
                >
                  <option value="product">Physical Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleUpdateProduct}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Product'
                  )}
                </button>
                <button 
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="bg-gray-300 px-6 py-3 rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal - NEW */}
      {viewingAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold">Product Analytics</h2>
              <button
                onClick={() => setViewingAnalytics(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <ProductAnalytics 
                productId={viewingAnalytics}
                productTitle={products.find(p => getProductId(p) === viewingAnalytics)?.title || ''}
              />
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-12 text-center">
          <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📦</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-600 mb-2">No products yet</h3>
          <p className="text-gray-500 mb-4 text-sm sm:text-base">Start by adding your first product listing!</p>
          <button 
            onClick={onAddProduct}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map(product => {
            const imageUrl = getImageUrl(product);
            return (
              <div key={getProductId(product)} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 flex flex-col h-full">
                <div className="flex-shrink-0 h-40 sm:h-48 overflow-hidden">
                  {imageUrl ? (
                    <img 
                      src={imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => setMaximizedImage(imageUrl)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="p-3 sm:p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-base sm:text-lg line-clamp-2 flex-1 min-h-[2.5rem]">
                      {product.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      product.type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {product.type}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-grow">
                    {product.description}
                  </p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-600 text-base">R{product.price}</span>
                    <span className="text-xs text-gray-500 capitalize">{product.category}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-auto">
                    {/* Analytics Button - NEW */}
                    <button 
                      onClick={() => setViewingAnalytics(getProductId(product) || null)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 px-1 rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-sm"
                      title="View Analytics"
                    >
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Stats</span>
                    </button>

                    {/* Edit button */}
                    <button 
                      onClick={() => handleEditClick(product)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 px-1 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Edit</span>
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteClick(product)}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        backgroundColor: loading ? '#f87171' : '#000000',
                        color: 'white',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#b91c1c';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#000000';
                        }
                      }}
                    >
                      <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Maximization Modal */}
      {maximizedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={() => setMaximizedImage(null)}
          style={{ cursor: 'pointer' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedImage(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 rounded-full transition-all z-50 shadow-lg"
            aria-label="Close"
            style={{ cursor: 'pointer' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={maximizedImage}
            alt="Maximized view"
            className="object-contain"
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '90vh',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default SellerProducts;
