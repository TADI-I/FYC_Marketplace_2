import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, UserX } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
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
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield style={{ height: '2.5rem', width: '2.5rem', color: '#10110f' }} />
          Privacy Policy
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#74756f', marginBottom: '2rem' }}>Last Updated: February 4, 2026</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#3e403a' }}>
          <p style={{ fontSize: '1.125rem' }}>
            At FYC Marketplace, we value your privacy and are committed to protecting your personal information. 
            This Privacy Policy explains how we collect, use, store, and safeguard your data when you use our platform.
          </p>

          <div style={{ backgroundColor: '#fbfaf6', border: '1px solid rgba(16, 17, 15, .17)', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye style={{ height: '1.25rem', width: '1.25rem', color: '#10110f' }} />
              Quick Summary
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', paddingLeft: '1.25rem', margin: 0 }}>
              <li>✓ We collect only essential information to operate the marketplace</li>
              <li>✓ We never sell your personal data to third parties</li>
              <li>✓ You control your profile visibility and can delete your account anytime</li>
              <li>✓ We use industry-standard security to protect your information</li>
              <li>✓ Transactions happen directly between users – we don't store payment details</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database style={{ height: '1.5rem', width: '1.5rem', color: '#d8ff4f' }} />
              1. Information We Collect
            </h2>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              Account Information
            </h3>
            <p>When you register on FYC Marketplace, we collect:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Personal Details:</strong> Name, email address, campus location</li>
              <li><strong>Contact Information:</strong> WhatsApp number (for buyer-seller communication)</li>
              <li><strong>Account Type:</strong> Whether you're a buyer, seller, or admin</li>
              <li><strong>Password:</strong> Encrypted and stored securely</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              Seller-Specific Information
            </h3>
            <p>If you subscribe as a seller, we additionally collect:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Subscription Status:</strong> Active, expired, or inactive</li>
              <li><strong>Payment References:</strong> Your payment reference (email + FYC) for verification</li>
              <li><strong>Verification Documents:</strong> Student ID photo (if you request verification)</li>
              <li><strong>Subscription History:</strong> Start dates, end dates, renewal status</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              Listing Information
            </h3>
            <p>When you create product or service listings, we collect:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Product Details:</strong> Title, description, price, category</li>
              <li><strong>Images:</strong> Photos you upload of your items</li>
              <li><strong>Location:</strong> Campus location for the listing</li>
              <li><strong>Analytics:</strong> Number of views, WhatsApp clicks (anonymous)</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              Usage Data
            </h3>
            <p>We automatically collect certain technical information:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Device Information:</strong> Browser type, operating system, device type (mobile/desktop)</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed</li>
              <li><strong>Cookies:</strong> Authentication tokens to keep you logged in</li>
              <li><strong>Interaction Data:</strong> Search queries, clicked listings, time spent on pages</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              2. How We Use Your Information
            </h2>
            <p>We use your personal data for the following purposes:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Platform Operations</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Create and manage your account</li>
                  <li>Process seller subscriptions and verify payments</li>
                  <li>Display your listings to potential buyers</li>
                  <li>Enable communication between buyers and sellers via WhatsApp</li>
                </ul>
              </div>

              <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Safety & Security</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Verify seller identities through student ID photos</li>
                  <li>Detect and prevent fraud, spam, and abuse</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Investigate reported violations or suspicious activity</li>
                </ul>
              </div>

              <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #d8ff4f', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Communication</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Send account notifications (subscription renewals, verification updates)</li>
                  <li>Provide customer support responses</li>
                  <li>Notify you of important platform updates or policy changes</li>
                </ul>
              </div>

              <div style={{ backgroundColor: '#fbfaf6', borderLeft: '4px solid #10110f', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Analytics & Improvement</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Analyze platform usage to improve features and user experience</li>
                  <li>Track listing performance (views, clicks) to help sellers optimize</li>
                  <li>Identify popular categories and trends to enhance search results</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock style={{ height: '1.5rem', width: '1.5rem', color: '#10110f' }} />
              3. Information Sharing and Disclosure
            </h2>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              What We Share Publicly
            </h3>
            <p>When you create a listing, the following information is visible to all users:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Your name (as seller)</li>
              <li>Campus location</li>
              <li>Product/service details and images</li>
              <li>Verification status (if you're a verified seller)</li>
              <li>WhatsApp number (so buyers can contact you)</li>
            </ul>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
              Important: Do not include sensitive personal information in your listing descriptions.
            </p>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              What We Never Share
            </h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>We never sell your data:</strong> Your information is never sold to advertisers or third parties</li>
              <li><strong>Private contact details:</strong> Your email address is never shared publicly</li>
              <li><strong>Payment information:</strong> We don't store credit card numbers or banking details</li>
              <li><strong>Passwords:</strong> Stored encrypted and never shared with anyone, including our staff</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10110f', marginBottom: '0.5rem', marginTop: '1rem' }}>
              When We May Share Information
            </h3>
            <p>We may share your information only in these limited circumstances:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Legal Requirements:</strong> If required by law, court order, or government request</li>
              <li><strong>Safety & Security:</strong> To prevent fraud, abuse, or protect users' safety</li>
              <li><strong>Service Providers:</strong> With trusted partners who help operate the platform (e.g., hosting providers) under strict confidentiality agreements</li>
              <li><strong>Business Transfers:</strong> If FYC Marketplace is acquired or merged, with proper user notification</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              4. Data Security
            </h2>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Encryption:</strong> All passwords are hashed using bcrypt encryption</li>
              <li><strong>HTTPS:</strong> Secure connections for all data transmission</li>
              <li><strong>Access Controls:</strong> Limited employee access to user data (admin accounts only)</li>
              <li><strong>Regular Updates:</strong> Security patches and software updates applied promptly</li>
              <li><strong>Authentication:</strong> JWT tokens with expiration for secure sessions</li>
            </ul>
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', backgroundColor: '#fbfaf6', border: '1px solid #d8ff4f', borderRadius: '0.25rem', padding: '0.75rem' }}>
              <strong>Note:</strong> While we take security seriously, no online platform can guarantee 100% security. 
              You are responsible for keeping your password confidential and logging out of shared devices.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              5. Data Retention
            </h2>
            <p>We retain your personal data as follows:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Active Accounts:</strong> Data retained while your account remains active</li>
              <li><strong>Deleted Accounts:</strong> Personal data deleted within 30 days of account deletion (except as legally required)</li>
              <li><strong>Listings:</strong> Deleted immediately when you remove them or upon account deletion</li>
              <li><strong>Transaction Logs:</strong> Anonymized analytics data may be retained for up to 2 years for platform improvement</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserX style={{ height: '1.5rem', width: '1.5rem', color: '#d8ff4f' }} />
              6. Your Privacy Rights
            </h2>
            <p>You have the following rights regarding your personal data:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ backgroundColor: 'white', border: '1px solid rgba(16, 17, 15, .24)', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Access</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>You can view and edit your profile information anytime through your account settings.</p>
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid rgba(16, 17, 15, .24)', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Correction</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Update incorrect or outdated information in your profile at any time.</p>
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid rgba(16, 17, 15, .24)', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Deletion</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Request account deletion by contacting support. We'll delete your data within 30 days.</p>
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid rgba(16, 17, 15, .24)', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Data Portability</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Request a copy of your personal data in a machine-readable format.</p>
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid rgba(16, 17, 15, .24)', padding: '1rem', borderRadius: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: '#10110f' }}>Opt-Out</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Unsubscribe from marketing emails (though essential account notifications will still be sent).</p>
              </div>
            </div>

            <p style={{ marginTop: '1rem' }}>
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@firstyearcouncil.co.za" style={{ color: '#10110f', textDecoration: 'underline' }}>
                support@firstyearcouncil.co.za
              </a>{' '}
              or WhatsApp{' '}
              <a href="https://wa.me/27711126204" style={{ color: '#10110f', textDecoration: 'underline' }}>
                +27 71 112 6204
              </a>.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              7. Cookies and Tracking
            </h2>
            <p>
              We use cookies and similar technologies to keep you logged in, remember your preferences, 
              and analyze platform usage. You can control cookies through your browser settings, but 
              disabling them may affect platform functionality (e.g., staying logged in).
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              8. Third-Party Links
            </h2>
            <p>
              FYC Marketplace may contain links to third-party websites (e.g., WhatsApp, payment providers). 
              We are not responsible for the privacy practices of these external sites. Please review their 
              privacy policies before providing any personal information.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              9. Children's Privacy
            </h2>
            <p>
              FYC Marketplace is intended for users aged 18 and older. We do not knowingly collect personal 
              information from children under 18. If we discover that a child has provided personal data, 
              we will delete it promptly. If you believe a child has registered on our platform, please 
              contact us immediately.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or 
              legal requirements. We will notify users of significant changes via email or platform notification. 
              Continued use of FYC Marketplace after changes are posted constitutes acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              11. Contact Us
            </h2>
            <p>
              If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>WhatsApp:</strong> +27 71 112 6204</li>
              <li><strong>Email:</strong> support@firstyearcouncil.co.za</li>
              <li><strong>Website:</strong> www.firstyearcouncil.co.za</li>
            </ul>
          </div>

          <div style={{
            background: '#fbfaf6',
            border: '1px solid rgba(16, 17, 15, .17)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>
              Your Privacy Matters
            </h3>
            <p style={{ color: '#3e403a' }}>
              We are committed to protecting your privacy and handling your data responsibly. If you have 
              any concerns or questions about how we use your information, please don't hesitate to reach out. 
              Your trust is important to us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;