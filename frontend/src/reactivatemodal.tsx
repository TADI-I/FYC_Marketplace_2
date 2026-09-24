import React from 'react';

interface ReactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const ReactivateModal: React.FC<ReactivateModalProps> = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;

  const waLink = `https://wa.me/27711126204?text=${encodeURIComponent(
    `Hi Market place admin this is: ${userEmail || ''} ,please see proof of payment for reactivating my subscription as a seller.`
  )}`;

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
            Your request has been sent. Please send proof of payment to the admin on WhatsApp.
            Account will be reactivated once payment is confirmed within 24 hours.
          </p>

          <p className="text-sm text-gray-700 text-center mb-4">
            Use the following details to make your payment:
          </p>

          <div className="bg-gray-50 p-3 rounded-lg text-center space-y-1">
            <p className="font-mono text-sm">
              <b>PAYSHAP:</b> +27629622755
            </p>
            <p className="font-mono text-sm">
              <b>FNB – Account:</b> 62315723321
            </p>
            <p className="font-mono text-sm">
              <b>Branch Code:</b> 250655
            </p>
            <p className="font-mono text-sm mt-2">
              <b>Reference:</b> Your registered email + FYC
            </p>
          </div>
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
