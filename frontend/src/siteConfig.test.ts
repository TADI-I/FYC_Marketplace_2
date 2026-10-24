import { marketplaceProductUrl } from './siteConfig';

test('shared products use the public Marketplace domain', () => {
  expect(marketplaceProductUrl('698f3160a52f5b287179dcbd')).toBe(
    'https://marketplace.lbgsoftware.co.za/products/698f3160a52f5b287179dcbd'
  );
});
