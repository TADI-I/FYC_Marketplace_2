export const MARKETPLACE_CATEGORIES = [
  { id: 'books', name: 'Books' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'services', name: 'Services' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
  { id: 'accommodation', name: 'Accommodation' },
  { id: 'other', name: 'Other' }
] as const;

export const CAMPUS_LOCATIONS = [
  { id: 'pretoria-main', name: 'Pretoria Central' },
  { id: 'soshanguve-S', name: 'Soshanguve South' },
  { id: 'soshanguve-N', name: 'Soshanguve North' },
  { id: 'ga-rankuwa', name: 'Ga-Rankuwa' },
  { id: 'pretoria-west', name: 'Pretoria Arcadia' },
  { id: 'arts', name: 'Arts Campus' },
  { id: 'emalahleni', name: 'eMalahleni' },
  { id: 'mbombela', name: 'Mbombela' },
  { id: 'polokwane', name: 'Polokwane' }
] as const;

export const OTHER_LOCATION_OPTION = { id: 'other', name: 'Other campus or residence' } as const;
