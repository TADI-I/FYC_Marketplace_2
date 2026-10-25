import { CAMPUS_LOCATIONS, MARKETPLACE_CATEGORIES, OTHER_LOCATION_OPTION } from './marketplaceData';

test('shared marketplace reference data stays complete and uniquely keyed', () => {
  expect(CAMPUS_LOCATIONS.map(campus => campus.name)).toEqual([
    'Pretoria Central',
    'Soshanguve South',
    'Soshanguve North',
    'Ga-Rankuwa',
    'Pretoria Arcadia',
    'Arts Campus',
    'eMalahleni',
    'Mbombela',
    'Polokwane'
  ]);
  expect(MARKETPLACE_CATEGORIES.map(category => category.name)).toEqual([
    'Books',
    'Electronics',
    'Services',
    'Clothing',
    'Food',
    'Transport',
    'Accommodation',
    'Other'
  ]);
  expect(new Set(CAMPUS_LOCATIONS.map(campus => campus.id)).size).toBe(CAMPUS_LOCATIONS.length);
  expect(new Set(MARKETPLACE_CATEGORIES.map(category => category.id)).size).toBe(MARKETPLACE_CATEGORIES.length);
  expect(OTHER_LOCATION_OPTION).toEqual({ id: 'other', name: 'Other campus or residence' });
});
