import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { SITE_CONTACT, supportWhatsAppUrl } from './siteConfig';

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
      question: 'How do I create an account on Campus Cart?',
      answer: 'Creating an account is simple and free! Click the "Register" button in the top right corner, fill in your name, email, campus location, and password. Choose "Buyer" if you only want to browse and purchase items, or "Seller" if you plan to list products or services. Seller promotions are shown as separate offers and begin only when you claim them.'
    },
    {
      category: 'getting-started',
      question: 'Is Campus Cart free to use?',
      answer: 'Yes. Buyers can browse and contact sellers without a platform fee, although an account is required before starting an in-app chat or opening a seller\'s WhatsApp contact. Standard seller access costs R25 per month. Eligible sellers may also receive claimable free-period or discount offers.'
    },
    {
      category: 'buying',
      question: 'How do I find textbooks for my courses?',
      answer: 'Use the search bar to enter the textbook title, course code, or subject name, then choose the Books category. You can filter by campus manually or enable optional location discovery to keep all eligible listings visible and order them from closest to furthest. Sign in to contact the seller through in-app chat or WhatsApp.'
    },
    {
      category: 'buying',
      question: 'How do I pay for items on Campus Cart?',
      answer: 'Campus Cart does not process payments directly. All payments are arranged between you and the seller privately. Most students use cash for in-person transactions, but you can also use digital payment methods like PayShap, EFT, bank transfers, or mobile wallets. We recommend using traceable payment methods for your safety. Always inspect items before paying, and never send money before seeing the item in person.'
    },
    {
      category: 'buying',
      question: 'What should I do if I have issues with a seller or item?',
      answer: 'First, try to resolve the issue directly with the seller through your chosen chat channel. If the seller is unresponsive or the issue cannot be resolved, contact our support team from the Contact page. Provide the listing link, relevant conversation screenshots, and any supporting evidence. Campus Cart does not process item payments or issue transaction refunds, but the admin team can review reports and take action against accounts that violate platform rules.'
    },
    {
      category: 'buying',
      question: 'What does the "Verified Seller" badge mean?',
      answer: 'The Verified Seller badge means the seller submitted the requested verification photo and the admin team approved it. It is an additional trust signal, not a guarantee of an item, transaction, response time, or seller conduct. Always inspect the item and follow the same safety precautions with every seller.'
    },
    {
      category: 'selling',
      question: 'How do I become a seller on Campus Cart?',
      answer: 'You can register as a Seller or register as a Buyer and later choose Profile → Become a Seller. No admin approval is required. Standard access is R25 per month. If you are eligible for a promotion, the marketplace shows a separate offer that you must claim before its free period or discount begins.'
    },
    {
      category: 'selling',
      question: 'How much does the seller subscription cost and how do I pay?',
      answer: 'The standard seller subscription costs R25 per month. Start secure checkout from your profile; paid access activates only after the payment provider confirms the payment. Promotional periods are claim-based and do not start just because you log in.'
    },
    {
      category: 'selling',
      question: 'How do I create a good product listing?',
      answer: 'Great listings use a clear, well-lit photo and a descriptive title with the item name and key details. Describe the condition honestly, choose the correct category and pickup area, and set a fair price. Keep personal contact details out of the public description; Campus Cart reveals the account-level WhatsApp option only to signed-in users.'
    },
    {
      category: 'selling',
      question: 'How do I get verified as a seller?',
      answer: 'To request verification, open the Seller Verification section on your profile and upload a clear photo that follows the on-screen requirements. The admin team will review the submission and the profile will show the current status. If approved, a verification badge appears on your listings. The badge is a trust signal and does not change nearest-first distance ordering.'
    },
    {
      category: 'selling',
      question: 'Can I edit or delete my listings after posting them?',
      answer: 'Yes! You have full control over your listings. Go to "Manage Products" from the seller navigation to see all your active listings. Click "Edit" on any listing to update the title, description, price, photos, or category. You can also delete listings once items are sold or if you no longer want to sell them. Keep your listings updated and remove sold items promptly to maintain a good seller reputation.'
    },
    {
      category: 'safety',
      question: 'Is it safe to meet strangers from Campus Cart?',
      answer: 'Safety is our top priority! Always meet in public campus locations like libraries, cafeterias, or student centers during daylight hours. Bring a friend along for high-value transactions. Never share personal information like your home address or meet in isolated areas. Inspect items carefully before paying, and trust your instincts – if something feels wrong, walk away. Look for verified seller badges for added confidence. Most users are fellow students, but it\'s important to stay cautious.'
    },
    {
      category: 'safety',
      question: 'How do I report a suspicious listing or user?',
      answer: 'If you encounter suspicious listings, scams, or inappropriate behavior, contact our support team immediately from the Contact page. Provide the listing URL, seller name, details, and relevant screenshots. Users who violate our policies may face account suspension or permanent removal.'
    },
    {
      category: 'technical',
      question: 'Which campuses are supported by Campus Cart?',
      answer: 'Campus Cart currently lists Pretoria Central, Soshanguve South, Soshanguve North, Ga-Rankuwa, Pretoria Arcadia, Arts Campus, eMalahleni, Mbombela, and Polokwane. If you stay at an accredited residence or another location that is not listed, choose “Other campus or residence,” enter its name, and share the pickup location once. Buyers see the name, while the exact coordinates remain private and are used only for nearest-first sorting.'
    },
    {
      category: 'technical',
      question: 'Why can\'t I add new listings?',
      answer: 'If you\'re unable to add listings, check the following: (1) Activate seller status from your profile. (2) Verify that your claimed offer or R25 monthly subscription is still active. (3) Clear your browser cache and refresh the page. (4) If you just paid, allow a few moments for verified payment confirmation. If the problem persists, contact support with your account email.'
    },
    {
      category: 'technical',
      question: 'My seller subscription expired. How do I reactivate it?',
      answer: 'To reactivate an expired subscription, open your profile and choose Reactivate Subscription. Complete the secure checkout; your saved listings become visible again after the provider confirms payment.'
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
          Find answers to common questions about Campus Cart. Can't find what you're looking for?
          Contact us on WhatsApp at <a href={supportWhatsAppUrl()} style={{ color: '#10110f', textDecoration: 'underline', fontWeight: '600' }}>{SITE_CONTACT.supportPhoneDisplay}</a>.
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
            with any issues or questions about Campus Cart.
          </p>
          <a
            href={supportWhatsAppUrl('Hi, I have a question about Campus Cart')}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#007aff',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0062cc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#007aff';
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
