import React, { useState, useEffect } from "react";
import { getSubscriptionStatus, updateUserProfile, upgradeUserToSeller, getCurrentUser } from './api';
import { User as UserIC, ArrowLeft, Mail, MapPin, CreditCard, Edit3, Save, X, Zap, AlertTriangle, Clock, CheckCircle, Phone, CalendarDays, Store, Loader2 } from 'lucide-react';
import VerificationSection from './VerificationSection';
import type { CapturedLocation, User } from './types';
import { showNotification } from './AppNotificationModal';
import { ProfileSkeleton } from './LoadingSkeletons';
import { supportWhatsAppUrl } from './siteConfig';
import { CAMPUS_LOCATIONS, OTHER_LOCATION_OPTION } from './marketplaceData';
import CustomLocationCapture from './CustomLocationCapture';

interface UserProfileProps {
  currentUser: User | null;
  onLogout: () => void;
  onBack: () => void;
  onUserUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onLogout, onBack, onUserUpdate }) => {
  const currentUserId = currentUser?._id || currentUser?.id;
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);  
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: '',
    campus: '',
    locationLabel: '',
    whatsapp: user?.whatsapp || ''
  });
  const [customLocation, setCustomLocation] = useState<CapturedLocation | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [showSupportTooltip, setShowSupportTooltip] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

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
      if (!currentUser) {
        setProfileLoading(false);
        return;
      }
      try {
        const fresh = await fetchCurrentUser();
        setUser(fresh || currentUser);
      } catch (err) {
        // fallback to prop if API call fails
        setUser(currentUser);
      } finally {
        setProfileLoading(false);
      }
    };
    init();
  // Reinitialize only when the viewed account changes. Parent cache refreshes for
  // the same user must not restart this request or overwrite an open editor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSubscriptionStatus(); }, []);

  useEffect(() => {
    if (!user || editing) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      campus: user.campus || '',
      locationLabel: user.locationLabel || '',
      whatsapp: user.whatsapp || ''
    });
  }, [user, editing]);

  // Poll while a returning seller is waiting for verified payment.
  useEffect(() => {
    if (!user) return;
    
    const shouldPoll = user.type === 'seller' && !user.subscribed;
    
    if (shouldPoll && !isPolling) {
      setIsPolling(true);
      const pollInterval = setInterval(async () => {
        try {
          const freshUser = await fetchCurrentUser();
          if (freshUser) {
            // Check if status changed to active
            if (freshUser.subscribed && ['ACTIVE', 'TRIAL', 'active', 'trial'].includes(freshUser.subscriptionStatus || '')) {
              setUser(freshUser);
              showNotification({ type: 'success', title: 'Subscription activated', message: 'You can now add products.' });
              clearInterval(pollInterval);
              setIsPolling(false);
              
              // Update parent component AND localStorage
              if (onUserUpdate) {
                onUserUpdate(freshUser);
              }
              localStorage.setItem('user_data', JSON.stringify(freshUser));
              
              // Auto-hide success message after 5 seconds
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
    ...CAMPUS_LOCATIONS
  ];

  const fetchSubscriptionStatus = async () => {
    if (!currentUser) return;

    try {
      const status = await getSubscriptionStatus();
      if (status) {
        setUser(current => current ? {
          ...current,
          subscribed: status.hasActiveSubscription,
          subscriptionStatus: status.subscriptionStatus,
          subscriptionEndDate: status.subscriptionEndDate,
          hasHadSellerAccess: status.hasHadSellerAccess,
          subscriptionSource: status.subscriptionSource
        } : current);
      }
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
    const status = (user?.subscriptionStatus || '').toUpperCase();
    const isTrial = status === 'TRIAL';
    const isOffer = user.subscriptionSource === 'OFFER';
    const isExpired = ['EXPIRED', 'PAYMENT_REQUIRED', 'CANCELLED'].includes(status) || (daysRemaining !== null && daysRemaining <= 0);
    const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;

    if (isExpired) {
      return {
        type: 'error',
        icon: AlertTriangle,
        title: user.hasHadSellerAccess ? 'Seller Access Expired' : 'Seller Subscription Required',
        message: user.hasHadSellerAccess
          ? 'Pay R25/month or claim an eligible offer to start advertising again.'
          : 'Subscribe for R25/month to start advertising. Any promotion will appear as a separate claimable offer.',
        actionLabel: user.hasHadSellerAccess ? 'View Reactivation Options' : 'Start Seller Subscription',
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
        title: isTrial || isOffer ? 'Free Offer Ending Soon' : 'Subscription Expiring Soon',
        message: `${isTrial || isOffer ? 'Your free seller period' : 'Your subscription'} expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
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
        title: isTrial || isOffer ? 'Free Seller Offer Active' : 'Subscription Active',
        message: `${isTrial || isOffer ? 'Your claimed seller offer is active' : 'Your subscription is active'} for ${daysRemaining} more days.`,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      };
    }

    return null;
  };

  const handleEditToggle = () => {
    if (!editing) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        campus: user?.campus || '',
        locationLabel: user?.locationLabel || '',
        whatsapp: user?.whatsapp || ''
      });
      setCustomLocation(null);
    }
    setEditing(!editing);
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
      showNotification({ type: 'error', title: 'Session unavailable', message: 'User ID not found. Please log in again.' });
      return;
    }

    if (!formData.email?.includes('@')) {
      showNotification({ type: 'warning', title: 'Check your email', message: 'Please enter a valid email address.' });
      return;
    }

    if (!formData.name?.trim()) {
      showNotification({ type: 'warning', title: 'Name required', message: 'Please enter your name.' });
      return;
    }

    if (formData.campus === 'other' && (!formData.locationLabel.trim() || (!customLocation && !user?.hasCustomLocation))) {
      showNotification({ type: 'warning', title: 'Add your location', message: 'Enter an area name and use the location button before saving.' });
      return;
    }

    // normalize whatsapp (optional) and validate basic length
    let normalizedWhatsapp: string | undefined = undefined;
    if (formData.whatsapp && formData.whatsapp.trim() !== '') {
      normalizedWhatsapp = String(formData.whatsapp).replace(/\D/g, '');
      if (normalizedWhatsapp.length < 7) {
        showNotification({ type: 'warning', title: 'Check your number', message: 'Enter a valid WhatsApp number, including the country code if possible.' });
        return;
      }
    }

    setLoading(true);

    try {
      const result = await updateUserProfile(userId, {
        name: formData.name.trim(),
        campus: formData.campus,
        locationLabel: formData.campus === 'other' ? formData.locationLabel.trim() : null,
        location: formData.campus === 'other' ? customLocation : null,
        email: formData.email.toLowerCase().trim(),
        whatsapp: normalizedWhatsapp !== undefined ? normalizedWhatsapp : null
      });
      const updatedProfile = result.user;
      
      setUser(updatedProfile);
      
      // Update parent component AND localStorage
      if (onUserUpdate) {
        onUserUpdate(updatedProfile);
      }
      localStorage.setItem('user_data', JSON.stringify(updatedProfile));
      
      setEditing(false);
      setCustomLocation(null);
      showNotification({ type: 'success', title: 'Profile updated', message: result.message || 'Your changes were saved successfully.' });
    } catch (error) {
      console.error('Update error details:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      showNotification({ type: 'error', title: 'Profile update failed', message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (!currentUser?._id) {
      showNotification({ type: 'error', title: 'Session unavailable', message: 'User ID missing. Please log in again.' });
      return;
    }

    setUpgrading(true);

    try {
      const result = await upgradeUserToSeller(currentUser._id);
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      if (!result.user) throw new Error('Seller activation response was incomplete.');

      setUser(result.user);
      showNotification({
        type: 'success',
        title: result.claimRequired ? 'Seller offer available' : 'Seller account active',
        message: result.claimRequired
          ? 'Claim the offer from the notification to start the free period.'
          : 'Your seller account is already active.'
      });
      onUserUpdate?.(result.user);
      localStorage.setItem('user_data', JSON.stringify(result.user));
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Seller activation failed', message: err.message || 'Upgrade failed.' });
    } finally {
      setUpgrading(false);
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
    <div className="apple-page profile-page">
      {/* Polling Indicator */}
      {isPolling && (
        <div className="profile-payment-check" role="status">
          <Loader2 aria-hidden="true" />
          <span>Checking payment status…</span>
        </div>
      )}

      {editing && (
        <div className="seller-modal-layer" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget && !loading) handleEditToggle();
        }}>
          <section className="profile-editor-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" aria-describedby="profile-edit-description">
            <header className="seller-modal-header">
              <div>
                <p className="listing-eyebrow">Account settings</p>
                <h2 id="profile-edit-title">Edit profile</h2>
                <p id="profile-edit-description">Keep your contact and marketplace information up to date.</p>
              </div>
              <button
                type="button"
                onClick={handleEditToggle}
                disabled={loading}
                className="seller-modal-close"
                aria-label="Close profile editor"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleProfileUpdate} className="profile-edit-form">
              <div className="profile-edit-fields">
                <div className="listing-field">
                  <label htmlFor="profile-name">Full name <span>Required</span></label>
                  <input
                    type="text"
                    id="profile-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    autoFocus
                  />
                </div>
                <div className="listing-field">
                  <label htmlFor="profile-email">Email address <span>Required</span></label>
                  <input
                    type="email"
                    id="profile-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                  {user?.pendingEmail && (
                    <p className="profile-field-note">
                      Confirmation pending for {user.pendingEmail}. The link expires after 10 minutes.
                    </p>
                  )}
                </div>
                <div className="listing-field">
                  <label htmlFor="profile-campus">Location <span>Required</span></label>
                  <select
                    id="profile-campus"
                    name="campus"
                    value={formData.campus}
                    onChange={event => {
                      handleInputChange(event);
                      setCustomLocation(null);
                      if (event.target.value !== 'other') {
                        setFormData(current => ({ ...current, locationLabel: '' }));
                      }
                    }}
                    required
                  >
                    <option value="">{campuses[0].name}</option>
                    {campuses.slice(1).map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                    <option value={OTHER_LOCATION_OPTION.id}>{OTHER_LOCATION_OPTION.name}</option>
                  </select>
                </div>
                {formData.campus === 'other' && (
                  <div className="listing-field seller-edit-wide">
                    <CustomLocationCapture
                      label={formData.locationLabel}
                      onLabelChange={value => setFormData(current => ({ ...current, locationLabel: value }))}
                      location={customLocation}
                      onLocation={setCustomLocation}
                      hasSavedLocation={Boolean(user?.hasCustomLocation)}
                      disabled={loading}
                    />
                  </div>
                )}
                <div className="listing-field">
                  <label htmlFor="profile-whatsapp">WhatsApp number <span>Optional</span></label>
                  <input
                    type="tel"
                    id="profile-whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="e.g. 27821234567"
                  />
                  <p className="profile-field-note">Include the country code without spaces.</p>
                </div>
              </div>

              <footer className="seller-modal-actions">
                <button type="button" onClick={handleEditToggle} disabled={loading} className="listing-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="listing-primary"
                >
                  {loading ? <><Loader2 className="listing-spinner" aria-hidden="true" />Saving changes…</> : <><Save aria-hidden="true" />Save changes</>}
                </button>
              </footer>
            </form>
          </section>
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

      <main className="profile-shell">
        <button type="button" onClick={onBack} className="seller-products-back profile-back">
          <ArrowLeft aria-hidden="true" /> Marketplace
        </button>

        {profileLoading && !user && <ProfileSkeleton />}

        {user && (
          <>
            <header className="profile-identity-card">
              <div className="profile-avatar" aria-hidden="true">{user.name?.trim()?.charAt(0)?.toUpperCase() || <UserIC />}</div>
              <div className="profile-identity-copy">
                <p className="listing-eyebrow">Your account</p>
                <h1>{user.name}</h1>
                <p>{user.email}</p>
                <div className="profile-identity-badges">
                  <span><Store aria-hidden="true" />{user.type === 'seller' ? 'Seller account' : 'Buyer account'}</span>
                  <span className={user.subscribed ? 'is-active' : ''}>{user.subscribed ? 'Seller access active' : 'Standard access'}</span>
                </div>
              </div>
              <button type="button" onClick={handleEditToggle} className="profile-edit-button"><Edit3 aria-hidden="true" />Edit profile</button>
            </header>

            {subscriptionAlert && (
              <section className={`profile-subscription-alert is-${subscriptionAlert.type}`} aria-label="Subscription status">
                <div className="profile-alert-icon"><subscriptionAlert.icon aria-hidden="true" /></div>
                <div>
                  <h2>{subscriptionAlert.title}</h2>
                  <p>{subscriptionAlert.message}</p>
                </div>
                {(subscriptionAlert.type === 'error' || subscriptionAlert.type === 'warning') && (
                  <button type="button" onClick={handleRenewSubscription} disabled={loading || upgrading}>
                    {upgrading ? 'Checking options…' : subscriptionAlert.type === 'warning' ? 'Renew subscription' : subscriptionAlert.actionLabel}
                  </button>
                )}
              </section>
            )}

            <div className="profile-content-grid">
              <section className="profile-panel profile-details-panel" aria-labelledby="personal-information-title">
                <div className="profile-panel-heading">
                  <div><p className="listing-eyebrow">Account details</p><h2 id="personal-information-title">Personal information</h2></div>
                </div>
                <div className="profile-detail-grid">
                  <div className="profile-detail-item"><span><UserIC aria-hidden="true" /></span><div><small>Name</small><strong>{user.name}</strong></div></div>
                  <div className="profile-detail-item"><span><Mail aria-hidden="true" /></span><div><small>Email</small><strong>{user.email}</strong>{user.pendingEmail && <em>Pending: {user.pendingEmail}</em>}</div></div>
                  <div className="profile-detail-item"><span><MapPin aria-hidden="true" /></span><div><small>Location</small><strong>{user.locationLabel || campuses.find(campus => campus.id === user.campus)?.name || (user.campus === 'other' ? OTHER_LOCATION_OPTION.name : user.campus) || 'Not specified'}</strong></div></div>
                  <div className="profile-detail-item"><span><Phone aria-hidden="true" /></span><div><small>WhatsApp</small><strong>{user.whatsapp || 'Not provided'}</strong></div></div>
                  <div className="profile-detail-item"><span><CreditCard aria-hidden="true" /></span><div><small>Account type</small><strong>{user.type.charAt(0).toUpperCase() + user.type.slice(1)}</strong></div></div>
                </div>
              </section>

              <aside className="profile-side-column">
                <section className="profile-panel profile-status-panel" aria-labelledby="account-status-title">
                  <div className="profile-panel-heading"><div><p className="listing-eyebrow">Current plan</p><h2 id="account-status-title">Account status</h2></div></div>
                  <dl className="profile-status-list">
                    <div><dt>Subscription</dt><dd className={user.subscribed ? 'is-active' : ''}>{(user.subscriptionStatus || (user.subscribed ? 'ACTIVE' : 'NONE')).replace(/_/g, ' ')}</dd></div>
                    <div><dt>Account role</dt><dd>{user.type.charAt(0).toUpperCase() + user.type.slice(1)}</dd></div>
                    {user.subscriptionEndDate && <div><dt><CalendarDays aria-hidden="true" />{user.subscriptionSource === 'OFFER' ? 'Offer ends' : 'Renews or expires'}</dt><dd>{new Date(user.subscriptionEndDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}</dd></div>}
                  </dl>
                </section>

                {user.type === 'seller' && <VerificationSection userId={user._id || String(user.id)} userType={user.type} />}

                {(user.type === 'customer' || user.type === 'buyer') && (
                  <section className="profile-panel profile-seller-cta">
                    <div className="profile-seller-cta-icon"><Zap aria-hidden="true" /></div>
                    <h2>Start selling</h2>
                    <p>Activate seller access and publish listings for R25 per month. Eligible offers appear separately.</p>
                    <button type="button" onClick={handleUpgradeToSeller} disabled={loading || upgrading}>{upgrading ? 'Checking options…' : 'Become a seller'}</button>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default UserProfile;
