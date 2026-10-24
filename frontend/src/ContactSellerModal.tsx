import React from 'react';
import { MessageCircle, Smartphone, X } from 'lucide-react';
import { Product } from './types';

type Props = {
  product: Product;
  whatsappUrl: string | null;
  signedIn: boolean;
  isOwnListing: boolean;
  onWhatsApp: () => void;
  onInAppChat: () => void;
  onClose: () => void;
};

export default function ContactSellerModal({ product, whatsappUrl, signedIn, isOwnListing, onWhatsApp, onInAppChat, onClose }: Props) {
  return (
    <div className="contact-choice-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="contact-choice-modal" role="dialog" aria-modal="true" aria-labelledby="contact-choice-title">
        <button type="button" className="contact-choice-close" onClick={onClose} aria-label="Close contact options"><X /></button>
        <div className="contact-choice-kicker">Contact seller</div>
        <h2 id="contact-choice-title">Ask about {product.title}</h2>
        <p>Choose how you would like to continue the conversation with {product.sellerName || 'the seller'}.</p>
        <div className="contact-choice-grid">
          <button type="button" className="contact-choice-option" onClick={onInAppChat} disabled={isOwnListing}>
            <span className="contact-choice-icon"><MessageCircle /></span>
            <span><strong>In-app chat</strong><small>{isOwnListing ? 'This is your listing' : signedIn ? 'Message securely inside Marketplace' : 'Sign in or create an account first'}</small></span>
          </button>
          <button type="button" className="contact-choice-option" onClick={onWhatsApp} disabled={!whatsappUrl || isOwnListing}>
            <span className="contact-choice-icon"><Smartphone /></span>
            <span><strong>WhatsApp</strong><small>{isOwnListing ? 'This is your listing' : whatsappUrl ? 'Continue in WhatsApp' : 'Seller has not added WhatsApp'}</small></span>
          </button>
        </div>
      </section>
    </div>
  );
}
