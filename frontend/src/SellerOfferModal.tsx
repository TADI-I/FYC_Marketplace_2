import React from 'react';
import { Check, Clock3, Sparkles, X } from 'lucide-react';
import { SellerOffer } from './types';
import { useAccessibleModal } from './useAccessibleModal';

type SharedModalProps = {
  onClose: () => void;
};

type SellerOfferModalProps = SharedModalProps & {
  offer: SellerOffer;
  claiming: boolean;
  error?: string;
  onClaim: () => void;
};

export const SellerOfferModal: React.FC<SellerOfferModalProps> = ({
  offer,
  claiming,
  error,
  onClaim,
  onClose
}) => {
  const dialogRef = useAccessibleModal(onClose);

  return (
    <div className="premium-modal-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className="premium-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-offer-modal-title"
        aria-describedby="seller-offer-modal-description"
      >
        <button type="button" className="premium-modal-close" onClick={onClose} aria-label="Close offer">
          <X aria-hidden="true" />
        </button>

        <div className="premium-modal-icon premium-modal-icon-offer" aria-hidden="true">
          <Sparkles />
        </div>
        <p className="premium-modal-eyebrow">Exclusive seller offer</p>
        <h2 id="seller-offer-modal-title">You're eligible for {offer.name}</h2>
        <p id="seller-offer-modal-description" className="premium-modal-copy">{offer.description}</p>

        <div className="premium-modal-detail">
          <Clock3 aria-hidden="true" />
          <div>
            <strong>{offer.durationMonths} months of seller access</strong>
            <span>The period begins only when you claim it.</span>
          </div>
        </div>

        {error && <p className="premium-modal-error" role="alert">{error}</p>}

        <button
          type="button"
          className="premium-modal-primary"
          onClick={onClaim}
          disabled={claiming}
          data-autofocus="true"
        >
          {claiming ? 'Activating your offer…' : `Claim ${offer.durationMonths} Months Free`}
        </button>
        <button type="button" className="premium-modal-secondary" onClick={onClose}>
          Maybe later
        </button>
        <p className="premium-modal-footnote">No payment is required. This offer can be claimed once.</p>
      </div>
    </div>
  );
};

type SellerOfferSuccessModalProps = SharedModalProps & {
  expiresAt?: string | Date | null;
};

export const SellerOfferSuccessModal: React.FC<SellerOfferSuccessModalProps> = ({ expiresAt, onClose }) => {
  const dialogRef = useAccessibleModal(onClose);
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="premium-modal-layer" role="presentation">
      <div
        ref={dialogRef}
        className="premium-modal-card premium-modal-card-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-offer-success-title"
        aria-describedby="seller-offer-success-description"
      >
        <div className="premium-modal-icon premium-modal-icon-success" aria-hidden="true">
          <Check />
        </div>
        <p className="premium-modal-eyebrow">Offer activated</p>
        <h2 id="seller-offer-success-title">You're back in business</h2>
        <p id="seller-offer-success-description" className="premium-modal-copy">
          Your seller access is active{formattedExpiry ? ` until ${formattedExpiry}` : ''}. You can start advertising your products again.
        </p>
        <button type="button" className="premium-modal-primary" onClick={onClose} data-autofocus="true">
          Start selling
        </button>
      </div>
    </div>
  );
};
