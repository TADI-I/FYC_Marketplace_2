const CAMPUSES = Object.freeze([
  {
    id: 'pretoria-main',
    name: 'Pretoria Campus',
    location: { type: 'Point', coordinates: [28.1612167, -25.7315417] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°43\'53.55"S 28°09\'40.38"E'
  },
  {
    id: 'soshanguve-S',
    name: 'Soshanguve South Campus',
    location: { type: 'Point', coordinates: [28.0961556, -25.5408] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°32\'26.88"S 28°05\'46.16"E'
  },
  {
    id: 'soshanguve-N',
    name: 'Soshanguve North Campus',
    location: { type: 'Point', coordinates: [28.1129, -25.5203] },
    recognitionRadiusMeters: 100,
    source: 'TUT Open Day guide: 25°31\'13.08"S 28°06\'46.44"E'
  },
  {
    id: 'ga-rankuwa',
    name: 'Ga-Rankuwa Campus',
    location: { type: 'Point', coordinates: [28.0023083, -25.6183111] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°37\'05.92"S 28°00\'08.31"E'
  },
  {
    // This legacy ID is retained because existing users and products store it.
    id: 'pretoria-west',
    name: 'Arcadia Campus',
    location: { type: 'Point', coordinates: [28.2000528, -25.7449528] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°44\'41.83"S 28°12\'00.19"E'
  },
  {
    id: 'arts',
    name: 'Arts Campus',
    location: { type: 'Point', coordinates: [28.1961083, -25.7406] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°44\'26.16"S 28°11\'45.99"E'
  },
  {
    id: 'emalahleni',
    name: 'eMalahleni Campus',
    location: { type: 'Point', coordinates: [29.2360806, -25.879] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°52\'44.40"S 29°14\'09.89"E'
  },
  {
    id: 'mbombela',
    name: 'Mbombela Campus',
    location: { type: 'Point', coordinates: [30.9547306, -25.5003083] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 25°30\'01.11"S 30°57\'17.03"E'
  },
  {
    id: 'polokwane',
    name: 'Polokwane Campus',
    location: { type: 'Point', coordinates: [29.4497056, -23.9141139] },
    recognitionRadiusMeters: 100,
    source: 'TUT General Information 2026: 23°54\'50.81"S 29°26\'58.94"E'
  }
]);

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

const isValidCoordinates = (latitude, longitude) => (
  isFiniteNumber(latitude) && latitude >= -90 && latitude <= 90
  && isFiniteNumber(longitude) && longitude >= -180 && longitude <= 180
);

const haversineDistanceMeters = (fromLatitude, fromLongitude, toLatitude, toLongitude) => {
  if (!isValidCoordinates(fromLatitude, fromLongitude) || !isValidCoordinates(toLatitude, toLongitude)) {
    return null;
  }
  const radians = degrees => degrees * Math.PI / 180;
  const earthRadiusMeters = 6371008.8;
  const deltaLatitude = radians(toLatitude - fromLatitude);
  const deltaLongitude = radians(toLongitude - fromLongitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude))
    * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const coordinatesFromProduct = product => {
  const choices = [
    { value: product.pickupLocation?.coordinates, source: 'pickup' },
    { value: product.seller?.pickupLocation?.coordinates, source: 'seller-pickup' },
    { value: product.campus?.location?.coordinates, source: 'registered-campus' }
  ];
  for (const choice of choices) {
    if (Array.isArray(choice.value) && isValidCoordinates(choice.value[1], choice.value[0])) {
      return { longitude: choice.value[0], latitude: choice.value[1], source: choice.source };
    }
  }
  return null;
};

const rankNearbyProducts = (products, origin, radiusKm = 1) => {
  const maximumMeters = radiusKm === null ? null : radiusKm * 1000;
  return products
    .map(product => {
      const coordinates = coordinatesFromProduct(product);
      const distanceMeters = coordinates
        ? haversineDistanceMeters(origin.latitude, origin.longitude, coordinates.latitude, coordinates.longitude)
        : null;
      return { ...product, distanceMeters, locationSource: coordinates?.source || null };
    })
    .filter(product => maximumMeters === null || (product.distanceMeters !== null && product.distanceMeters <= maximumMeters))
    .sort((left, right) => {
      if (left.distanceMeters === null && right.distanceMeters !== null) return 1;
      if (left.distanceMeters !== null && right.distanceMeters === null) return -1;
      if (left.distanceMeters !== right.distanceMeters) return (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0);
      const titleComparison = String(left.title || '').localeCompare(String(right.title || ''));
      if (titleComparison) return titleComparison;
      return String(left._id || left.id || '').localeCompare(String(right._id || right.id || ''));
    });
};

const recognizeCampus = (campuses, origin) => {
  if (!isValidCoordinates(origin.latitude, origin.longitude)) return null;
  const accuracy = isFiniteNumber(origin.accuracy) && origin.accuracy >= 0 ? origin.accuracy : Infinity;
  return campuses
    .filter(campus => (
      Array.isArray(campus.location?.coordinates)
      && isValidCoordinates(campus.location.coordinates[1], campus.location.coordinates[0])
      && isFiniteNumber(campus.recognitionRadiusMeters)
      && campus.recognitionRadiusMeters > 0
    ))
    .map(campus => ({
      campus,
      distanceMeters: haversineDistanceMeters(
        origin.latitude,
        origin.longitude,
        campus.location.coordinates[1],
        campus.location.coordinates[0]
      )
    }))
    .filter(({ campus, distanceMeters }) => (
      accuracy <= campus.recognitionRadiusMeters
      && distanceMeters + accuracy <= campus.recognitionRadiusMeters
    ))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0] || null;
};

const ensureCampusLocations = async db => {
  const collection = db.collection('campuses');
  await Promise.all(CAMPUSES.map(campus => collection.updateOne(
    { id: campus.id },
    {
      $set: {
        name: campus.name,
        location: campus.location,
        source: campus.source,
        updatedAt: new Date()
      },
      $setOnInsert: {
        recognitionRadiusMeters: campus.recognitionRadiusMeters,
        createdAt: new Date()
      }
    },
    { upsert: true }
  )));
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ location: '2dsphere' });
};

module.exports = {
  CAMPUSES,
  ensureCampusLocations,
  haversineDistanceMeters,
  isValidCoordinates,
  rankNearbyProducts,
  recognizeCampus
};
