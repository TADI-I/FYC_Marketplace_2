const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CAMPUSES,
  haversineDistanceMeters,
  isValidCoordinates,
  rankNearbyProducts,
  recognizeCampus
} = require('../services/campusLocationService');
const productController = require('../controllers/productController');

test('coordinate validation rejects malformed and out-of-range readings', () => {
  assert.equal(isValidCoordinates(-25.7, 28.1), true);
  assert.equal(isValidCoordinates('not-a-number', 28.1), false);
  assert.equal(isValidCoordinates(91, 28.1), false);
  assert.equal(isValidCoordinates(-25.7, 181), false);
});

test('Haversine distance is calculated in metres', () => {
  const distance = haversineDistanceMeters(0, 0, 0.001, 0);
  assert.ok(distance > 111 && distance < 112);
});

test('campus recognition requires the accuracy circle to fit inside the campus radius', () => {
  const pretoria = CAMPUSES.find(campus => campus.id === 'pretoria-main');
  const [longitude, latitude] = pretoria.location.coordinates;
  assert.equal(recognizeCampus(CAMPUSES, { latitude, longitude, accuracy: 10 }).campus.id, 'pretoria-main');
  assert.equal(recognizeCampus(CAMPUSES, { latitude, longitude, accuracy: 150 }), null);
  assert.equal(recognizeCampus(CAMPUSES, { latitude: 0, longitude: 0, accuracy: 5 }), null);
});

test('nearby ranking prefers pickup coordinates, filters radius, and stably places missing coordinates last', () => {
  const products = [
    { _id: 'c', title: 'No location', seller: {} },
    { _id: 'b', title: 'Far', seller: { pickupLocation: { coordinates: [0, 0.02] } } },
    { _id: 'a', title: 'Near', pickupLocation: { coordinates: [0, 0.001] }, seller: {} }
  ];
  const withinOneKm = rankNearbyProducts(products, { latitude: 0, longitude: 0 }, 1);
  assert.deepEqual(withinOneKm.map(product => product._id), ['a']);
  const all = rankNearbyProducts(products, { latitude: 0, longitude: 0 }, null);
  assert.deepEqual(all.map(product => product._id), ['a', 'b', 'c']);
  assert.equal(all[0].locationSource, 'pickup');
  assert.equal(all[1].locationSource, 'seller-pickup');
});

const responseRecorder = () => {
  const record = { statusCode: 200, headers: {}, payload: null };
  const res = {
    status(code) { record.statusCode = code; return this; },
    set(name, value) { record.headers[name] = value; return this; },
    json(payload) { record.payload = payload; return this; }
  };
  return { record, res };
};

test('nearby endpoint paginates after deterministic distance sorting and retains seller restrictions', async () => {
  let capturedPipeline;
  const productRows = Array.from({ length: 3 }, (_, index) => ({
    _id: String(index),
    title: `Product ${index}`,
    pickupLocation: { coordinates: [0, (index + 1) * 0.001] },
    seller: { subscribed: true }
  }));
  const db = {
    collection(name) {
      if (name === 'products') return {
        aggregate(pipeline) { capturedPipeline = pipeline; return { async toArray() { return productRows; } }; }
      };
      return { find() { return { async toArray() { return []; } }; } };
    }
  };
  const { record, res } = responseRecorder();
  await productController.getNearbyProducts({ body: {
    latitude: 0, longitude: 0, accuracy: 5, radiusKm: 'all', page: 2, limit: 2,
    filters: { search: 'Product' }
  } }, res, db);

  assert.equal(record.statusCode, 200);
  assert.deepEqual(record.payload.products.map(product => product._id), ['2']);
  assert.equal(record.payload.total, 3);
  assert.equal(record.payload.hasMore, false);
  assert.equal(record.headers['Cache-Control'], 'no-store');
  assert.ok(capturedPipeline.some(stage => stage.$match?.['seller.subscribed'] === true));
  assert.ok(capturedPipeline[0].$match.$or[0].title.$regex.includes('Product'));
  assert.equal('pickupLocation' in record.payload.products[0], false);
});

test('nearby endpoint rejects invalid coordinates and radius values', async () => {
  const db = { collection() { throw new Error('database should not be called'); } };
  const invalidCoordinates = responseRecorder();
  await productController.getNearbyProducts({ body: { latitude: 200, longitude: 0 } }, invalidCoordinates.res, db);
  assert.equal(invalidCoordinates.record.statusCode, 400);

  const coercedNullCoordinates = responseRecorder();
  await productController.getNearbyProducts({ body: { latitude: null, longitude: null } }, coercedNullCoordinates.res, db);
  assert.equal(coercedNullCoordinates.record.statusCode, 400);

  const invalidRadius = responseRecorder();
  await productController.getNearbyProducts({ body: { latitude: 0, longitude: 0, radiusKm: 2 } }, invalidRadius.res, db);
  assert.equal(invalidRadius.record.statusCode, 400);
});
