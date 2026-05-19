// Unit tests for js/parser.js
import { parseUHLL } from '../js/parser.js';

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

console.log('test-parser: verifying parseUHLL\n');

// ── Raw UHLL from overview.md example ─────────────────────────────────────
// "1735300000199991440011174003102"
// header: mm=17 dmm=353 rr=00 tttt=0001 ssss=9999
// elements: DFID 144 len 1 value "1", DFID 174 len 3 value "102"
const r1 = parseUHLL('1735300000199991440011174003102');
assert(!r1.error,                            'No error for valid raw message');
assert(r1.header.mm === '17',               `mm === '17' (got: ${r1.header.mm})`);
assert(r1.header.dmm === '353',             `dmm === '353'`);
assert(r1.header.rr === '00',               `rr === '00'`);
assert(r1.header.tttt === '0001',           `tttt === '0001'`);
assert(r1.header.ssss === '9999',           `ssss === '9999'`);
assert(r1.header.isFinal === true,          `isFinal === true for ssss 9999`);
assert(r1.header.messageTypeName === 'Maid Code', `messageTypeName === 'Maid Code'`);
assert(r1.elements.length === 2,            `2 elements (got: ${r1.elements.length})`);
assert(r1.elements[0].dfid === '144',       `first dfid === '144'`);
assert(r1.elements[0].length === 1,         `first length === 1`);
assert(r1.elements[0].value === '1',        `first value === '1'`);
assert(r1.elements[0].name === 'Generic Status', `first name === 'Generic Status'`);
assert(r1.elements[1].dfid === '174',       `second dfid === '174'`);
assert(r1.elements[1].length === 3,         `second length === 3`);
assert(r1.elements[1].value === '102',      `second value === '102'`);
assert(r1.elements[1].name === 'Station Number', `second name === 'Station Number'`);

// ── CSI-wrapped message (<<<STX> prefix) ──────────────────────────────────
const r2 = parseUHLL('<<<STX>1735300000199991440011174003102<ETX><LRC>');
assert(!r2.error,                'No error for <<<STX> wrapped message');
assert(r2.header.mm === '17',    'CSI: mm parsed correctly');
assert(r2.elements.length === 2, 'CSI: 2 elements parsed');
assert(r2.elements[1].value === '102', 'CSI: second element value === "102"');

// ── CSI-wrapped message (<<STX> prefix, single leading <) ─────────────────
const r3 = parseUHLL('<<STX>1735300000199991440011174003102<ETX><LRC>');
assert(!r3.error,                'No error for <<STX> wrapped message');
assert(r3.header.mm === '17',    '<<STX>: mm parsed correctly');

// ── Empty input ───────────────────────────────────────────────────────────
const r4 = parseUHLL('');
assert(r4.error === 'Empty input', `Empty input returns error "Empty input"`);

// ── Input too short for header ────────────────────────────────────────────
const r5 = parseUHLL('17353');
assert(!!r5.error, 'Too-short message (5 chars) returns an error');

// ── Non-final sequence number ─────────────────────────────────────────────
const r6 = parseUHLL('1735300000100011440011174003102');
//                    mm=17 dmm=353 rr=00 tttt=0001 ssss=0001
assert(r6.header.ssss === '0001',    'ssss read as 0001');
assert(r6.header.isFinal === false,  'isFinal === false for ssss 0001');

// ── Message with no data elements ─────────────────────────────────────────
const r7b = parseUHLL('173530000019999');
assert(!r7b.error,               'No error for header-only message');
assert(r7b.elements.length === 0,'Zero elements for header-only message');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
