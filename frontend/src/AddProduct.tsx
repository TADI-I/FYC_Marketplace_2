import React, { useState } from "react";

type Product = {
  id: number;
  _id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerId: number;
  sellerName: string;
  sellerCampus: string;
  image: any; // Changed to handle GridFS reference
  rating: number;
  type: string;
  imageUrl?: string; // Added for frontend display
};

type User = {
  id: number;
  name: string;
  email: string;
  type: string;
  subscribed: boolean;
  campus: string;
};

type Category = {
  id: string;
  name: string;
};

interface AddProductFormProps {
  currentUser: User | null;
  onProductAdded: (product: Product) => void;
  onCancel: () => void;
}

const categories: Category[] = [
  { id: 'all', name: 'All Items' },
  { id: 'books', name: 'Books' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'services', name: 'Services' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'food', name: 'Food' },
  { id: 'other', name: 'Other' }
];

const AddProductForm: React.FC<AddProductFormProps> = ({ currentUser, onProductAdded, onCancel }) => {
  const API_BASE = process.env.REACT_APP_API_BASE;
  
  const [productData, setProductData] = useState({
    title: '', 
    description: '', 
    price: '', 
    category: '', 
    type: 'product'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Disable all inputs if seller account is not active
  const isSeller = currentUser?.type === 'seller';
  const canPost = isSeller && (currentUser?.subscribed === true);
  const disabledMessage = isSeller && !canPost
    ? 'Your seller account is not active. Please renew or request reactivation from the profile page before adding listings.'
    : null;
 
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      if (!canPost) {
        setError('Cannot add image while seller account is inactive.');
        return;
      }
 
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
 
      setImageFile(file);
      setError('');
 
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
 
  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };
 
  const handleAddProduct = async () => {
    if (!canPost) {
      setError('Your seller account is not active. Please update your account before adding listings.');
      return;
    }
    if (!currentUser) {
      setError('You must be logged in to add a product');
      return;
    }
 
    if (!productData.title || !productData.description || !productData.price || !productData.category) {
      setError('Please fill all required fields.');
      return;
    }
 
    if (parseFloat(productData.price) <= 0) {
      setError('Price must be greater than 0');
      return;
    }
 
    setLoading(true);
    setError('');
 
    try {
      // Create FormData for multipart form upload
      const formData = new FormData();
      
      // Add product data fields
      formData.append('title', productData.title);
      formData.append('description', productData.description);
      formData.append('price', productData.price);
      formData.append('category', productData.category);
      formData.append('type', productData.type);
      // Don't need to send sellerName/sellerCampus - backend gets from token
      
      // Add image file if selected
      if (imageFile) {
        formData.append('image', imageFile);
        console.log('📁 Adding image file to GridFS:', {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size
        });
      }
 
      // If somehow posting while disabled, prevent
      if (!canPost) {
        throw new Error('Account inactive');
      }
 
      // Get auth token
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
 
      console.log('📤 Sending FormData to GridFS backend...');
 
      // Send FormData to backend
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it
        },
        body: formData,
      });
 
      const data = await response.json();
      console.log('📥 Backend response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to create product`);
      }
 
      console.log('✅ Product added successfully with GridFS image:', data);
      
      // Add imageUrl to product for frontend display
      const productWithImageUrl = {
        ...data.product,
        imageUrl: data.product.imageUrl || 
                 (data.product.image?.id ? `${API_BASE}/api/images/${data.product.image.id}` : null)
      };
      
      // Call the parent callback with the created product
      onProductAdded(productWithImageUrl);
      
      // Reset form
      setProductData({ title: '', description: '', price: '', category: '', type: 'product' });
      setImageFile(null);
      setImagePreview('');
      
    } catch (error) {
      console.error('❌ Failed to add product:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to add product. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
 
  const handleInputChange = (field: string, value: string) => {
    setProductData(prev => ({ ...prev, [field]: value }));
  };
 
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Add New Product/Service</h2>
      
      {disabledMessage && (
        <div className="bg-gray-50 border border-gray-300 text-gray-800 px-4 py-3 rounded mb-4">
          <p className="font-medium mb-2">Seller account inactive</p>
          <p className="text-sm">{disabledMessage}</p>
          <div className="mt-3">
            <button
              onClick={onCancel}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Go to Profile
            </button>
          </div>
        </div>
      )}
       
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
              // fully disable file selection if account inactive
              aria-disabled={!canPost}
              tabIndex={canPost ? 0 : -1}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, WebP accepted. Max 5MB. Image will be stored securely in database.
            </p>
          </div>
          
          {imagePreview && (
            <div className="relative">
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
          className="p-3 border rounded"
          value={productData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          disabled={loading || !canPost}
        />
        <select 
          className="p-3 border rounded" 
          value={productData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          disabled={loading || !canPost}
        >
          <option value="">Select Category</option>
          {categories.slice(1).map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      
      <textarea
        placeholder="Detailed description, delivery options, etc."
        className="w-full p-3 border rounded mb-4"
        rows={4}
        value={productData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        disabled={loading || !canPost}
      />
      
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <input
          type="number"
          placeholder="Price (R)"
          className="p-3 border rounded"
          value={productData.price}
          onChange={(e) => handleInputChange('price', e.target.value)}
          min="0"
          step="0.01"
          disabled={loading || !canPost}
        />
        <select 
          className="p-3 border rounded" 
          value={productData.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          disabled={loading || !canPost}
        >
          <option value="product">Physical Product</option>
          <option value="service">Service</option>
        </select>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={handleAddProduct} 
          disabled={loading || !canPost}
          className="bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Adding...
            </>
          ) : (
            'Add Listing'
          )}
        </button>
        <button 
          onClick={onCancel} 
          disabled={loading}
          className="bg-gray-300 px-6 py-3 rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
export default AddProductForm;
