import { pathForView, resolveAppRoute } from './navigation';

test('maps every page view to a stable path', () => {
  expect(pathForView('home')).toBe('/');
  expect(pathForView('my-profile')).toBe('/profile');
  expect(pathForView('my-products')).toBe('/seller/products');
  expect(pathForView('add-product')).toBe('/seller/products/new');
  expect(pathForView('faq')).toBe('/faq');
});

test('resolves modal and dynamic routes', () => {
  expect(resolveAppRoute('/login').modal).toBe('login');
  expect(resolveAppRoute('/register').modal).toBe('register');
  expect(resolveAppRoute('/products/abc').productId).toBe('abc');
  expect(resolveAppRoute('/messages/user%201').chatWith).toBe('user 1');
  expect(resolveAppRoute('/messages/seller-1', '?product=product-2')).toEqual({
    view: 'messages',
    chatWith: 'seller-1',
    chatProductId: 'product-2'
  });
});

test('recognizes action routes and unknown pages', () => {
  expect(resolveAppRoute('/reset-password').isEmailAction).toBe(true);
  expect(resolveAppRoute('/missing-page').view).toBe('not-found');
});
