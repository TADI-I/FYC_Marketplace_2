// AdminVerification.tsx - Fixed with proper API_BASE and WhatsApp redirect
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, MessageCircle } from 'lucide-react';
import { getVerificationRequests, processVerificationRequest } from './api';

// CRITICAL: Must match the API_BASE in api.js
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001';

export interface AdminVerificationProps {
  darkMode?: boolean;
}

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
     <rect width='100%' height='100%' fill='#f2efe7'/>
     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9c9d97' font-family='Arial, Helvetica, sans-serif' font-size='22'>Image unavailable</text>
   </svg>`
);

// Helper function to normalize South African phone numbers
const normalizeSAPhoneNumber = (phoneNumber: string): string | null => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle South African numbers
  if (cleaned.startsWith('0')) {
    // Replace leading 0 with 27 (South Africa country code)
    cleaned = '27' + cleaned.substring(1);
  } else if (!cleaned.startsWith('27')) {
    // If it doesn't start with 27, assume it's a local number and add 27
    cleaned = '27' + cleaned;
  }
  
  // Validate length (SA numbers should be 11 digits with country code: 27 + 9 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    console.warn('Invalid phone number length:', cleaned);
    return null;
  }
  
  return cleaned;
};

const AdminVerification: React.FC<AdminVerificationProps> = ({ darkMode = false }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [counts, setCounts] = useState<any>({});
  const [verificationNote, setVerificationNote] = useState<string>('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getVerificationRequests(filter);
      setRequests(data.requests || []);
      setCounts(data.counts || {});
    } catch (err) {
      console.error('Failed to fetch verification requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId: string, action: 'approve' | 'reject', whatsappNumber: string, userName: string) => {
    if (!verificationNote.trim()) {
      alert('Please enter a note before processing the verification');
      return;
    }

    try {
      // First, process the verification in the backend
      await processVerificationRequest(requestId, action, verificationNote);
      
      // Then open WhatsApp with pre-filled message
      const normalized = normalizeSAPhoneNumber(whatsappNumber);
      
      if (normalized) {
        const message = action === 'approve'
          ? `Hi ${userName}! ✅\n\nYour seller verification request has been APPROVED!\n\nAdmin Note: ${verificationNote}\n\nYou can now start selling on FYC Marketplace. Welcome aboard! 🎉`
          : `Hi ${userName},\n\nYour seller verification request has been REJECTED.\n\nReason: ${verificationNote}\n\nYou can submit a new request with the correct documentation. If you have questions, please contact support.`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${normalized}?text=${encodedMessage}`;
        
        console.log('📱 Opening WhatsApp:', whatsappUrl);
        window.open(whatsappUrl, '_blank');
      } else {
        console.warn('⚠️ Invalid phone number, cannot open WhatsApp');
        alert(`Verification ${action}d, but couldn't open WhatsApp (invalid phone number). Please contact the user manually.`);
      }
      
      // Refresh requests and reset form
      await fetchRequests();
      setProcessing(null);
      setVerificationNote('');
      
    } catch (err: any) {
      alert(err.message || `Failed to ${action} verification`);
    }
  };

  const startProcessing = (id: string) => {
    setProcessing(id);
    setVerificationNote('');
  };

  const cancelProcessing = () => {
    setProcessing(null);
    setVerificationNote('');
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  // Build image URL with proper API_BASE
  const buildImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return FALLBACK_IMAGE;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    const cleanBase = API_BASE.replace(/\/$/, '');
    const cleanPath = imageUrl.replace(/^\/+/, '');
    
    // Add cache-busting timestamp
    const cacheBuster = `?t=${Date.now()}`;
    const fullUrl = `${cleanBase}/${cleanPath}${cacheBuster}`;
    return fullUrl;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller Verification Requests</h2>

        {/* Summary Stats - Similar to AdminUsers */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fbfaf6',
          borderRadius: '0.5rem',
          border: '1px solid rgba(16, 17, 15, .17)'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
              {counts.all || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
              Total Requests
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#eab308' }}>
              {counts.pending || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
              Pending
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d8ff4f' }}>
              {counts.approved || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
              Approved
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>
              {counts.rejected || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
              Rejected
            </div>
          </div>
        </div>

        {/* Detailed Stats Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {counts.all || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Total Requests
                </div>
              </div>
              <div className="bg-gray-200 rounded-full p-3">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-900">
                  {counts.pending || 0}
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  Pending
                </div>
              </div>
              <div className="bg-yellow-200 rounded-full p-3">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {counts.approved || 0}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Approved
                </div>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-900">
                  {counts.rejected || 0}
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Rejected
                </div>
              </div>
              <div className="bg-red-200 rounded-full p-3">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {counts[status] > 0 && (
                <span className="ml-2 bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {counts[status]}
                </span>
              )}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500">No {filter !== 'all' ? filter : ''} verification requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const imageUrl = buildImageUrl(request.imageUrl);
              const whatsappNumber = request.user?.whatsapp || request.user?.phoneNumber || '';
              const userName = request.user?.name || 'User';
              
              return (
                <div key={request._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setSelectedImage(imageUrl)}
                        className="relative group"
                      >
                        <img
                          src={imageUrl}
                          alt="ID verification"
                          onError={(e) => { 
                            console.error('❌ Image failed:', imageUrl);
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; 
                          }}
                          onLoad={() => console.log('✅ Image loaded:', imageUrl)}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-opacity flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{userName}</h3>
                          <p className="text-sm text-gray-600">{request.user?.email}</p>
                          <p className="text-sm text-gray-500">Campus: {request.user?.campus}</p>
                          {whatsappNumber && (
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp: {whatsappNumber}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                        {request.processedAt && (
                          <> • Processed: {new Date(request.processedAt).toLocaleString()}</>
                        )}
                      </div>

                      {request.adminNote && (
                        <div className="bg-gray-50 rounded p-2 mb-3">
                          <p className="text-xs text-gray-600">
                            <strong>Admin Note:</strong> {request.adminNote}
                          </p>
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {processing === request._id ? (
                            <div className="flex flex-col gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Message to send via WhatsApp *
                                </label>
                                <textarea
                                  value={verificationNote}
                                  onChange={(e) => setVerificationNote(e.target.value)}
                                  placeholder="This message will be sent to the seller via WhatsApp..."
                                  className="w-full p-2 border border-gray-300 rounded resize-none"
                                  rows={3}
                                />
                              </div>

                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleProcess(request._id, 'approve', whatsappNumber, userName)}
                                  disabled={!whatsappNumber}
                                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                  title={!whatsappNumber ? 'No WhatsApp number available' : ''}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <MessageCircle className="h-4 w-4" />
                                  <span>Approve & Send</span>
                                </button>
                                <button
                                  onClick={() => handleProcess(request._id, 'reject', whatsappNumber, userName)}
                                  disabled={!whatsappNumber}
                                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                  title={!whatsappNumber ? 'No WhatsApp number available' : ''}
                                >
                                  <XCircle className="h-4 w-4" />
                                  <MessageCircle className="h-4 w-4" />
                                  <span>Reject & Send</span>
                                </button>
                                <button
                                  onClick={cancelProcessing}
                                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>

                              {!whatsappNumber && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                                  ⚠️ No WhatsApp number found for this user. You'll need to contact them manually.
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => startProcessing(request._id)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Process & Notify via WhatsApp
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
          style={{ cursor: 'pointer' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 rounded-full transition-all z-50 shadow-lg"
            aria-label="Close"
          >
            <XCircle className="h-8 w-8" />
          </button>
          <img
            src={selectedImage}
            alt="ID verification full size"
            onError={(e) => { 
              console.error('❌ Full size failed:', selectedImage);
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; 
            }}
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

export default AdminVerification;