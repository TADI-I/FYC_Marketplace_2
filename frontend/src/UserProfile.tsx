import React, { useState, useEffect } from "react";
import { getSubscriptionStatus, updateUserProfile, upgradeUserToSeller, getCurrentUser, requestReactivation, requestUpgrade } from './api'; 
import { User as UserIC, ArrowLeft, Mail, Building, CreditCard, Edit3, Save, X, Zap, AlertTriangle, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import ReactivateModal from './reactivatemodal';
import VerificationSection from './VerificationSection';

// Use shared types (remove duplicate User type to avoid redeclare)
type User = {
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
};

interface UserProfileProps {
  currentUser: User | null;
  onLogout: () => void;
  onBack: () => void;
  onUserUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onLogout, onBack, onUserUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);  
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: '',
    campus: '',
    whatsapp: user?.whatsapp || ''
  });
  const [_subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [showSupportTooltip, setShowSupportTooltip] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [showUpgradeContactModal, setShowUpgradeContactModal] = useState(false); // NEW

  // debug: log modal state so we can see if click toggles it
  useEffect(() => {
    console.debug('showReactivationModal ->', showReactivationModal);
  }, [showReactivationModal]);

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
    // try to fetch fresh user from API (so latest whatsapp and other fields are present)
    const init = async () => {
      if (!currentUser) return;
      try {
        const fresh = await fetchCurrentUser();
        setUser(fresh || currentUser);
      } catch (err) {
        // fallback to prop if API call fails
        setUser(currentUser);
      }
    };
    init();
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSubscriptionStatus(); }, []);

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      campus: user.campus || '',
      whatsapp: user.whatsapp || ''
    });
  }, [user]);

  // NEW: Poll for subscription status updates when user has pending request
  useEffect(() => {
    if (!user) return;
    
    const shouldPoll = user.type === 'seller' && 
                       (user.subscriptionStatus === 'expired' || !user.subscribed);
    
    if (shouldPoll && !isPolling) {
      setIsPolling(true);
      console.log('🔄 Starting to poll for subscription updates...');
      
      const pollInterval = setInterval(async () => {
        try {
          const freshUser = await fetchCurrentUser();
          if (freshUser) {
            // Check if status changed to active
            if (freshUser.subscribed && freshUser.subscriptionStatus === 'active') {
              console.log('✅ Subscription activated! Stopping poll.');
              setUser(freshUser);
              setSuccessMessage('Your subscription has been activated! You can now add products.');
              clearInterval(pollInterval);
              setIsPolling(false);
              
              // Update parent component AND localStorage
              if (onUserUpdate) {
                onUserUpdate(freshUser);
              }
              localStorage.setItem('user_data', JSON.stringify(freshUser));
              
              // Auto-hide success message after 5 seconds
              setTimeout(() => setSuccessMessage(null), 5000);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds
      
      // Stop polling after 5 minutes to avoid infinite loops
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsPolling(false);
        console.log('⏱️ Stopped polling after timeout');
      }, 300000); // 5 minutes
      
      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }
  }, [user, isPolling, onUserUpdate]);

  const fetchCurrentUser = async () => {
    try {
      const freshUser = await getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        // Update parent component state
        if (onUserUpdate) {
          onUserUpdate(freshUser);
        }
        return freshUser;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  };

  const campuses = [
    { id: 'all', name: 'All Locations' },
    { id: 'pretoria-main', name: 'Pretoria Central' },
    { id: 'soshanguve-S', name: 'Soshanguve South' },
    { id: 'soshanguve-N', name: 'Soshanguve North' },
    { id: 'ga-rankuwa', name: 'Ga-Rankuwa' },
    { id: 'pretoria-west', name: 'Pretoria Arcadia' },
    { id: 'arts', name: 'Arts' },
    { id: 'emalahleni', name: 'eMalahleni' },
    { id: 'mbombela', name: 'Mbombela' },
    { id: 'polokwane', name: 'Polokwane' }
  ];

  const fetchSubscriptionStatus = async () => {
    if (!currentUser) return;

    try {
      const status = await getSubscriptionStatus();
      setSubscriptionInfo(status);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  const getSubscriptionDaysRemaining = () => {
    if (!user?.subscriptionEndDate) return null;
    
    const endDate = new Date(user.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getSubscriptionAlert = () => {
    if (user?.type !== 'seller') return null;
    
    const daysRemaining = getSubscriptionDaysRemaining();
    const isExpired = user?.subscriptionStatus === 'expired' || (daysRemaining !== null && daysRemaining <= 0);
    const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;

    if (isExpired) {
      return {
        type: 'error',
        icon: AlertTriangle,
        title: 'Subscription Expired',
        message: 'Your seller subscription has expired. Renew now to continue selling.',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
      };
    }

    if (isExpiringSoon) {
      return {
        type: 'warning',
        icon: Clock,
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew soon to avoid interruption.`,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600'
      };
    }

    if (user?.subscribed && daysRemaining !== null && daysRemaining > 7) {
      return {
        type: 'success',
        icon: CheckCircle,
        title: 'Subscription Active',
        message: `Your subscription is active for ${daysRemaining} more days.`,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      };
    }

    return null;
  };

  const handleEditToggle = () => {
    setEditing(!editing);
    if (editing) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        campus: user?.campus || '',
        whatsapp: user?.whatsapp || ''
      });
    }
    setError('');
    setSuccessMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const userId = currentUser._id;
    
    if (!userId) {
      setError('User ID not found. Please log in again.');
      return;
    }

    if (!formData.email?.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }

    // normalize whatsapp (optional) and validate basic length
    let normalizedWhatsapp: string | undefined = undefined;
    if (formData.whatsapp && formData.whatsapp.trim() !== '') {
      normalizedWhatsapp = String(formData.whatsapp).replace(/\D/g, '');
      if (normalizedWhatsapp.length < 7) {
        setError('Please enter a valid WhatsApp number (include country code if possible)');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const updatedProfile = await updateUserProfile(userId, {
        name: formData.name.trim(),
        campus: formData.campus,
        email: formData.email.toLowerCase().trim(),
        whatsapp: normalizedWhatsapp !== undefined ? normalizedWhatsapp : null
      });
      
      setUser(updatedProfile);
      
      // Update parent component AND localStorage
      if (onUserUpdate) {
        onUserUpdate(updatedProfile);
      }
      localStorage.setItem('user_data', JSON.stringify(updatedProfile));
      
      setEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Update error details:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (!currentUser?._id) {
      setError('User ID missing. Please log in again.');
      return;
    }

    setUpgrading(true);
    setError('');

    try {
      const checkout = await upgradeUserToSeller(currentUser._id);
      if (!checkout.authorizationUrl) throw new Error('Secure checkout URL was not returned.');
      window.location.assign(checkout.authorizationUrl);
    } catch (err: any) {
      setError(err.message || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  const handleRequestReactivation = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!user) {
      setError('User not loaded. Please refresh and try again.');
      return;
    }

    const userId = user._id ?? (user.id ? String(user.id) : null);
    if (!userId) {
      setError('User ID missing. Please log in again.');
      return;
    }

    // open modal immediately so the buyer sees the WhatsApp instructions
    setShowReactivationModal(true);
    
    setLoading(true);
    try {
      await requestReactivation(userId);
      setSuccessMessage('Reactivation request sent to admin. Checking for approval...');
      
      // Immediately fetch fresh user data
      const freshUser = await fetchCurrentUser();
      if (freshUser && freshUser.subscribed && freshUser.subscriptionStatus === 'active') {
        setSuccessMessage('Your subscription has been activated! You can now add products.');
        setShowReactivationModal(false);
      }
      
    } catch (err: any) {
      console.error('Reactivation request failed:', err);
      setError(err?.message || 'Failed to send reactivation request');
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (successMessage?.includes('Checking')) {
          setSuccessMessage(null);
        }
      }, 5000);
    }
  };

  const handleRequestUpgrade = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!user) {
      setError('User not loaded. Please refresh and try again.');
      return;
    }
    const userId = user._id ?? (user.id ? String(user.id) : null);
    if (!userId) {
      setError('User ID missing. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      await requestUpgrade(userId);
      setUpgradeRequested(true);
      setSuccessMessage('Upgrade request sent successfully!');
      
      // Show the WhatsApp contact modal
      setShowUpgradeContactModal(true);
      
      // Start polling for approval
      setIsPolling(false); // Reset to trigger the polling effect
    } catch (err: any) {
      setError(err?.message || 'Failed to send upgrade request');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleRenewSubscription = async () => {
    handleUpgradeToSeller();
  };

  if (!currentUser) {
    return (
      <div className="apple-page min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Please log in to view your profile.</p>
          <button 
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const subscriptionAlert = getSubscriptionAlert();

  return (
    <div className="apple-page profile-page min-h-screen bg-gray-50 py-8">
      {/* Reactivation Modal - Single instance at top level */}
      <ReactivateModal
        isOpen={showReactivationModal}
        onClose={() => setShowReactivationModal(false)}
        userEmail={user?.email}
      />

      {/* NEW: Upgrade Contact Admin Modal */}
      {showUpgradeContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h2>
              <p className="text-gray-600">
                Your seller upgrade request has been submitted successfully.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Speed Up Your Approval
                  </h3>
                  <p className="text-sm text-blue-800">
                    Contact admin directly on WhatsApp for faster processing of your seller account upgrade.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="https://wa.me/27711126204?text=Hi%2C%20I%20just%20requested%20a%20seller%20account%20upgrade%20for%20FYC%20Marketplace.%20Can%20you%20please%20help%20me%20get%20approved%3F"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowUpgradeContactModal(false)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Contact Admin on WhatsApp</span>
              </a>
              
              <button
                onClick={() => setShowUpgradeContactModal(false)}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                I'll Wait for Email
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              You'll receive an email once your request is reviewed
            </p>
          </div>
        </div>
      )}

      {/* Polling Indicator */}
      {isPolling && (
        <div className="fixed top-20 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-800">Checking for admin approval...</span>
          </div>
        </div>
      )}

      {editing && (
        <div className="apple-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
          <div className="apple-modal-card bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="profile-edit-title" className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                <p className="text-sm text-gray-600">Update your account details in one focused step.</p>
              </div>
              <button
                type="button"
                onClick={handleEditToggle}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Close profile editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="profile-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="profile-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-campus" className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    id="profile-campus"
                    name="campus"
                    value={formData.campus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{campuses[0].name}</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="profile-whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="+27123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include country code, for example 27...</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={onBack}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Home</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIC className="h-12 w-12 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
                <p className="text-gray-600">Manage your account settings and preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Alert */}
        {subscriptionAlert && (
          <div className={`${subscriptionAlert.bgColor} border ${subscriptionAlert.borderColor} rounded-lg p-4 mb-6`}>
            <div className="flex items-start">
              <subscriptionAlert.icon className={`h-5 w-5 ${subscriptionAlert.iconColor} mr-3 mt-0.5 flex-shrink-0`} />
              <div className="flex-1">
                <h3 className={`font-semibold ${subscriptionAlert.textColor} mb-1`}>
                  {subscriptionAlert.title}
                </h3>
                <p className={`text-sm ${subscriptionAlert.textColor} mb-3`}>
                  {subscriptionAlert.message}
                </p>

                {subscriptionAlert.type === 'error' && (
                  <button
                    onClick={handleRenewSubscription}
                    disabled={loading || upgrading}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {upgrading ? 'Starting secure checkout...' : 'Reactivate Subscription'}
                  </button>
                )}

                {subscriptionAlert.type === 'warning' && (
                  <button
                    onClick={handleRenewSubscription}
                    disabled={upgrading}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {upgrading ? 'Processing...' : 'Renew Subscription'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Save className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800">{successMessage}</span>
            </div>
          </div>
        )}

        {loading && !user && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <button 
                    onClick={handleEditToggle}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <UserIC className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium text-gray-900">{user.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Campus</p>
                          <p className="font-medium text-gray-900">{user.campus || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Account Type</p>
                          <p className="font-medium text-gray-900 capitalize">{user.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">WhatsApp</p>
                          <p className="font-medium text-gray-900">{user.whatsapp || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subscription</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.subscribed && user.subscriptionStatus !== 'expired' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.subscribed && user.subscriptionStatus !== 'expired' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">User Type</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.type === 'seller' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                    </span>
                  </div>
                  {user.subscriptionEndDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subscription Expires</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium">
                        {new Date(user.subscriptionEndDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {user?.type === 'seller' && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <VerificationSection 
                    userId={user._id || String(user.id)} 
                    userType={user.type}
                  />
                </div>
              )}

              {(user.type === 'customer' || user.type === 'buyer') && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Become a Seller</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Upgrade your account to start selling products on our marketplace.
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={handleUpgradeToSeller}
                      disabled={loading || upgrading}
                      className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Zap className="h-4 w-4" />
                      <span>{upgrading ? 'Starting secure checkout...' : 'Subscribe as Seller'}</span>
                    </button>
                    <p className="text-xs text-gray-600">
                      Seller subscription: <span className="font-semibold">R25 / month</span>. Access activates after verified payment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
