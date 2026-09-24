import React from 'react';
import { ArrowLeft, UserPlus, Search, ShoppingCart, MessageCircle, Package, Star, Shield } from 'lucide-react';

interface HowItWorksPageProps {
  onBack: () => void;
}

const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBack }) => {
  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <button 
        onClick={onBack}
        style={{
          backgroundColor: '#10110f',
          color: 'white',
          padding: '0.5rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#000000'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10110f'}
      >
        <ArrowLeft style={{ height: '1.25rem', width: '1.25rem' }} />
        <span>Back to Home</span>
      </button>

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1.5rem' }}>
          How FYC Marketplace Works
        </h1>
        
        <p style={{ fontSize: '1.125rem', color: '#3e403a', marginBottom: '2rem' }}>
          FYC Marketplace makes buying and selling student essentials simple, safe, and affordable. 
          Whether you're a buyer looking for textbooks or a seller wanting to make extra money, 
          follow these easy steps to get started.
        </p>

        {/* For Buyers Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart style={{ height: '2rem', width: '2rem', color: '#10110f' }} />
            For Buyers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Step 1 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#10110f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserPlus style={{ height: '1.25rem', width: '1.25rem', color: '#10110f' }} />
                    Create a Free Account
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Sign up with your email address and select your campus location. Registration is 
                    completely free for buyers, and you'll have immediate access to thousands of student 
                    listings across South Africa.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Tip:</strong> Use your university email for credibility when contacting sellers.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#d8ff4f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search style={{ height: '1.25rem', width: '1.25rem', color: '#d8ff4f' }} />
                    Search for Items
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Use our search bar to find specific textbooks, electronics, or services. Filter results 
                    by category (books, electronics, services, etc.) and campus location to find items 
                    available near you. This makes it easy to arrange quick pick-ups without expensive 
                    shipping costs.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Tip:</strong> Filter by your campus to find sellers nearby for easy meet-ups.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#d8ff4f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageCircle style={{ height: '1.25rem', width: '1.25rem', color: '#d8ff4f' }} />
                    Contact the Seller
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Found something you like? Click the "WhatsApp Me" button on any listing to contact 
                    the seller directly. You can ask questions about the item's condition, negotiate the 
                    price, and arrange a safe meeting location – all through WhatsApp.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Safety Tip:</strong> Always meet in public campus locations like libraries 
                    or cafeterias. Look for verified seller badges for added trust.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#10110f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  4
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package style={{ height: '1.25rem', width: '1.25rem', color: '#10110f' }} />
                    Complete Your Purchase
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Arrange payment and item collection with the seller. Most transactions happen in 
                    person on campus, making it safe and convenient. Always inspect items before paying, 
                    and confirm everything matches the listing description.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Tip:</strong> Bring exact change or use digital payment methods like PayShap 
                    or EFT for convenience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* For Sellers Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package style={{ height: '2rem', width: '2rem', color: '#d8ff4f' }} />
            For Sellers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Seller Step 1 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#10110f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserPlus style={{ height: '1.25rem', width: '1.25rem', color: '#10110f' }} />
                    Register as a Seller
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Create your account and choose "Seller" as your account type. Upgrade to a seller 
                    subscription for just R25 per month to unlock unlimited listings. This affordable 
                    monthly fee gives you access to thousands of potential buyers across multiple campuses.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Note:</strong> Provide your WhatsApp number during registration so buyers 
                    can contact you easily.
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Step 2 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#d8ff4f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package style={{ height: '1.25rem', width: '1.25rem', color: '#d8ff4f' }} />
                    Create Your Listing
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Click "Add Listing" to create a new product or service listing. Add a clear title, 
                    detailed description, fair price, and high-quality photos. Be specific about the 
                    item's condition, location, and any delivery options you offer. The more details you 
                    provide, the more trust you build with potential buyers.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Tip:</strong> Take well-lit photos from multiple angles and mention any defects 
                    honestly to avoid disputes later.
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Step 3 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#d8ff4f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageCircle style={{ height: '1.25rem', width: '1.25rem', color: '#d8ff4f' }} />
                    Respond to Buyers
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    When buyers contact you via WhatsApp, respond promptly and professionally. Answer 
                    their questions honestly, negotiate prices fairly, and arrange safe meeting locations 
                    on campus. Quick responses and good communication help you sell faster.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Safety Tip:</strong> Always meet in public campus areas and bring a friend 
                    if possible, especially for high-value items.
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Step 4 */}
            <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#10110f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  4
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star style={{ height: '1.25rem', width: '1.25rem', color: '#10110f' }} />
                    Get Verified (Optional)
                  </h3>
                  <p style={{ color: '#3e403a', marginBottom: '0.75rem' }}>
                    Boost buyer confidence by becoming a verified seller! Upload a photo of yourself 
                    holding your student ID, and our admin team will review it within 24-48 hours. 
                    Verified sellers get a special badge on their listings, appear first in search 
                    results, and earn more trust from buyers.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                    <strong>Benefit:</strong> Verified sellers typically sell items 50% faster than 
                    unverified sellers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div style={{
          background: '#fbfaf6',
          border: '1px solid rgba(16, 17, 15, .17)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem' }}>
            Simple, Affordable Pricing
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d8ff4f', marginBottom: '0.5rem' }}>For Buyers</h3>
              <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>FREE</p>
              <p style={{ color: '#74756f' }}>
                Browse and buy unlimited items with no fees, no hidden charges, and no subscriptions.
              </p>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d8ff4f', marginBottom: '0.5rem' }}>For Sellers</h3>
              <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>
                R25<span style={{ fontSize: '1.125rem' }}>/month</span>
              </p>
              <p style={{ color: '#74756f' }}>
                List unlimited products and services, manage your inventory, and connect with thousands 
                of buyers across all campuses.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Tips */}
        <div style={{
          backgroundColor: '#fbfaf6',
          border: '1px solid #d8ff4f',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ height: '1.5rem', width: '1.5rem', color: '#10110f' }} />
            Safety Tips
          </h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#3e403a', paddingLeft: '1.25rem', margin: 0 }}>
            <li>Always meet in public places on campus (libraries, cafeterias, student centers)</li>
            <li>Inspect items thoroughly before paying</li>
            <li>Bring a friend along for high-value transactions</li>
            <li>Use digital payment methods (PayShap, EFT) for traceable transactions</li>
            <li>Trust your instincts – if something feels off, walk away</li>
            <li>Look for verified seller badges for added confidence</li>
          </ul>
        </div>

        {/* Call to Action */}
        <div style={{
          textAlign: 'center',
          background: '#10110f',
          color: 'white',
          borderRadius: '0.5rem',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>Ready to Get Started?</h2>
          <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
            Join thousands of first-year students already buying and selling on FYC Marketplace!
          </p>
          <button 
            onClick={onBack}
            style={{
              backgroundColor: 'white',
              color: '#10110f',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f2efe7'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'}
          >
            Start Shopping Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;