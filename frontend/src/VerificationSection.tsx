// VerificationSection.tsx - Add to your components
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Upload, Shield, Loader2 } from 'lucide-react';
import { submitVerificationRequest, getVerificationStatus } from './api';
import { showNotification } from './AppNotificationModal';
import { ListSkeleton } from './LoadingSkeletons';

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
      showNotification({ type: 'warning', title: 'Photo required', message: 'Please select an ID photo before submitting.' });
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await submitVerificationRequest(userId, selectedFile);
      showNotification({ type: 'success', title: 'Verification submitted', message: 'Your ID is queued for administrator review.' });
      setSelectedFile(null);
      setPreview(null);
      await fetchStatus();
    } catch (err: any) {
      const message = err.message || 'Failed to submit verification request';
      setError(message);
      showNotification({ type: 'error', title: 'Verification not submitted', message });
    } finally {
      setUploading(false);
    }
  };

  if (userType !== 'seller') return null;

  if (loading) {
    return (
      <section className="profile-panel profile-verification-panel">
        <ListSkeleton rows={2} />
      </section>
    );
  }

  return (
    <section className="profile-panel profile-verification-panel verification-section" aria-labelledby="seller-verification-title">
      <div className="profile-panel-heading">
        <div>
          <p className="listing-eyebrow">Trust and safety</p>
          <h2 id="seller-verification-title">Seller verification</h2>
        </div>
        <div className="profile-verification-shield"><Shield aria-hidden="true" /></div>
      </div>

      {status?.verified ? (
        <div className="profile-verification-state is-verified">
          <CheckCircle aria-hidden="true" />
          <div>
            <strong>Verified seller</strong>
            <p>Verified on {new Date(status.verifiedAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      ) : status?.hasPendingRequest ? (
        <div className="profile-verification-state is-pending">
          <Clock aria-hidden="true" />
          <div>
            <strong>Review in progress</strong>
            <p>Your verification request is with the admin team.</p>
          </div>
        </div>
      ) : (
        <div className="profile-verification-form">
          <div className="profile-verification-intro">
            <strong>Build buyer confidence</strong>
            <p>Upload a clear photo of yourself holding your ID to request a verified seller badge.</p>
          </div>

          {error && (
            <div className="profile-verification-error" role="alert">
              <XCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="profile-verification-upload-wrap">
            {preview ? (
              <div className="profile-verification-preview">
                <img src={preview} alt="Selected verification preview" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  aria-label="Remove verification photo"
                >
                  <XCircle aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="profile-verification-upload">
                <div>
                  <Upload aria-hidden="true" />
                  <strong>Choose verification photo</strong>
                  <span>JPEG or PNG · Maximum 5 MB</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          {selectedFile && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={uploading}
              className="profile-verification-submit"
            >
              {uploading ? <><Loader2 className="listing-spinner" aria-hidden="true" />Submitting…</> : <><Shield aria-hidden="true" />Submit for verification</>}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default VerificationSection;
