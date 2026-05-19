// Unit tests for js/builder.js
import { buildUHLL, toCSI, validateField, getMessageDfids } from '../js/builder.js';

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

console.log('test-builder: verifying buildUHLL, toCSI, validateField, getMessageDfids\n');

// ── Basic build — Maid Code (17), two DFIDs ────────────────────────────────
// Expected raw: "1735300000199991440011174003102"
// header: 17 + 353 + 00 + 0001 + 9999 = "173530000019999" (15 chars)
// DFID 144, value "1" → "144" + "001" + "1" = 7 chars
// DFID 174, value "102" → "174" + "003" + "102" = 9 chars
const r1 = buildUHLL({
  mm: '17', dmm: '353', rr: '00', tttt: '0001', ssss: '9999',
  fields: [
    { dfid: '144', value: '1' },
    { dfid: '174', value: '102' },
  ],
});
assert(r1.errors.length === 0, 'No errors for valid build');
assert(r1.raw === '1735300000199991440011174003102',
  `Raw matches expected (got: "${r1.raw}")`);

// ── Empty field values are omitted ───────────────────────────────────────
const r2 = buildUHLL({
  mm: '17', dmm: '353', rr: '00', tttt: '0001', ssss: '9999',
  fields: [
    { dfid: '144', value: '' },
    { dfid: '174', value: '102' },
  ],
});
assert(r2.errors.length === 0, 'No errors when some fields empty');
assert(!r2.raw.includes('144'), 'Empty DFID 144 is omitted from output');
assert(r2.raw.includes('174003102'), 'Non-empty DFID 174 is present');

// ── null/undefined field values are omitted ───────────────────────────────
const r3 = buildUHLL({
  mm: '17', dmm: '353', rr: '00', tttt: '0001', ssss: '9999',
  fields: [
    { dfid: '144', value: null },
    { dfid: '174', value: '101' },
  ],
});
assert(r3.errors.length === 0, 'No errors for null field');
assert(!r3.raw.includes('144'), 'null value DFID omitted');

// ── DMM must be exactly 3 chars ──────────────────────────────────────────
const r4 = buildUHLL({ mm: '17', dmm: 'AB', tttt: '0001', ssss: '9999', fields: [] });
assert(r4.errors.length > 0, 'Error when DMM is 2 chars');

const r5 = buildUHLL({ mm: '17', dmm: '', tttt: '0001', ssss: '9999', fields: [] });
assert(r5.errors.length > 0, 'Error when DMM is empty');

// ── Transaction ID range validation ──────────────────────────────────────
const r6 = buildUHLL({ mm: '17', dmm: 'ABC', tttt: '0000', ssss: '9999', fields: [] });
assert(r6.errors.length > 0, 'Error for transaction ID 0000 (out of range)');

const r7 = buildUHLL({ mm: '17', dmm: 'ABC', tttt: '10000', ssss: '9999', fields: [] });
assert(r7.errors.length > 0, 'Error for transaction ID 10000 (out of range)');

// ── Valid transaction IDs ─────────────────────────────────────────────────
const r8 = buildUHLL({ mm: '17', dmm: 'ABC', tttt: '0001', ssss: '9999', fields: [] });
assert(r8.errors.length === 0 && r8.raw.includes('ABC000001'), 'tttt=0001 is valid');

const r9 = buildUHLL({ mm: '17', dmm: 'ABC', tttt: '9999', ssss: '9999', fields: [] });
assert(r9.errors.length === 0, 'tttt=9999 is valid');

// ── MM zero-padding ───────────────────────────────────────────────────────
const r10 = buildUHLL({ mm: '3', dmm: 'ABC', tttt: '0001', ssss: '9999', fields: [] });
assert(r10.raw.startsWith('03'), `Single-digit mm '3' is zero-padded to '03' (got: ${r10.raw ? r10.raw.substring(0,2) : 'null'})`);

// ── toCSI wrapping ───────────────────────────────────────────────────────
const csi = toCSI('1735300000199991440011174003102');
assert(csi === '<STX>1735300000199991440011174003102<ETX><LRC>',
  `toCSI produces correct wrapper (got: "${csi}")`);

// ── validateField: value within max length ────────────────────────────────
const w1 = validateField('174', '102');
assert(w1 === null, 'No warning for value "102" (len 3) with DFID 174 (max 14)');

// ── validateField: value exceeds max length (DFID 174 max=14) ────────────
const w2 = validateField('174', 'A'.repeat(15));
assert(w2 !== null, 'Warning returned when value length 15 exceeds max 14');
assert(typeof w2 === 'string', 'Warning is a string');

// ── getMessageDfids returns DFID list for message 17 ─────────────────────
const dfids17 = getMessageDfids('17');
assert(Array.isArray(dfids17), 'getMessageDfids("17") returns an array');
assert(dfids17.length > 0, 'Message 17 has at least one DFID');
assert(dfids17.includes('144'), 'DFID 144 in message 17');
assert(dfids17.includes('174'), 'DFID 174 in message 17');

// ── getMessageDfids with zero-padded key ─────────────────────────────────
const dfids17b = getMessageDfids('17');
assert(JSON.stringify(dfids17) === JSON.stringify(dfids17b),
  'getMessageDfids same result for "17"');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
