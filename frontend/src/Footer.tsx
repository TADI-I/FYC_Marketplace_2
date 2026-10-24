import React from 'react';
import { MessageCircle } from 'lucide-react';
import lbgMonogram from './lbg-monogram-cream-transparent.png';
import type { AppView } from './navigation';
import { supportWhatsAppUrl } from './siteConfig';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const ink = '#10110f';
  const signal = '#007aff';
  const paper = '#fbfaf6';
  const muted = '#9c9d97';
  const line = 'rgba(251,250,246,.16)';

  const handleNavigate = (view: AppView) => {
    // Scroll to top first
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Then navigate
    onNavigate(view);
  };

  return (
    <footer className="app-footer" style={{
      backgroundColor: ink,
      color: paper,
      marginTop: 'auto',
      paddingTop: '3rem',
      paddingBottom: '3rem',
      borderTop: `1px solid ${line}`
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* About Section */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: paper,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              About Campus Cart
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('about')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  About Us
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('how-it-works')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  How It Works
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('faq')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: paper,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              Support
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('contact')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  Contact Us
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a 
                  href={supportWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: muted,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  <MessageCircle style={{ height: '1rem', width: '1rem' }} />
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: paper,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              Legal
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('terms')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  Terms of Service
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => handleNavigate('privacy')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: muted,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = signal}
                  onMouseLeave={(e) => e.currentTarget.style.color = muted}
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Campus Locations */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: paper,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              Locations
            </h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              fontSize: '0.875rem',
              color: muted
            }}>
              <li style={{ marginBottom: '0.25rem' }}>Pretoria Central</li>
              <li style={{ marginBottom: '0.25rem' }}>Soshanguve South</li>
              <li style={{ marginBottom: '0.25rem' }}>Soshanguve North</li>
              <li style={{ marginBottom: '0.25rem' }}>Ga-Rankuwa</li>
              <li style={{ marginBottom: '0.25rem' }}>Pretoria Arcadia</li>
              <li style={{ marginBottom: '0.25rem' }}>eMalahleni</li>
              <li style={{ marginBottom: '0.25rem' }}>Mbombela</li>
              <li style={{ marginBottom: '0.25rem' }}>Polokwane</li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div style={{
          borderTop: `1px solid ${line}`,
          paddingTop: '2rem',
          marginTop: '2rem',
          textAlign: 'center'
        }}>
          <p style={{
            color: muted,
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            © {new Date().getFullYear()} Campus Cart. All rights reserved.
          </p>
 
          <div className="poweredBy">
            <img
              src={lbgMonogram}
              alt="LBG Software"
              width="70"
              height="20"
            />
            <span>
              Powered by{' '}
              <a
                href="https://www.lbgsoftware.co.za/products?utm_source=marketplace&utm_medium=product_referral&utm_campaign=lbg_ecosystem"
                target="_blank"
                rel="noopener noreferrer"
              >
                LBG Software
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
