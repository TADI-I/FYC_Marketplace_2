export const SITE_CONTACT = {
  companyName: 'LBG Software',
  supportEmail: process.env.REACT_APP_SUPPORT_EMAIL || 'support@lbgsoftware.co.za',
  supportPhoneDisplay: process.env.REACT_APP_SUPPORT_PHONE_DISPLAY || '+27 71 112 6204',
  supportPhoneDigits: process.env.REACT_APP_SUPPORT_PHONE_DIGITS || '27711126204',
  companyWebsite: process.env.REACT_APP_COMPANY_WEBSITE || 'https://www.lbgsoftware.co.za',
  marketplaceWebsite: process.env.REACT_APP_MARKETPLACE_WEBSITE || 'https://marketplace.lbgsoftware.co.za'
};

export const supportWhatsAppUrl = (message = 'Hi, I need support with FYC Marketplace') =>
  `https://wa.me/${SITE_CONTACT.supportPhoneDigits}?text=${encodeURIComponent(message)}`;

export const marketplaceProductUrl = (productId: string | number) =>
  `${SITE_CONTACT.marketplaceWebsite.replace(/\/+$/, '')}/products/${encodeURIComponent(String(productId))}`;
