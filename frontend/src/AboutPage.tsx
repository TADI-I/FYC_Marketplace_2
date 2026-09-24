import React from 'react';
import { ArrowLeft, ShoppingBag, Users, Shield, TrendingUp } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
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

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1.5rem' }}>
          About FYC Marketplace
        </h1>
        
        <div style={{ maxWidth: 'none' }}>
          <p style={{ fontSize: '1.125rem', color: '#3e403a', marginBottom: '1.5rem' }}>
            Welcome to FYC Marketplace, the official First Year Council marketplace designed specifically 
            for all students across South Africa. Our platform connects students who need to buy 
            and sell textbooks, stationery, electronics, and other student essentials in a safe, convenient, 
            and affordable way.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ height: '1.5rem', width: '1.5rem', color: '#10110f' }} />
            Our Mission
          </h2>
          <p style={{ color: '#3e403a', marginBottom: '1.5rem' }}>
            At FYC Marketplace, we understand the financial challenges that first-year students face. 
            Textbooks can be expensive, and finding affordable second-hand materials can be difficult. 
            That's why we created this platform – to help students save money while ensuring they have 
            access to the resources they need to succeed in their studies. Our mission is to build a 
            thriving student community where buying and selling is easy, secure, and beneficial for everyone.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag style={{ height: '1.5rem', width: '1.5rem', color: '#007aff' }} />
            What We Offer
          </h2>
          <div style={{ backgroundColor: '#fbfaf6', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#3e403a', paddingLeft: '1.25rem', margin: 0 }}>
              <li>
                <strong>Textbooks & Study Materials:</strong> Find affordable textbooks for all your courses, from previous students who've completed the modules.
              </li>
              <li>
                <strong>Electronics & Tech:</strong> Buy and sell laptops, calculators, tablets, and other technology essentials at student-friendly prices.
              </li>
              <li>
                <strong>Stationery & Supplies:</strong> Get notebooks, pens, folders, and all the supplies you need for a successful academic year.
              </li>
              <li>
                <strong>Services:</strong> Connect with fellow students offering tutoring, typing services, printing, and other helpful services.
              </li>
              <li>
                <strong>Campus-Specific Listings:</strong> Filter items by your campus location for easy meet-ups and quick transactions.
              </li>
            </ul>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ height: '1.5rem', width: '1.5rem', color: '#007aff' }} />
            Why Choose FYC Marketplace?
          </h2>
          <p style={{ color: '#3e403a', marginBottom: '1rem' }}>
            Unlike general marketplace platforms, FYC Marketplace is built exclusively for students, 
            by students. We prioritize safety, affordability, and community. Here's what makes us different:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#fbfaf6', border: '1px solid rgba(16, 17, 15, .17)', borderRadius: '0.5rem', padding: '1rem' }}>
              <h3 style={{ fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>Student-Focused</h3>
              <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                Every feature is designed with first-year students in mind, from campus filters to 
                affordable subscription pricing for sellers.
              </p>
            </div>
            <div style={{ backgroundColor: '#fbfaf6', border: '1px solid rgba(16, 17, 15, .17)', borderRadius: '0.5rem', padding: '1rem' }}>
              <h3 style={{ fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>Safe & Verified</h3>
              <p style={{ fontSize: '0.875rem', color: '#0062cc' }}>
                Verified seller badges help you identify trustworthy sellers, and direct WhatsApp 
                communication keeps transactions transparent.
              </p>
            </div>
            <div style={{ backgroundColor: '#fbfaf6', border: '1px solid rgba(16, 17, 15, .17)', borderRadius: '0.5rem', padding: '1rem' }}>
              <h3 style={{ fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>Campus Convenience</h3>
              <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                Find items available on your campus for easy pick-up and avoid expensive shipping costs.
              </p>
            </div>
            <div style={{ backgroundColor: '#fbfaf6', border: '1px solid rgba(16, 17, 15, .17)', borderRadius: '0.5rem', padding: '1rem' }}>
              <h3 style={{ fontWeight: 'bold', color: '#10110f', marginBottom: '0.5rem' }}>Affordable for Everyone</h3>
              <p style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                Buyers browse for free, and sellers pay just R25/month to list unlimited items – 
                far cheaper than other platforms.
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp style={{ height: '1.5rem', width: '1.5rem', color: '#10110f' }} />
            Join Our Growing Community
          </h2>
          <p style={{ color: '#3e403a', marginBottom: '1.5rem' }}>
            FYC Marketplace is more than just a buying and selling platform – it's a community of 
            first-year students helping each other succeed. Whether you're looking to save money on 
            textbooks, make some extra cash by selling items you no longer need, or find essential 
            study materials, FYC Marketplace is here to support your academic journey.
          </p>

          <div style={{
            background: '#fbfaf6',
            border: '1px solid rgba(16, 17, 15, .17)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10110f', marginBottom: '0.75rem' }}>
              Start Saving Today!
            </h3>
            <p style={{ color: '#3e403a', marginBottom: '1rem' }}>
              Create your free account now and discover thousands of student listings across South 
              African campuses. Whether you're at Pretoria Central, Soshanguve, Ga-Rankuwa, or any 
              other campus, you'll find what you need right here.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={onBack}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0062cc'}
                onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007aff'}
              >
                Browse Marketplace
              </button>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10110f', marginBottom: '1rem' }}>Contact Us</h2>
          <p style={{ color: '#3e403a' }}>
            Have questions or need support? We're here to help! Reach out to us on WhatsApp at{' '}
            <a 
              href="https://wa.me/27711126204" 
              style={{ color: '#10110f', textDecoration: 'underline', fontWeight: '600' }}
            >
              +27 71 112 6204
            </a>{' '}
            or email us. Our team is dedicated to making your FYC Marketplace experience smooth 
            and successful.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;