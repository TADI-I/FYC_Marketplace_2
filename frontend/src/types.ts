// types.ts - Shared type definitions for the marketplace app

export type User = {
  id: number;
  _id?: string;
  name: string;
  email: string;
  type: string;
  subscribed: boolean;
  campus: string;
  subscriptionEndDate?: Date | string;
  subscriptionStatus?: string;
  whatsapp?: string | null;
  verified?: boolean;
  verifiedAt?: Date | string;
};

export type ProductImage = {
  id: string;
  filename: string;
  contentType: string;
  uploadDate: Date | string;
};

// Unified Product type that handles all image formats
export type Product = {
  id: number;
  _id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerId: number;
  sellerName: string;
  sellerCampus: string;
  sellerVerified?: boolean;
  // Allow both object format from backend and string URLs
  image?: ProductImage | string;
  imageUrl?: string;
  rating: number;
  type: string;
};

export type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  timestamp: string;
  read: boolean;
};

export type MessageMap = {
  [key: string]: Message[];
};

export type Category = {
  id: string;
  name: string;
};

export type Campus = {
  id: string;
  name: string;
};

export type VerificationRequest = {
  _id: string;
  userId: string;
  imageId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date | string;
  processedAt?: Date | string;
  adminId?: string;
  adminNote?: string;
  imageUrl?: string;
  user?: User;
};

// Helper function to get consistent product ID
export const getProductId = (product: Product): string => {
  return product._id ? product._id.toString() : product.id.toString();
};

// Helper function to get image URL from product
// Helper function to get image URL from product
export const getImageUrl = (product: Product, apiBase: string): string | null => {
 
  
  if (product.imageUrl) {
    console.groupEnd();
    return product.imageUrl;
  }
  
  if (typeof product.image === 'object' && product.image?.id) {
    // FIX: Add /api/ to the path
    const url = `${apiBase}/api/images/${product.image.id}`;
    console.groupEnd();
    return url;
  }
  
  if (typeof product.image === 'string') {

    return product.image;
  }
  
  console.log('❌ No valid image found');
  console.groupEnd();
  return null;
};

// Helper function to normalize South African phone numbers for WhatsApp
export const normalizeSAPhoneNumber = (phoneNumber: string): string | null => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If empty after cleaning, return null
  if (!cleaned) return null;
  
  // Handle different South African number formats:
  // 0629622755 -> 27629622755
  // 629622755 -> 27629622755
  // 27629622755 -> 27629622755
  // +27629622755 -> 27629622755
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // If doesn't start with 27, add it (assumes SA number)
  if (!cleaned.startsWith('27')) {
    cleaned = '27' + cleaned;
  }
  
  // Validate: SA mobile numbers should be 11 digits (27 + 9 digits)
  // Landline numbers are also 11 digits (27 + 9 digits)
  if (cleaned.length < 11) {
    return null; // Invalid number
  }
  
  return cleaned;
};