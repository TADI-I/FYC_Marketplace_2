// VerificationSection.tsx - Add to your components
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Upload, Shield } from 'lucide-react';
import { submitVerificationRequest, getVerificationStatus } from './api';

interface VerificationSectionProps {
  userId: string;
  userType: string;
}

const VerificationSection: React.FC<VerificationSectionProps> = ({ userId, userType }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userType === 'seller') {
      fetchStatus();
    }
  }, [userId, userType]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getVerificationStatus(userId);
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an ID photo');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await submitVerificationRequest(userId, selectedFile);
      setSuccess('Verification request submitted! Admin will review your ID shortly.');
      setSelectedFile(null);
      setPreview(null);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification request');
    } finally {
      setUploading(false);
    }
  };

  if (userType !== 'seller') return null;

  if (loading) {
    return (
      <div className="apple-surface bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-surface verification-section bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Seller Verification</h3>
      </div>

      {status?.verified ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Verified Seller</p>
              <p className="text-sm text-blue-600">
                Your account was verified on {new Date(status.verifiedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : status?.hasPendingRequest ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Verification Pending</p>
              <p className="text-sm text-yellow-600">
                Your verification request is being reviewed by our admin team.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Get verified!</strong> Upload a photo of yourself holding your ID to gain a verified seller badge.
            </p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              <li>Increases buyer trust</li>
              <li>Your products appear first in search results</li>
              <li>Stand out from unverified sellers</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">{success}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload ID Photo
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Take a clear photo of yourself holding your ID card. Make sure your face and ID details are visible.
            </p>
            
            {preview ? (
              <div className="relative">
                <img 
                  src={preview} 
                  alt="ID preview" 
                  className="w-full h-64 object-cover rounded-lg border"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          {selectedFile && (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationSection;
