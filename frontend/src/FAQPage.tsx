import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQPageProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      category: 'getting-started',
      question: 'How do I create an account on FYC Marketplace?',
      answer: 'Creating an account is simple and free! Click the "Register" button in the top right corner, fill in your name, email, campus location, and password. Choose "Buyer" if you only want to browse and purchase items, or "Seller" if you plan to list products or services. After registration, you can start browsing immediately. Sellers will need to subscribe (R25/month) before adding listings.'
    },
    {
      category: 'getting-started',
      question: 'Is FYC Marketplace free to use?',
      answer: 'Yes! For buyers, FYC Marketplace is completely free – no registration fees, browsing fees, or transaction fees. You can search, browse, and contact sellers without paying anything. For sellers, we charge an affordable R25 per month subscription that allows you to list unlimited products and services. This low monthly fee helps us maintain the platform and provide excellent service to our student community.'
    },
    {
      category: 'buying',
      question: 'How do I find textbooks for my courses?',
      answer: 'Use our search bar to type in the textbook title, course code, or subject name. You can also filter by the "Books" category to see only book listings. For best results, filter by your campus location to find textbooks available near you for easy pick-up. Each listing shows the book\'s condition, price, and seller information. Contact the seller via WhatsApp to ask questions or arrange a purchase.'
    },
    {
      category: 'buying',
      question: 'How do I pay for items on FYC Marketplace?',
      answer: 'FYC Marketplace does not process payments directly. All payments are arranged between you and the seller privately. Most students use cash for in-person transactions, but you can also use digital payment methods like PayShap, EFT, bank transfers, or mobile wallets. We recommend using traceable payment methods for your safety. Always inspect items before paying, and never send money before seeing the item in person.'
    },
    {
      category: 'buying',
      question: 'What should I do if I have issues with a seller or item?',
      answer: 'First, try to resolve the issue directly with the seller through WhatsApp. Most sellers are fellow students who want positive outcomes. If the seller is unresponsive or the issue cannot be resolved, contact our support team on WhatsApp at +27 71 112 6204. Provide details about the transaction, screenshots of your conversations, and any evidence. While we cannot process refunds directly, we can help mediate disputes and take action against problematic sellers, including account suspension.'
    },
    {
      category: 'buying',
      question: 'What does the "Verified Seller" badge mean?',
      answer: 'The Verified Seller badge indicates that the seller has submitted a photo of themselves holding their student ID, which our admin team has reviewed and approved. Verified sellers are more trustworthy because their identity has been confirmed. They also tend to respond faster and provide better service. Listings from verified sellers appear first in search results. While not all unverified sellers are problematic, the badge gives buyers extra confidence when making purchases.'
    },
    {
      category: 'selling',
      question: 'How do I become a seller on FYC Marketplace?',
      answer: 'To become a seller, register for an account and select "Seller" as your account type. After registration, upgrade to a seller subscription for R25 per month. This unlocks the ability to create unlimited product and service listings. Make sure to add your WhatsApp number during registration so buyers can contact you directly. Once subscribed, click "Add Listing" to create your first product or service listing. Your subscription renews monthly until you cancel.'
    },
    {
      category: 'selling',
      question: 'How much does the seller subscription cost and how do I pay?',
      answer: 'The seller subscription costs R25 per month – one of the most affordable rates in South Africa! Payment methods include PayShap (+27629622755), bank transfer to FNB Account 62315723321 (Branch Code: 250655), or EFT. Use your registered email address + "FYC" as the payment reference. After payment, send proof of payment to our WhatsApp support (+27 71 112 6204), and your account will be activated within 24 hours. Your subscription renews automatically every 30 days.'
    },
    {
      category: 'selling',
      question: 'How do I create a good product listing?',
      answer: 'Great listings start with clear, well-lit photos taken from multiple angles. Write a descriptive title that includes the item name and key details (e.g., "Engineering Mathematics Textbook - 5th Edition - Like New"). In the description, mention the item\'s condition honestly, include your campus location, specify any delivery options, and add your WhatsApp number. Set a fair price by checking what similar items sell for. The more accurate and detailed your listing, the faster you\'ll sell your items and build trust with buyers.'
    },
    {
      category: 'selling',
      question: 'How do I get verified as a seller?',
      answer: 'To get verified, go to your profile page and look for the "Seller Verification" section. Upload a clear photo of yourself holding your student ID card. Make sure your face and ID details are visible in the photo. Our admin team will review your submission within 24-48 hours. If approved, you\'ll receive a blue verification badge on all your listings. Verified sellers appear first in search results and earn more buyer trust, which typically leads to 50% faster sales.'
    },
    {
      category: 'selling',
      question: 'Can I edit or delete my listings after posting them?',
      answer: 'Yes! You have full control over your listings. Go to "My Products" from your dashboard to see all your active listings. Click "Edit" on any listing to update the title, description, price, photos, or category. You can also delete listings once items are sold or if you no longer want to sell them. Keep your listings updated and remove sold items promptly to maintain a good seller reputation.'
    },
    {
      category: 'safety',
      question: 'Is it safe to meet strangers from FYC Marketplace?',
      answer: 'Safety is our top priority! Always meet in public campus locations like libraries, cafeterias, or student centers during daylight hours. Bring a friend along for high-value transactions. Never share personal information like your home address or meet in isolated areas. Inspect items carefully before paying, and trust your instincts – if something feels wrong, walk away. Look for verified seller badges for added confidence. Most users are fellow students, but it\'s important to stay cautious.'
    },
    {
      category: 'safety',
      question: 'How do I report a suspicious listing or user?',
      answer: 'If you encounter suspicious listings, scams, or inappropriate behavior, contact our support team immediately on WhatsApp at +27 71 112 6204. Provide the listing URL, seller name, and details about the issue. Include screenshots of any suspicious conversations. We take reports seriously and will investigate within 24 hours. Users who violate our policies face account suspension or permanent bans. Help us keep FYC Marketplace safe by reporting problems promptly.'
    },
    {
      category: 'technical',
      question: 'Which campuses are supported by FYC Marketplace?',
      answer: 'FYC Marketplace currently supports the following campus locations: Pretoria Central, Soshanguve South, Soshanguve North, Ga-Rankuwa, Pretoria Arcadia, Arts Campus, eMalahleni, Mbombela, and Polokwane. When creating your account or listing items, select your campus from the dropdown menu. This helps buyers find items available near them for easy collection. We\'re constantly expanding to new campuses based on student demand.'
    },
    {
      category: 'technical',
      question: 'Why can\'t I add new listings?',
      answer: 'If you\'re unable to add listings, check the following: (1) Make sure you\'re registered as a seller account type. (2) Verify that your R25 monthly subscription is active and hasn\'t expired. (3) Clear your browser cache and refresh the page. (4) If your account was recently created or reactivated, wait 5-10 minutes for system updates. If the problem persists, contact support on WhatsApp at +27 71 112 6204 with your account email, and we\'ll resolve it within 24 hours.'
    },
    {
      category: 'technical',
      question: 'My seller subscription expired. How do I reactivate it?',
      answer: 'To reactivate your expired subscription, go to your profile page and click "Request Reactivation." Make a payment of R25 using PayShap (+27629622755) or bank transfer (FNB 62315723321, Branch 250655). Use your email + "FYC" as the reference. Send proof of payment to our WhatsApp support at +27 71 112 6204. Our admin team will reactivate your account within 24 hours. All your previous listings will remain saved and will become visible again once reactivated.'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'buying', name: 'Buying' },
    { id: 'selling', name: 'Selling' },
    { id: 'safety', name: 'Safety & Security' },
    { id: 'technical', name: 'Technical Issues' }
  ];

  const filteredFaqs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#3e403a', marginBottom: '2rem' }}>
          Find answers to common questions about FYC Marketplace. Can't find what you're looking for? 
          Contact us on WhatsApp at <a href="https://wa.me/27711126204" style={{ color: '#10110f', textDecoration: 'underline', fontWeight: '600' }}>+27 71 112 6204</a>.
        </p>

        {/* Category Filter - FIXED FOR MOBILE */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3e403a', marginBottom: '0.75rem' }}>
            Filter by Category:
          </h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.5rem'
          }}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: selectedCategory === category.id ? '#10110f' : '#f2efe7',
                  color: selectedCategory === category.id ? 'white' : '#3e403a',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(16, 17, 15, .17)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category.id) {
                    e.currentTarget.style.backgroundColor = '#f2efe7';
                  }
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items - FIXED WITH GRAY BACKGROUND */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              style={{
                border: '1px solid rgba(16, 17, 15, .17)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                backgroundColor: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <button
                onClick={() => toggleFaq(index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  textAlign: 'left',
                  backgroundColor: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fbfaf6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#10110f',
                  paddingRight: '1rem',
                  flex: 1
                }}>
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp style={{ height: '1.25rem', width: '1.25rem', color: '#10110f', flexShrink: 0 }} />
                ) : (
                  <ChevronDown style={{ height: '1.25rem', width: '1.25rem', color: '#9c9d97', flexShrink: 0 }} />
                )}
              </button>
              {openIndex === index && (
                <div style={{
                  padding: '0 1.25rem 1.25rem',
                  backgroundColor: '#fbfaf6' // GRAY BACKGROUND FOR ANSWER
                }}>
                  <p style={{
                    color: '#3e403a',
                    lineHeight: '1.75',
                    margin: 0
                  }}>
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div style={{
          marginTop: '3rem',
          background: '#fbfaf6',
          border: '1px solid rgba(16, 17, 15, .17)',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
            Still Have Questions?
          </h2>
          <p style={{ color: '#3e403a', marginBottom: '1rem' }}>
            Our support team is here to help! Reach out to us on WhatsApp for quick assistance 
            with any issues or questions about FYC Marketplace.
          </p>
          <a
            href="https://wa.me/27711126204?text=Hi%2C%20I%20have%20a%20question%20about%20FYC%20Marketplace"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#d8ff4f',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#bfe638';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#d8ff4f';
            }}
          >
            Contact Support on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;