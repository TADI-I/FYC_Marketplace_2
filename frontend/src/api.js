const API_BASE = process.env.REACT_APP_API_BASE;

// API Helper function with DEBUG LOGGING
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token');
  
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body) {
    config.body = options.body;
  }

  try {
    // Ensure endpoint starts with /api
    const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const response = await fetch(`${API_BASE}${fullEndpoint}`, config);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

// Helper to add imageUrl to products
const addImageUrl = (product) => {
  if (!product) return product;
  
  return {
    ...product,
    imageUrl: product.image?.id 
      ? `${API_BASE}/api/images/${product.image.id}`
      : product.imageUrl || null
  };
};

// ==============================================
// AUTH API FUNCTIONS
// ==============================================

export const registerUser = async (userData) => {
  try {
    const response = await apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      
      // VERIFY storage worked
      const storedToken = localStorage.getItem('auth_token');
    } else {
      console.warn('⚠️ No token in registration response!');
    }

    return response;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

export const loginUser = async (credentials) => {
  try {
  
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
 
      
      // VERIFY storage worked
      const storedToken = localStorage.getItem('auth_token');
    } else {
      console.warn('⚠️ No token in login response!');
    }

    return response;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw new Error(error.message || 'Login failed');
  }
};

export const logoutUser = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
};

// FIXED: getCurrentUser now makes an API call to get fresh data from backend
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }

    // Try to fetch fresh user data from API
    try {
      const response = await apiCall('/users/me');
      
      // Update localStorage with fresh data
      if (response.user || response) {
        const freshUser = response.user || response;
        localStorage.setItem('user_data', JSON.stringify(freshUser));
        return freshUser;
      }
    } catch (apiError) {
      console.warn('Failed to fetch user from API, using cached data:', apiError);
      // If API call fails, fall back to cached data
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};

// ==============================================
// PRODUCT API FUNCTIONS
// ==============================================

export const getProducts = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== '' && filters[key] !== 'all') {
        queryParams.append(key, filters[key]);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/products${queryString ? `?${queryString}` : ''}`;
        
    const response = await apiCall(endpoint);
    
    // Add imageUrl to all products
    if (response.products && Array.isArray(response.products)) {
      response.products = response.products.map(addImageUrl);
    }
        
    return response;
  } catch (error) {
    console.error('❌ Failed to get products:', error);
    throw new Error(error.message || 'Failed to retrieve products');
  }
};

export const getProduct = async (productId) => {
  try {   
    const response = await apiCall(`/api/products/${productId}`);
    return addImageUrl(response);
  } catch (error) {
    console.error('❌ Failed to get product:', error);
    throw new Error(error.message || 'Failed to retrieve product');
  }
};

export const getProductsBySeller = async (sellerId) => {
  try {
    const response = await apiCall(`/api/products/seller/${sellerId}`);
    const products = response.products || [];
    return products.map(addImageUrl);
  } catch (error) {
    console.error('❌ Failed to get seller products:', error);
    
    try {
      const allProductsResponse = await getProducts();
      const allProducts = allProductsResponse.products || allProductsResponse || [];
      const sellerProducts = allProducts.filter(p => 
        p.sellerId === sellerId || 
        p.sellerId === parseInt(sellerId) ||
        p.seller?._id === sellerId ||
        p.sellerId === sellerId
      );
      return sellerProducts.map(addImageUrl);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      throw new Error(error.message || 'Failed to retrieve seller products');
    }
  }
};

export const createProduct = async (productData) => {
  try {
    
    
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const formData = new FormData();
    
    Object.keys(productData).forEach(key => {
      if (key !== 'image' && productData[key] !== undefined) {
        formData.append(key, productData[key]);
      }
    });
    
    if (productData.image && productData.image instanceof File) {
      formData.append('image', productData.image);
    }

    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }
    // Return product with imageUrl
    return addImageUrl(data.product || data);
  } catch (error) {
    console.error('❌ Failed to create product:', error);
    throw new Error(error.message || 'Failed to create product');
  }
};

export const updateProduct = async (productId, updateData) => {
  try {
    const response = await apiCall(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return addImageUrl(response);
  } catch (error) {
    console.error('❌ Failed to update product:', error);
    throw new Error(error.message || 'Failed to update product');
  }
};

export const deleteProduct = async (productId) => {
  try {
    const response = await apiCall(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to delete product:', error);
    throw new Error(error.message || 'Failed to delete product');
  }
};

// ==============================================
// MESSAGE API FUNCTIONS
// ==============================================

export const getMessages = async (conversationId) => {
  try {
    const response = await apiCall(`/api/messages/${conversationId}`);
    return response.messages || [];
  } catch (error) {
    console.error('❌ Failed to get messages:', error);
    return getMockMessages(conversationId);
  }
};

export const sendMessage = async (messageData) => {
  try {
    console.log('📤 Sending message:', messageData);
    const response = await apiCall('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    console.log('✅ Message sent successfully');
    return response;
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    return sendMockMessage(messageData);
  }
};

// ==============================================
// USER API FUNCTIONS
// ==============================================

export const getSubscriptionStatus = async () => {
  try {    
    const response = await apiCall('/api/user/subscription-status');
    return response;
  } catch (error) {
    console.error('❌ Failed to get subscription status:', error);
    return { subscribed: false, type: 'buyer', subscriptionStatus: 'NONE' };
  }
};

export const getEligibleSellerOffers = async () => {
  const response = await apiCall('/api/seller-offers/eligible');
  return response.offers || [];
};

export const claimSellerOffer = async (offerId) => {
  return apiCall(`/api/seller-offers/${offerId}/claim`, {
    method: 'POST'
  });
};

export const updateUserProfile = async (userId, updateData) => {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response: ${text}`);
    }

    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      throw new Error(data.error || `HTTP ${response.status}: Failed to update profile`);
    }

    return data.user || data;
    
  } catch (error) {
    console.error('❌ Failed to update profile:', error);
    
    if (error.message.includes('Authentication token')) {
      throw new Error('Your session has expired. Please log in again.');
    } else if (error.message.includes('non-JSON')) {
      throw new Error('Server error. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to update profile');
  }
};

