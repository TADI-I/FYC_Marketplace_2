import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#74756f', marginBottom: '2rem' }}>
          Last Updated: February 4, 2026
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#3e403a' }}>
          <p style={{ fontSize: '1.125rem' }}>
            Welcome to FYC Marketplace. By accessing or using our platform, you agree to be bound by 
            these Terms of Service. Please read them carefully before using our services.
          </p>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account on FYC Marketplace, you agree to comply with and be legally bound 
              by these Terms of Service. If you do not agree with any part of these terms, you may not 
              use our platform. We reserve the right to modify these terms at any time, and continued 
              use of the platform constitutes acceptance of any changes.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              2. Eligibility
            </h2>
            <p>
              FYC Marketplace is designed for first-year students at participating South African universities 
              and colleges. You must be at least 18 years old or have parental consent to use this platform. 
              By registering, you confirm that all information provided is accurate and truthful. We reserve 
              the right to verify your student status at any time.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              3. Account Responsibilities
            </h2>
            <p>You are responsible for:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Maintaining the confidentiality of your account password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>Ensuring your contact information (email, WhatsApp) remains current</li>
              <li>Complying with all applicable laws when using FYC Marketplace</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>
              FYC Marketplace is not responsible for any losses resulting from unauthorized use of your account.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              4. User Content and Listings
            </h2>
            <p>When creating listings or posting content on FYC Marketplace:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>You retain ownership of your content but grant us a license to display it on our platform</li>
              <li>You must ensure all product descriptions, images, and prices are accurate and truthful</li>
              <li>You may not post counterfeit, stolen, or illegal items</li>
              <li>You may not post content that is offensive, discriminatory, or violates others' rights</li>
              <li>You are solely responsible for all transactions conducted through your listings</li>
              <li>We reserve the right to remove any content that violates these terms without notice</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              5. Prohibited Activities
            </h2>
            <p>You agree NOT to:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Use the platform for any illegal purposes or to sell prohibited items</li>
              <li>Impersonate any person or entity, or falsely claim affiliation with any organization</li>
              <li>Engage in fraudulent activities, scams, or deceptive practices</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Use automated tools (bots, scrapers) to access or interact with the platform</li>
              <li>Post spam, advertisements for competing platforms, or irrelevant content</li>
              <li>Interfere with the proper functioning of FYC Marketplace</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>
              Violation of these prohibitions may result in immediate account suspension or termination.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              6. Seller Subscriptions and Payments
            </h2>
            <p>
              Sellers must maintain an active R25 monthly subscription to list products or services. 
              Subscription fees are non-refundable except as required by law. If your subscription lapses, 
              your listings will be hidden until reactivation. We reserve the right to change subscription 
              pricing with 30 days' notice to active subscribers.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Payment must be made via approved methods (PayShap, bank transfer). You are responsible for 
              providing proof of payment and ensuring payments are processed correctly.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              7. Transactions Between Users
            </h2>
            <p>
              FYC Marketplace is a platform that facilitates connections between buyers and sellers. 
              We do not process payments, ship items, or guarantee the quality or legality of products listed. 
              All transactions occur directly between users. By using our platform, you acknowledge that:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>FYC Marketplace is not a party to any transaction between users</li>
              <li>We are not responsible for the quality, safety, or legality of items listed</li>
              <li>We do not guarantee that sellers will fulfill their commitments</li>
              <li>You engage in transactions at your own risk</li>
              <li>Disputes between users must be resolved privately or through appropriate legal channels</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              8. Safety and Security
            </h2>
            <p>
              While we strive to maintain a safe platform, we cannot guarantee the behavior of all users. 
              You are responsible for your own safety when meeting other users. We strongly recommend:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Meeting in public campus locations during daylight hours</li>
              <li>Bringing a friend to transactions involving high-value items</li>
              <li>Inspecting items before payment</li>
              <li>Using traceable payment methods</li>
              <li>Reporting suspicious behavior immediately</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              9. Intellectual Property
            </h2>
            <p>
              All content on FYC Marketplace, including logos, designs, text, graphics, and software, 
              is owned by FYC Marketplace or its licensors and is protected by copyright and trademark laws. 
              You may not use our intellectual property without prior written permission.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              10. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, FYC Marketplace and its operators shall not be liable 
              for any indirect, incidental, special, or consequential damages arising from your use of the 
              platform, including but not limited to loss of profits, data, or goodwill. Our total liability 
              shall not exceed the amount you paid for seller subscription fees in the past 12 months.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              11. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless FYC Marketplace, its operators, employees, and affiliates 
              from any claims, damages, losses, or expenses (including legal fees) arising from your use of the 
              platform, your violation of these terms, or your violation of any rights of another party.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              12. Account Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for any reason, including 
              but not limited to violations of these terms, fraudulent activity, or abusive behavior. Upon 
              termination, your right to use the platform ceases immediately, and we may delete your account 
              data without notice.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              13. Governing Law
            </h2>
            <p>
              These Terms of Service are governed by the laws of the Republic of South Africa. Any disputes 
              arising from these terms or your use of FYC Marketplace shall be resolved in the courts of 
              South Africa. By using our platform, you consent to the jurisdiction of these courts.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              14. Changes to Terms
            </h2>
            <p>
              We may modify these Terms of Service at any time by posting updated terms on the platform. 
              Your continued use after changes are posted constitutes acceptance of the modified terms. 
              We will notify users of significant changes via email or platform notifications.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              15. Contact Information
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact us:
            </p>
            <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>WhatsApp:</strong> +27 71 112 6204</li>
              <li><strong>Email:</strong> support@firstyearcouncil.co.za</li>
              <li><strong>Website:</strong> www.firstyearcouncil.co.za</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#fbfaf6',
            border: '1px solid rgba(16, 17, 15, .17)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <p style={{ fontWeight: '600', color: '#10110f', margin: 0 }}>
              By using FYC Marketplace, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;