import React, { useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import { showNotification } from './AppNotificationModal';
import type { User } from './types';

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
  image: any;
  rating: number;
  type: string;
  imageUrl?: string;
};

interface AddProductFormProps {
  currentUser: User | null;
  onProductAdded: (product: Product) => void;
  onCancel: () => void;
}

const categories = [
  { id: 'books', name: 'Books' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'services', name: 'Services' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'food', name: 'Food' },
  { id: 'other', name: 'Other' }
];

type FieldErrors = Partial<Record<'title' | 'description' | 'price' | 'category' | 'image', string>>;

const AddProductForm: React.FC<AddProductFormProps> = ({ currentUser, onProductAdded, onCancel }) => {
  const API_BASE = process.env.REACT_APP_API_BASE;
  const [productData, setProductData] = useState({ title: '', description: '', price: '', category: '', type: 'product' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const canPost = currentUser?.type === 'seller' && currentUser.subscribed === true;
  const disabledMessage = currentUser?.type === 'seller' && !canPost
    ? 'Your seller account is inactive. Renew or reactivate it from your profile before creating a listing.'
    : null;

  const setField = (field: keyof typeof productData, value: string) => {
    setProductData(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setFieldErrors(current => ({ ...current, image: 'Choose a JPEG, PNG, WebP, or GIF image.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(current => ({ ...current, image: 'The image must be smaller than 5 MB.' }));
      return;
    }
    setImageFile(file);
    setFieldErrors(current => ({ ...current, image: undefined }));
    const reader = new FileReader();
    reader.onload = loadEvent => setImagePreview(String(loadEvent.target?.result || ''));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!productData.title.trim()) next.title = 'Add a clear listing title.';
    if (!productData.description.trim()) next.description = 'Describe what you are offering.';
    if (!productData.category) next.category = 'Choose a category.';
    const price = Number(productData.price);
    if (!productData.price || !Number.isFinite(price) || price <= 0) next.price = 'Enter a price greater than R0.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (!canPost) return setError('Your seller account must be active before you can add a listing.');
    if (!currentUser) return setError('Sign in as a seller to add a listing.');
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      Object.entries(productData).forEach(([key, value]) => body.append(key, value.trim()));
      if (imageFile) body.append('image', imageFile);
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The listing could not be created.');
      const product = {
        ...data.product,
        imageUrl: data.product.imageUrl || (data.product.image?.id ? `${API_BASE}/api/images/${data.product.image.id}` : null)
      };
      showNotification({ type: 'success', title: 'Listing published', message: `${product.title} is now visible in the marketplace.`, actionLabel: 'Continue' });
      onProductAdded(product);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The listing could not be created. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apple-page listing-editor-page">
      <div className="listing-editor-heading">
        <button type="button" className="listing-back-button" onClick={onCancel} disabled={loading}>
          <ArrowLeft aria-hidden="true" /> Manage products
        </button>
        <p className="listing-eyebrow">Seller workspace</p>
        <h1>Create a listing</h1>
        <p>Give buyers the essentials first. You can update the listing later from Manage Products.</p>
      </div>

      {disabledMessage && <div className="listing-banner" role="alert"><strong>Seller account inactive</strong><span>{disabledMessage}</span></div>}
      {error && <div className="listing-banner listing-banner-error" role="alert">{error}</div>}

      <form className="listing-editor" onSubmit={handleSubmit} noValidate>
        <section className="listing-section" aria-labelledby="listing-basics-title">
          <div className="listing-section-heading">
            <span>01</span><div><h2 id="listing-basics-title">Listing details</h2><p>Help buyers understand what you’re offering.</p></div>
          </div>
          <div className="listing-field-grid">
            <div className="listing-field listing-field-wide">
              <label htmlFor="listing-title">Title <span>Required</span></label>
              <input id="listing-title" value={productData.title} onChange={event => setField('title', event.target.value)} placeholder="e.g. Calculus textbook, excellent condition" disabled={loading || !canPost} aria-invalid={Boolean(fieldErrors.title)} />
              {fieldErrors.title && <p className="listing-field-error">{fieldErrors.title}</p>}
            </div>
            <div className="listing-field">
              <label htmlFor="listing-type">Listing type <span>Required</span></label>
              <select id="listing-type" value={productData.type} onChange={event => setField('type', event.target.value)} disabled={loading || !canPost}>
                <option value="product">Physical product</option><option value="service">Service</option>
              </select>
            </div>
            <div className="listing-field">
              <label htmlFor="listing-category">Category <span>Required</span></label>
              <select id="listing-category" value={productData.category} onChange={event => setField('category', event.target.value)} disabled={loading || !canPost} aria-invalid={Boolean(fieldErrors.category)}>
                <option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {fieldErrors.category && <p className="listing-field-error">{fieldErrors.category}</p>}
            </div>
            <div className="listing-field listing-field-wide">
              <label htmlFor="listing-description">Description <span>Required</span></label>
              <textarea id="listing-description" rows={7} value={productData.description} onChange={event => setField('description', event.target.value)} placeholder="Include condition, what is included, collection or delivery details, and anything a buyer should know." disabled={loading || !canPost} aria-invalid={Boolean(fieldErrors.description)} />
              <div className="listing-field-meta"><span>{fieldErrors.description || 'Be specific—clear listings get better enquiries.'}</span><span>{productData.description.length} characters</span></div>
            </div>
            <div className="listing-field">
              <label htmlFor="listing-price">Price in rand <span>Required</span></label>
              <div className="listing-price-input"><span>R</span><input id="listing-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={productData.price} onChange={event => setField('price', event.target.value)} placeholder="0.00" disabled={loading || !canPost} aria-invalid={Boolean(fieldErrors.price)} /></div>
              {fieldErrors.price && <p className="listing-field-error">{fieldErrors.price}</p>}
            </div>
          </div>
        </section>

        <section className="listing-section" aria-labelledby="listing-image-title">
          <div className="listing-section-heading"><span>02</span><div><h2 id="listing-image-title">Listing image</h2><p>Optional, but a clear photo helps buyers decide.</p></div></div>
          <label className={`listing-upload${imagePreview ? ' has-preview' : ''}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} disabled={loading || !canPost} />
            {imagePreview ? <img src={imagePreview} alt="Selected listing preview" /> : <div><UploadCloud aria-hidden="true" /><strong>Choose an image</strong><span>JPEG, PNG, WebP or GIF · Maximum 5 MB</span></div>}
          </label>
          {imagePreview && <div className="listing-upload-actions"><span><ImagePlus aria-hidden="true" />{imageFile?.name}</span><button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} disabled={loading}><X aria-hidden="true" /> Remove</button></div>}
          {fieldErrors.image && <p className="listing-field-error">{fieldErrors.image}</p>}
        </section>

        <div className="listing-actions">
          <button type="button" className="listing-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="submit" className="listing-primary" disabled={loading || !canPost}>{loading ? <><Loader2 className="listing-spinner" aria-hidden="true" /> Publishing…</> : 'Publish listing'}</button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;
