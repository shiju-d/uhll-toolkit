// Verifies that js/data.js was generated correctly by extract-data.js.
// Run AFTER extract-data.js has been executed once.
import { SPEC_VERSION, MESSAGE_TYPES, DFID_NAMES, MESSAGE_DFIDS, DFID_MAX_LENGTHS, VERSION_CHANGELOG } from '../js/data.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

console.log('test-extract: verifying js/data.js\n');

assert(typeof SPEC_VERSION === 'string' && SPEC_VERSION.length > 0,
  `SPEC_VERSION is a non-empty string (got: "${SPEC_VERSION}")`);

// MESSAGE_TYPES
assert(typeof MESSAGE_TYPES === 'object', 'MESSAGE_TYPES is an object');
assert(MESSAGE_TYPES['17'] === 'Maid Code',
  `MESSAGE_TYPES['17'] === 'Maid Code' (got: ${MESSAGE_TYPES['17']})`);
assert(MESSAGE_TYPES['14'] === 'Check In Room',
  `MESSAGE_TYPES['14'] === 'Check In Room' (got: ${MESSAGE_TYPES['14']})`);
assert(MESSAGE_TYPES['03'] === 'Wake Up Information Request' ||
       MESSAGE_TYPES['3'] === 'Wake Up Information Request',
  `MESSAGE_TYPES has 'Wake Up Information Request'`);
assert(Object.keys(MESSAGE_TYPES).length >= 50,
  `MESSAGE_TYPES has >=50 entries (got ${Object.keys(MESSAGE_TYPES).length})`);

// DFID_NAMES
assert(typeof DFID_NAMES === 'object', 'DFID_NAMES is an object');
assert(DFID_NAMES['144'] === 'Generic Status',
  `DFID_NAMES['144'] === 'Generic Status' (got: ${DFID_NAMES['144']})`);
assert(DFID_NAMES['174'] === 'Station Number',
  `DFID_NAMES['174'] === 'Station Number' (got: ${DFID_NAMES['174']})`);
assert(DFID_NAMES['175'] === 'Room Number',
  `DFID_NAMES['175'] === 'Room Number' (got: ${DFID_NAMES['175']})`);
assert(Object.keys(DFID_NAMES).length >= 80,
  `DFID_NAMES has >=80 entries (got ${Object.keys(DFID_NAMES).length})`);

// MESSAGE_DFIDS
assert(typeof MESSAGE_DFIDS === 'object', 'MESSAGE_DFIDS is an object');
assert(Array.isArray(MESSAGE_DFIDS['17']),
  `MESSAGE_DFIDS['17'] is an array`);
assert(MESSAGE_DFIDS['17'].includes('144'),
  `MESSAGE_DFIDS['17'] includes DFID 144`);
assert(MESSAGE_DFIDS['17'].includes('174'),
  `MESSAGE_DFIDS['17'] includes DFID 174`);

// DFID_MAX_LENGTHS
assert(typeof DFID_MAX_LENGTHS === 'object', 'DFID_MAX_LENGTHS is an object');
assert(DFID_MAX_LENGTHS['174'] === 14,
  `DFID_MAX_LENGTHS['174'] === 14 (got: ${DFID_MAX_LENGTHS['174']})`);
assert(DFID_MAX_LENGTHS['175'] === 11,
  `DFID_MAX_LENGTHS['175'] === 11 (got: ${DFID_MAX_LENGTHS['175']})`);
assert(DFID_MAX_LENGTHS['144'] === 14,
  `DFID_MAX_LENGTHS['144'] === 14 (got: ${DFID_MAX_LENGTHS['144']})`);

// VERSION_CHANGELOG
assert(typeof VERSION_CHANGELOG === 'object', 'VERSION_CHANGELOG is an object');
assert(Object.keys(VERSION_CHANGELOG).length >= 10,
  `VERSION_CHANGELOG has >=10 versions (got ${Object.keys(VERSION_CHANGELOG).length})`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
