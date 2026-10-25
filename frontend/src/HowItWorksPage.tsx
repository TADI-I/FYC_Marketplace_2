import React from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock3,
  LocateFixed,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus
} from 'lucide-react';

interface HowItWorksPageProps {
  onBack: () => void;
  onRegister: () => void;
}

const buyerSteps = [
  {
    icon: Search,
    title: 'Discover what students are selling',
    description: 'Browse products and services without an account. Search by name, category or campus to quickly narrow the marketplace.'
  },
  {
    icon: LocateFixed,
    title: 'See the closest listings first',
    description: 'Location is optional. When you enable it, every eligible listing stays visible and Campus Cart orders them from closest to furthest.'
  },
  {
    icon: MessageCircle,
    title: 'Sign in and start a conversation',
    description: 'Choose secure in-app chat or WhatsApp. Contact details stay protected until you sign in, and unread in-app messages trigger an email reminder after ten minutes.'
  },
  {
    icon: PackageCheck,
    title: 'Inspect, agree and collect safely',
    description: 'Confirm the condition, price, payment method and meeting point directly with the seller. Campus Cart connects you; it does not process the item payment.'
  }
];

const sellerSteps = [
  {
    icon: UserPlus,
    title: 'Create or upgrade your account',
    description: 'Start as a seller or upgrade later from your account. Standard seller access is R25 per month, while eligible offers are shown separately for you to claim.'
  },
  {
    icon: Store,
    title: 'Publish a trustworthy listing',
    description: 'Add a clear photo, honest description, fair price, category and pickup area. If you stay at an accredited residence or an unlisted location, add its name and share its private map point once.'
  },
  {
    icon: MessageCircle,
    title: 'Reply from your inbox or WhatsApp',
    description: 'Buyer conversations stay connected to the relevant product. If an in-app message remains unread for ten minutes, Campus Cart emails you a reminder.'
  },
  {
    icon: BadgeCheck,
    title: 'Manage and build buyer confidence',
    description: 'Keep listings current, review interest and optionally request seller verification. A verified badge helps buyers recognise accounts reviewed by the admin team.'
  }
];

const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBack, onRegister }) => (
  <div className="how-page">
    <button type="button" className="how-back" onClick={onBack}>
      <ArrowLeft aria-hidden="true" />
      Back to marketplace
    </button>

    <section className="how-hero" aria-labelledby="how-title">
      <div className="how-hero-copy">
        <span className="how-eyebrow">How Campus Cart works</span>
        <h1 id="how-title">From a useful find to a safe campus handover.</h1>
        <p>
          Campus Cart helps varsity students discover nearby listings, talk directly and arrange the
          exchange themselves. Browsing is simple, contact details are protected, and every conversation
          stays connected to the product.
        </p>
        <div className="how-hero-actions">
          <button type="button" className="how-primary-action" onClick={onBack}>Browse marketplace</button>
          <button type="button" className="how-secondary-action" onClick={onRegister}>Create an account</button>
        </div>
      </div>

      <div className="how-hero-summary" aria-label="Campus Cart highlights">
        <div><LocateFixed aria-hidden="true" /><span><strong>Nearby first</strong><small>No distance cutoff</small></span></div>
        <div><ShieldCheck aria-hidden="true" /><span><strong>Protected contact</strong><small>Sign-in required</small></span></div>
        <div><Clock3 aria-hidden="true" /><span><strong>Helpful reminders</strong><small>After 10 minutes unread</small></span></div>
      </div>
    </section>

    <section className="how-audience" aria-labelledby="buyer-title">
      <header className="how-section-heading">
        <span className="how-section-icon"><ShoppingBag aria-hidden="true" /></span>
        <div>
          <span className="how-eyebrow">Buying on Campus Cart</span>
          <h2 id="buyer-title">Find it, discuss it, collect it.</h2>
        </div>
      </header>

      <ol className="how-step-grid">
        {buyerSteps.map(({ icon: Icon, title, description }, index) => (
          <li className="how-step" key={title}>
            <div className="how-step-top"><span>{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /></div>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="how-audience how-audience-seller" aria-labelledby="seller-title">
      <header className="how-section-heading">
        <span className="how-section-icon"><Store aria-hidden="true" /></span>
        <div>
          <span className="how-eyebrow">Selling on Campus Cart</span>
          <h2 id="seller-title">List clearly and respond confidently.</h2>
        </div>
      </header>

      <ol className="how-step-grid">
        {sellerSteps.map(({ icon: Icon, title, description }, index) => (
          <li className="how-step" key={title}>
            <div className="how-step-top"><span>{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /></div>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="how-details" aria-label="Pricing and safety">
      <article className="how-price-card">
        <span className="how-eyebrow">Straightforward pricing</span>
        <h2>Browse free. Sell for R25 monthly.</h2>
        <div className="how-price-lines">
          <div><Check aria-hidden="true" /><span><strong>Buyers</strong> browse and contact sellers free.</span></div>
          <div><Check aria-hidden="true" /><span><strong>Sellers</strong> can publish unlimited active listings while subscribed.</span></div>
          <div><Check aria-hidden="true" /><span>Any eligible promotion appears as an offer and starts only when claimed.</span></div>
        </div>
      </article>

      <article className="how-safety-card">
        <ShieldCheck aria-hidden="true" />
        <span className="how-eyebrow">Meet smart</span>
        <h2>Keep the handover safe.</h2>
        <ul>
          <li>Meet in a busy, well-lit public campus area.</li>
          <li>Inspect the item before making payment.</li>
          <li>Use traceable payments and confirm the recipient.</li>
          <li>Bring a friend for higher-value exchanges.</li>
        </ul>
      </article>
    </section>

    <section className="how-cta" aria-labelledby="how-cta-title">
      <div>
        <span className="how-eyebrow">Ready when you are</span>
        <h2 id="how-cta-title">Your next campus find could be a few taps away.</h2>
      </div>
      <div className="how-hero-actions">
        <button type="button" className="how-primary-action" onClick={onBack}>Explore listings</button>
        <button type="button" className="how-secondary-action" onClick={onRegister}>Join Campus Cart</button>
      </div>
    </section>
  </div>
);

export default HowItWorksPage;
