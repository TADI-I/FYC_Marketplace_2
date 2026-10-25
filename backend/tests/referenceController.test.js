const test = require('node:test');
const assert = require('node:assert/strict');
const referenceController = require('../controllers/referenceController');

test('campus reference response exposes aligned display fields only', async () => {
  let payload;
  await referenceController.getCampuses({}, { json(value) { payload = value; } }, null);

  assert.equal(payload.success, true);
  assert.deepEqual(payload.campuses.map(campus => campus.name), [
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
  assert.ok(payload.campuses.every(campus => Object.keys(campus).sort().join(',') === 'id,name'));
});
