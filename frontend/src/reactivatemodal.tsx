import React from 'react';
import { supportWhatsAppUrl } from './siteConfig';

interface ReactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const ReactivateModal: React.FC<ReactivateModalProps> = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;

  const waLink = supportWhatsAppUrl(`Hi Campus Cart support, this is ${userEmail || ''}. Please see my seller subscription payment query.`);

  return (
    <div
      className="apple-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          apple-modal-card bg-white
          w-[360px] h-[360px]
          rounded-lg
          p-6

          flex flex-col justify-between

          drop-shadow-[0_35px_60px_rgba(0,0,0,0.6)]
          ring-2 ring-white/20
          translate-y-[-4px]
        "
      >
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
            Reactivation Request
          </h3>

          <p className="text-sm text-gray-700 text-center mb-4">
            Reactivate seller access through the secure checkout in your profile. Access is restored
            after the payment provider confirms the payment.
          </p>

          <p className="text-sm text-gray-700 text-center mb-4">
            If checkout is unavailable or you have a payment question, contact Campus Cart support.
          </p>

        </div>

        <div className="flex gap-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-center hover:bg-blue-700"
          >
            <span>WhatsApp Admin</span>
          </a>

          <button
            onClick={onClose}
            className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReactivateModal;