export const upgradeUserToSeller = async (userId, subscriptionType = 'monthly') => {
  try {
    const response = await apiCall(`/api/users/${userId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ subscriptionType }),
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to upgrade account:', error);
    throw new Error(error.message || 'Failed to upgrade account');
  }
};

export const requestReactivation = async (userId, note = '') => {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Authentication token not found. Please log in again.');

  const response = await apiCall(`/api/users/${userId}/reactivate-request`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return response;
};

export const getReactivationRequests = async () => {
  const response = await apiCall('/api/admin/reactivation-requests');
  return response.requests || [];
};

export const processReactivationRequest = async (requestId, action, adminNote = '', subscriptionType = 'monthly') => {
  const response = await apiCall(`/api/admin/reactivation-requests/${requestId}/process`, {
    method: 'POST',
    body: JSON.stringify({ action, adminNote, subscriptionType }),
  });
  return response;
};

// Add these exports near the other admin functions

export const getAllUsers = async (type = 'all') => {
  try {
    const queryParam = type && type !== 'all' ? `?type=${type}` : '';
    const response = await apiCall(`/api/admin/users${queryParam}`);
    return response;
  } catch (error) {
    console.error('❌ Failed to get users:', error);
    throw new Error(error.message || 'Failed to load users');
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    const response = await apiCall(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to update user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
};


// ==============================================
// REFERENCE DATA API FUNCTIONS
// ==============================================

export const getCampuses = async () => {
  try {
    const response = await apiCall('/api/campuses');
    return response.campuses || [];
  } catch (error) {
    console.error('❌ Failed to get campuses:', error);
    return [
      { id: 'pretoria-main', name: 'Pretoria Main' },
      { id: 'soshanguve-S', name: 'Soshanguve South' },
      { id: 'soshanguve-N', name: 'Soshanguve North' },
      { id: 'ga-rankuwa', name: 'Ga-Rankuwa' },
      { id: 'pretoria-west', name: 'Pretoria West' },
      { id: 'arts', name: 'Arts' },
      { id: 'emalahleni', name: 'eMalahleni' },
      { id: 'mbombela', name: 'Mbombela' },
      { id: 'polokwane', name: 'Polokwane' }
    ];
  }
};

export const getCategories = async () => {
  try {
    const response = await apiCall('/api/categories');
    return response.categories || [];
  } catch (error) {
    console.error('❌ Failed to get categories:', error);
    return [
      { id: 'books', name: 'Books' },
      { id: 'electronics', name: 'Electronics' },
      { id: 'services', name: 'Services' },
      { id: 'clothing', name: 'Clothing' },
      { id: 'food', name: 'Food' },
      { id: 'transport', name: 'Transport' },
      { id: 'accommodation', name: 'Accommodation' },
      { id: 'other', name: 'Other' }
    ];
  }
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

export const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    
    if (data.success) {
      return true;
    } else {
      console.error('❌ API connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ API connection error:', error);
    return false;
  }
};

export const generateConversationId = (userId1, userId2) => {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}-${ids[1]}`;
};

// Mock message functions (fallback)
let messagesDB = [
  {
    id: 1,
    senderId: 1,
    receiverId: 2,
    text: "Hi there! Is this item still available?",
    timestamp: "2024-01-15T10:30:00Z",
    read: true
  },
  {
    id: 2,
    senderId: 2,
    receiverId: 1,
    text: "Yes, it's still available!",
    timestamp: "2024-01-15T10:35:00Z",
    read: true
  },
  {
    id: 3,
    senderId: 1,
    receiverId: 2,
    text: "Great! Can we meet on campus tomorrow?",
    timestamp: "2024-01-15T10:40:00Z",
    read: false
  }
];

let nextMessageId = 4;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendMockMessage = async (messageData) => {
  await delay(500);

  try {
    if (!messageData.senderId || !messageData.receiverId || !messageData.text.trim()) {
      throw new Error('Missing required message fields');
    }

    const newMessage = {
      id: nextMessageId++,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      text: messageData.text.trim(),
      timestamp: messageData.timestamp || new Date().toISOString(),
      read: false
    };

    messagesDB.push(newMessage);
    console.log('✅ Mock message sent:', newMessage);
    return newMessage;

  } catch (error) {
    console.error('❌ Failed to send mock message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

const getMockMessages = async (conversationId) => {
  await delay(300);

  try {
    const [userId1, userId2] = conversationId.split('-').map(Number);
    
    const conversationMessages = messagesDB.filter(message =>
      (message.senderId === userId1 && message.receiverId === userId2) ||
      (message.senderId === userId2 && message.receiverId === userId1)
    );

    const sortedMessages = conversationMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedMessages;

  } catch (error) {
    console.error('❌ Failed to get mock messages:', error);
    return [];
  }
};

export const getConversations = async (userId) => {
  await delay(400);

  try {
    const conversationPartners = new Set();
    
    messagesDB.forEach(message => {
      if (message.senderId === userId) conversationPartners.add(message.receiverId);
      if (message.receiverId === userId) conversationPartners.add(message.senderId);
    });

    const conversations = Array.from(conversationPartners).map(partnerId => {
      const messagesWithPartner = messagesDB.filter(msg =>
        (msg.senderId === userId && msg.receiverId === partnerId) ||
        (msg.senderId === partnerId && msg.receiverId === userId)
      );

      const lastMessage = messagesWithPartner.reduce((latest, current) => 
        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      );

      const unreadCount = messagesWithPartner.filter(msg => 
        msg.receiverId === userId && !msg.read
      ).length;

      return {
        userId: partnerId,
        lastMessage,
        unreadCount
      };
    });

    return conversations.sort((a, b) => 
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );

  } catch (error) {
    console.error('❌ Failed to get conversations:', error);
    throw new Error('Failed to load conversations');
  }
};

export const markMessagesAsRead = async (userId, partnerId) => {
  await delay(200);

  try {
    messagesDB = messagesDB.map(message => {
      if (message.senderId === partnerId && message.receiverId === userId && !message.read) {
        return { ...message, read: true };
      }
      return message;
    });
  } catch (error) {
    console.error('❌ Failed to mark messages as read:', error);
    throw new Error('Failed to mark messages as read');
  }
};

export const getUnreadMessageCount = async (userId) => {
  await delay(100);

  try {
    const unreadMessages = messagesDB.filter(message => 
      message.receiverId === userId && !message.read
    );
    
    return unreadMessages.length;
  } catch (error) {
    console.error('❌ Failed to get unread message count:', error);
    return 0;
  }
};

export async function requestUpgrade(userId) {
  try {
    // use apiCall so Authorization header and /api prefix are applied consistently
    const response = await apiCall(`/users/${userId}/reactivate-request`, {
      method: 'POST',
    });
    return response;
  } catch (err) {
    console.error('requestUpgrade error', err);
    throw err;
  }
}

export const submitVerificationRequest = async (userId, idPhotoFile) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required');

    const formData = new FormData();
    formData.append('idPhoto', idPhotoFile);

    const response = await fetch(`${API_BASE}/api/verification/${userId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to submit verification');
    return data;
  } catch (error) {
    console.error('❌ Submit verification failed:', error);
    throw error;
  }
};

export const getVerificationStatus = async (userId) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE}/api/verification/${userId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get verification status');
    return data;
  } catch (error) {
    console.error('❌ Get verification status failed:', error);
    throw error;
  }
};

export const getVerificationRequests = async (status = 'pending') => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE}/api/verification/requests?status=${status}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get verification requests');
    return data;
  } catch (error) {
    console.error('❌ Get verification requests failed:', error);
    throw error;
  }
};

export const processVerificationRequest = async (requestId, action, adminNote = '') => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE}/api/verification/${requestId}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, adminNote }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to process verification');
    return data;
  } catch (error) {
    console.error('❌ Process verification failed:', error);
    throw error;
  }
};

// ==============================================
// ANALYTICS API FUNCTIONS
// ==============================================

export const trackWhatsAppClick = async (productId) => {
  try {
    const response = await apiCall(`/api/analytics/whatsapp-click/${productId}`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to track WhatsApp click:', error);
    // Don't throw - we don't want tracking failures to block the user
    return { success: false };
  }
};

export const getProductAnalytics = async (productId) => {
  try {
    const response = await apiCall(`/api/analytics/product/${productId}`);
    return response;
  } catch (error) {
    console.error('❌ Failed to get product analytics:', error);
    throw new Error(error.message || 'Failed to retrieve analytics');
  }
};

// assign export to a named variable to satisfy import/no-anonymous-default-export
const api = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAllUsers,
  updateUser,
  isAuthenticated,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  getMessages,
  sendMessage,
  getConversations,
  markMessagesAsRead,
  getUnreadMessageCount,
  getSubscriptionStatus,
  updateUserProfile,
  upgradeUserToSeller,
  requestReactivation,
  getReactivationRequests,
  processReactivationRequest,
  getCampuses,
  getCategories,
  testConnection,
  generateConversationId,
  submitVerificationRequest,
  getVerificationStatus,
  getVerificationRequests,
  processVerificationRequest,
  trackWhatsAppClick,
  getProductAnalytics,
};
export default api;
