# UHLL Parser Webpage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static single-page web app that parses raw/CSI UHLL messages into human-readable form and builds UHLL messages from a form UI, hosted on GitHub Pages with Docker for local development.

**Architecture:** Vanilla JS ES modules served directly by GitHub Pages (no build step). A Node.js extraction script (`scripts/extract-data.js`) reads `report.txt` + `versions_report.txt` and generates `js/data.js`. Docker provides two services: `extract` (Node.js) to run the script, and `serve` (Nginx) to host the site locally.

**Tech Stack:** HTML5, CSS3, Vanilla JS (ES modules), Node.js 22 (extraction script only), Nginx 1.27 (local dev server), Docker + Compose

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docker/Dockerfile.extract` | Create | Node.js Alpine image for running scripts |
| `docker/Dockerfile.serve` | Create | Nginx Alpine image for local dev server |
| `docker/nginx.conf` | Create | Nginx config: port 8080, correct MIME types |
| `docker-compose.yml` | Create | Orchestrates extract + serve + test services |
| `scripts/extract-data.js` | Create | Reads report.txt + versions_report.txt → writes js/data.js |
| `scripts/test-extract.mjs` | Create | Verifies structure/content of generated js/data.js |
| `scripts/test-parser.mjs` | Create | Unit tests for js/parser.js |
| `scripts/test-builder.mjs` | Create | Unit tests for js/builder.js |
| `js/data.js` | Auto-generated | Message types, DFID names, max-lengths, MESSAGE_DFIDS, changelog |
| `js/parser.js` | Create | Strips CSI, parses UHLL header + element triplets, resolves names |
| `js/builder.js` | Create | Builds raw/CSI UHLL from message type + field values |
| `js/app.js` | Create | Tab switching, Parser UI, Builder UI, copy-to-clipboard |
| `index.html` | Create | Single-page shell: two tab panels, script module entry |
| `css/style.css` | Create | Styles for header, tabs, tables, form, output box |
| `guide.md` | Create | Step-by-step update workflow + GitHub Pages setup |
| `.gitignore` | Create | Ignore OS/editor files; do NOT ignore js/data.js |

---

## Task 1: Docker Infrastructure

**Files:**
- Create: `docker/Dockerfile.extract`
- Create: `docker/Dockerfile.serve`
- Create: `docker/nginx.conf`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker/Dockerfile.extract`**

```dockerfile
FROM node:22-alpine
WORKDIR /app
```

- [ ] **Step 2: Create `docker/Dockerfile.serve`**

```dockerfile
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
```

- [ ] **Step 3: Create `docker/nginx.conf`**

```nginx
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

- [ ] **Step 4: Create `docker-compose.yml`**

```yaml
services:
  extract:
    build:
      context: .
      dockerfile: docker/Dockerfile.extract
    volumes:
      - .:/app
    command: node scripts/extract-data.js

  test:
    build:
      context: .
      dockerfile: docker/Dockerfile.extract
    volumes:
      - .:/app
    command: >
      sh -c "node scripts/test-extract.mjs &&
             node scripts/test-parser.mjs &&
             node scripts/test-builder.mjs"

  serve:
    build:
      context: .
      dockerfile: docker/Dockerfile.serve
    ports:
      - "8080:8080"
    volumes:
      - .:/usr/share/nginx/html:ro
```

- [ ] **Step 5: Create `.gitignore`**

```
.DS_Store
Thumbs.db
*.swp
*.swo
.vscode/
.idea/
```

- [ ] **Step 6: Build Docker images to verify config**

```bash
docker compose build
```

Expected: Both images build successfully with no errors.

- [ ] **Step 7: Commit**

```bash
git add docker/ docker-compose.yml .gitignore
git commit -m "feat: add Docker infrastructure (extract + serve)"
```

---

## Task 2: Data Extraction Tests (write first — TDD)

**Files:**
- Create: `scripts/test-extract.mjs`

- [ ] **Step 1: Create `scripts/test-extract.mjs`**

```js
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
  `DFID_NAMES['175'] === 'Room Number'`);
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
```

- [ ] **Step 2: Verify the test fails (data.js not yet generated)**

```bash
docker compose run --rm extract node scripts/test-extract.mjs
```

Expected: Error like `Cannot find module '../js/data.js'` — this confirms TDD red state.

- [ ] **Step 3: Commit test file**

```bash
git add scripts/test-extract.mjs
git commit -m "test: add extraction test (red)"
```

---

## Task 3: Data Extraction Implementation

**Files:**
- Create: `scripts/extract-data.js`
- Auto-generates: `js/data.js`

- [ ] **Step 1: Create `js/` directory placeholder**

Create an empty `js/.gitkeep` file so the directory exists:

```bash
mkdir -p js && touch js/.gitkeep
```

- [ ] **Step 2: Create `scripts/extract-data.js`**

```js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(name) {
  return fs.readFileSync(path.resolve(ROOT, name), 'utf8');
}

// ── 1. Detect latest version from versions_report.txt ──────────────────────
function detectLatestVersion(versionsText) {
  const versions = [];
  const re = /UHLL Specification Version (\d+(?:\.\d+)*)/g;
  let m;
  while ((m = re.exec(versionsText)) !== null) {
    versions.push(m[1]);
  }
  if (versions.length === 0) throw new Error('No version found in versions_report.txt');
  versions.sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  });
  return versions[versions.length - 1];
}

// ── 2. Parse Message Definition Table from report.txt ──────────────────────
function parseMessageTypes(reportText) {
  const types = {};
  // Find the Message Definition Table block (ends at the first +== line after it)
  const tableStart = reportText.indexOf('Message Definition Table');
  if (tableStart === -1) throw new Error('Message Definition Table not found in report.txt');
  const tableEnd = reportText.indexOf('+==', tableStart);
  const tableText = tableEnd !== -1
    ? reportText.substring(tableStart, tableEnd)
    : reportText.substring(tableStart);

  // Match rows: | 17     | Maid Code                           |
  const rowRe = /\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/g;
  let m;
  while ((m = rowRe.exec(tableText)) !== null) {
    const num = m[1].trim();
    const name = m[2].trim();
    if (name === 'NAME') continue; // skip header row
    const key = num.padStart(2, '0');
    if (!types[key]) types[key] = name; // keep first occurrence if duplicate
  }
  return types;
}

// ── 3. Parse a single message line into mm + array of DFID entries ─────────
function parseMessageLine(line) {
  let content = line.trim();
  // Strip <<<STX> or <<STX> prefix
  content = content.replace(/^<+<STX>/, '');
  // Strip <ETX> and everything after
  content = content.replace(/<ETX>.*$/, '');

  if (content.length < 15) return null;

  const mm = content.substring(0, 2);
  // header: MM(2) + DMM(3) + RR(2) + TTTT(4) + SSSS(4) = 15 chars
  let pos = 15;
  const dfids = [];

  while (pos < content.length) {
    if (pos + 6 > content.length) break;
    const dfid = content.substring(pos, pos + 3);
    const lenStr = content.substring(pos + 3, pos + 6);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) break;
    if (pos + 6 + len > content.length) break;
    const name = content.substring(pos + 6, pos + 6 + len).trim();
    dfids.push({ dfid, maxLength: len, name });
    pos += 6 + len;
  }

  return { mm, dfids };
}

// ── 4. Extract DFID/message data from latest version section ───────────────
function extractLatestVersionData(reportText, version) {
  const versionHeader = `UHLL Specification Version ${version}`;
  const startIdx = reportText.indexOf(versionHeader);
  if (startIdx === -1) throw new Error(`Version ${version} not found in report.txt`);

  // Find next +== block after the version header (next version or EOF)
  const nextVersionIdx = reportText.indexOf('+==', startIdx + versionHeader.length);
  const sectionText = nextVersionIdx !== -1
    ? reportText.substring(startIdx, nextVersionIdx)
    : reportText.substring(startIdx);

  const dfidNames = {};
  const dfidMaxLengths = {};
  const messageDfids = {};

  for (const line of sectionText.split('\n')) {
    if (!line.includes('<STX>')) continue;
    const parsed = parseMessageLine(line);
    if (!parsed) continue;

    const { mm, dfids } = parsed;
    if (!messageDfids[mm]) messageDfids[mm] = [];

    for (const { dfid, maxLength, name } of dfids) {
      if (!dfidNames[dfid]) dfidNames[dfid] = name;
      // Track highest observed max length per DFID
      if (!dfidMaxLengths[dfid] || maxLength > dfidMaxLengths[dfid]) {
        dfidMaxLengths[dfid] = maxLength;
      }
      if (!messageDfids[mm].includes(dfid)) {
        messageDfids[mm].push(dfid);
      }
    }
  }

  return { dfidNames, dfidMaxLengths, messageDfids };
}

// ── 5. Extract changelog from versions_report.txt ─────────────────────────
function extractChangelog(versionsText) {
  const changelog = {};
  // Split on version section boundaries
  const blocks = versionsText.split(/(?=\+={10,}\n\| UHLL Specification Version)/);

  for (const block of blocks) {
    const vMatch = block.match(/UHLL Specification Version (\S+)/);
    if (!vMatch) continue;
    const version = vMatch[1];

    // Extract new/updated messages
    const messages = [];
    const msgSection = block.match(/New And Updated Messages\n([\s\S]*?)(?:New And Updated Message DFIDs|$)/);
    if (msgSection) {
      const rowRe = /\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|[^|]*\|/g;
      let m;
      while ((m = rowRe.exec(msgSection[1])) !== null) {
        const num = m[1].trim();
        const name = m[2].trim();
        if (num !== 'NUMBER' && num !== 'N/A') {
          messages.push({ number: num, name });
        }
      }
    }

    // Extract new/updated DFIDs
    const dfids = [];
    const dfidSection = block.match(/New And Updated Message DFIDs\n([\s\S]*?)(?:New And Updated Message Notes|$)/);
    if (dfidSection) {
      const rowRe = /\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/g;
      let m;
      while ((m = rowRe.exec(dfidSection[1])) !== null) {
        const msgNum = m[1].trim();
        if (msgNum !== 'NUMBER' && msgNum !== 'N/A') {
          dfids.push({
            messageNumber: msgNum,
            messageName: m[2].trim(),
            dfid: m[3].trim(),
            dfidName: m[4].trim(),
          });
        }
      }
    }

    changelog[version] = { messages, dfids };
  }

  return changelog;
}

// ── Main ───────────────────────────────────────────────────────────────────
const versionsText = readFile('versions_report.txt');
const reportText   = readFile('report.txt');

const latestVersion = detectLatestVersion(versionsText);
console.log(`Detected latest UHLL version: ${latestVersion}`);

const messageTypes = parseMessageTypes(reportText);
const { dfidNames, dfidMaxLengths, messageDfids } = extractLatestVersionData(reportText, latestVersion);
const changelog = extractChangelog(versionsText);

const msgCount  = Object.keys(messageTypes).length;
const dfidCount = Object.keys(dfidNames).length;
console.log(`Extracted ${msgCount} message types, ${dfidCount} DFIDs (UHLL v${latestVersion})`);

const output = `// AUTO-GENERATED by scripts/extract-data.js — do not edit manually
// Source: report.txt + versions_report.txt (UHLL v${latestVersion})

export const SPEC_VERSION = ${JSON.stringify(latestVersion)};

export const MESSAGE_TYPES = ${JSON.stringify(messageTypes, null, 2)};

export const DFID_NAMES = ${JSON.stringify(dfidNames, null, 2)};

export const MESSAGE_DFIDS = ${JSON.stringify(messageDfids, null, 2)};

export const DFID_MAX_LENGTHS = ${JSON.stringify(dfidMaxLengths, null, 2)};

export const VERSION_CHANGELOG = ${JSON.stringify(changelog, null, 2)};
`;

fs.writeFileSync(path.resolve(ROOT, 'js/data.js'), output);
console.log('Written: js/data.js');
```

- [ ] **Step 3: Run extraction inside Docker**

```bash
docker compose run --rm extract
```

Expected output:
```
Detected latest UHLL version: 16.12
Extracted XX message types, YY DFIDs (UHLL v16.12)
Written: js/data.js
```

- [ ] **Step 4: Run extraction test to verify green**

```bash
docker compose run --rm extract node scripts/test-extract.mjs
```

Expected: All assertions pass, `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-data.js js/data.js js/.gitkeep
git commit -m "feat: add extraction script and generated data.js"
```

---

## Task 4: Parser Tests (write first — TDD)

**Files:**
- Create: `scripts/test-parser.mjs`

- [ ] **Step 1: Create `scripts/test-parser.mjs`**

```js
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
const r7 = parseUHLL('17353000001999900');
// header only, 15 chars + garbage — but valid header at least
// Actually let's test the clean 15-char header
const r7b = parseUHLL('173530000019999');
assert(!r7b.error,               'No error for header-only message');
assert(r7b.elements.length === 0,'Zero elements for header-only message');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Verify test fails (parser.js does not exist yet)**

```bash
docker compose run --rm extract node scripts/test-parser.mjs
```

Expected: `Error: Cannot find module '../js/parser.js'` — red state confirmed.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-parser.mjs
git commit -m "test: add parser unit tests (red)"
```

---

## Task 5: Parser Implementation

**Files:**
- Create: `js/parser.js`

- [ ] **Step 1: Create `js/parser.js`**

```js
import { MESSAGE_TYPES, DFID_NAMES } from './data.js';

export function parseUHLL(input) {
  if (!input || !input.trim()) {
    return { error: 'Empty input' };
  }

  let raw = input.trim();

  // Strip CSI wrapper: <<<STX> or <<STX> (one or more leading <)
  raw = raw.replace(/^<+<STX>/, '');
  // Strip <ETX> and everything after
  raw = raw.replace(/<ETX>[\s\S]*$/, '');
  raw = raw.trim();

  if (raw.length < 15) {
    return { error: `Message too short: need at least 15 chars for the header, got ${raw.length}` };
  }

  const mm   = raw.substring(0, 2);
  const dmm  = raw.substring(2, 5);
  const rr   = raw.substring(5, 7);
  const tttt = raw.substring(7, 11);
  const ssss = raw.substring(11, 15);

  // Look up message type name — try zero-padded key first, then with leading zero stripped
  const messageTypeName =
    MESSAGE_TYPES[mm] ||
    MESSAGE_TYPES[mm.replace(/^0+/, '')] ||
    'Unknown Message Type';

  const isFinal = ssss === '9999';

  const elements = [];
  let pos = 15;
  let parseError = null;

  while (pos < raw.length) {
    if (pos + 6 > raw.length) {
      parseError = `Incomplete element triplet at position ${pos} (need 6 chars for DFID+length, only ${raw.length - pos} remain)`;
      break;
    }

    const dfid   = raw.substring(pos, pos + 3);
    const lenStr = raw.substring(pos + 3, pos + 6);
    const len    = parseInt(lenStr, 10);

    if (isNaN(len) || len < 0) {
      parseError = `Invalid length "${lenStr}" at position ${pos + 3}`;
      break;
    }

    if (pos + 6 + len > raw.length) {
      parseError = `Data truncated for DFID ${dfid}: expected ${len} bytes at position ${pos + 6}, only ${raw.length - pos - 6} available`;
      break;
    }

    const value    = raw.substring(pos + 6, pos + 6 + len);
    const dfidName = DFID_NAMES[dfid] || `Unknown DFID (${dfid})`;

    elements.push({ dfid, name: dfidName, length: len, value });
    pos += 6 + len;
  }

  return {
    header: { mm, messageTypeName, dmm, rr, tttt, ssss, isFinal },
    elements,
    parseError,
  };
}
```

- [ ] **Step 2: Run parser tests**

```bash
docker compose run --rm extract node scripts/test-parser.mjs
```

Expected: All assertions pass, `0 failed`.

- [ ] **Step 3: Commit**

```bash
git add js/parser.js
git commit -m "feat: add UHLL parser module"
```

---

## Task 6: Builder Tests (write first — TDD)

**Files:**
- Create: `scripts/test-builder.mjs`

- [ ] **Step 1: Create `scripts/test-builder.mjs`**

```js
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
assert(r8.errors.length === 0 && r8.raw.includes('ABC0001'), 'tttt=0001 is valid');

const r9 = buildUHLL({ mm: '17', dmm: 'ABC', tttt: '9999', ssss: '9999', fields: [] });
assert(r9.errors.length === 0, 'tttt=9999 is valid');

// ── MM zero-padding ───────────────────────────────────────────────────────
const r10 = buildUHLL({ mm: '3', dmm: 'ABC', tttt: '0001', ssss: '9999', fields: [] });
assert(r10.raw.startsWith('03'), `Single-digit mm '3' is zero-padded to '03' (got: ${r10.raw.substring(0,2)})`);

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
```

- [ ] **Step 2: Verify test fails**

```bash
docker compose run --rm extract node scripts/test-builder.mjs
```

Expected: `Error: Cannot find module '../js/builder.js'` — red state confirmed.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-builder.mjs
git commit -m "test: add builder unit tests (red)"
```

---

## Task 7: Builder Implementation

**Files:**
- Create: `js/builder.js`

- [ ] **Step 1: Create `js/builder.js`**

```js
import { MESSAGE_DFIDS, DFID_NAMES, DFID_MAX_LENGTHS } from './data.js';

export function getMessageDfids(mm) {
  const key = String(mm).padStart(2, '0');
  return MESSAGE_DFIDS[key] || [];
}

export function buildUHLL({ mm, dmm, rr = '00', tttt = '0001', ssss = '9999', fields }) {
  const errors = [];

  const mmStr = String(mm).padStart(2, '0').substring(0, 2);

  if (!dmm || dmm.length !== 3) {
    errors.push('DMM must be exactly 3 characters');
  }

  const ttttNum = parseInt(tttt, 10);
  if (isNaN(ttttNum) || ttttNum < 1 || ttttNum > 9999) {
    errors.push('Transaction ID must be between 0001 and 9999');
  }

  if (errors.length > 0) return { raw: null, errors };

  const ttttStr = String(ttttNum).padStart(4, '0');
  const ssssStr = String(ssss).padStart(4, '0').substring(0, 4);
  const header  = mmStr + dmm + rr + ttttStr + ssssStr;

  let body = '';
  for (const { dfid, value } of fields) {
    if (value === undefined || value === null || value === '') continue;
    const strValue = String(value);
    const lenStr   = String(strValue.length).padStart(3, '0');
    body += dfid + lenStr + strValue;
  }

  return { raw: header + body, errors: [] };
}

export function toCSI(raw) {
  return `<STX>${raw}<ETX><LRC>`;
}

export function validateField(dfid, value) {
  const maxLen = DFID_MAX_LENGTHS[dfid];
  if (maxLen && value.length > maxLen) {
    const name = DFID_NAMES[dfid] || dfid;
    return `Value length ${value.length} exceeds max ${maxLen} for ${name}`;
  }
  return null;
}
```

- [ ] **Step 2: Run builder tests**

```bash
docker compose run --rm extract node scripts/test-builder.mjs
```

Expected: All assertions pass, `0 failed`.

- [ ] **Step 3: Run all tests together to confirm no regressions**

```bash
docker compose run --rm test
```

Expected: All three test suites pass with `0 failed` each.

- [ ] **Step 4: Commit**

```bash
git add js/builder.js
git commit -m "feat: add UHLL builder module"
```

---

## Task 8: HTML Structure and CSS

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UHLL Parser</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1>UHLL Parser</h1>
    <p class="subtitle">Universal Hospitality Link Language — Message Parser &amp; Builder</p>
  </header>

  <nav class="tabs">
    <button class="tab-btn active" data-tab="parser">Parser</button>
    <button class="tab-btn" data-tab="builder">Builder</button>
  </nav>

  <!-- Parser Panel -->
  <section class="panel active" data-panel="parser">
    <h2>Parse UHLL Message</h2>
    <p class="hint">Paste a raw UHLL string or CSI-wrapped message.</p>
    <textarea id="uhll-input" rows="4"
      placeholder="e.g. 1735300000199991440011174003102&#10;or <<<STX>17353000001999914400117400310&#x3C;ETX>&#x3C;LRC>"></textarea>
    <button id="parse-btn" class="primary-btn">Parse</button>
    <div id="parse-result"></div>
  </section>

  <!-- Builder Panel -->
  <section class="panel" data-panel="builder">
    <h2>Build UHLL Message</h2>

    <div class="form-row">
      <label for="msg-type-select">Message Type</label>
      <select id="msg-type-select">
        <option value="">— Select a message type —</option>
      </select>
    </div>

    <fieldset class="header-fields">
      <legend>Header</legend>
      <div class="form-row">
        <label for="builder-dmm">DMM <span class="hint-inline">(3 chars)</span></label>
        <input id="builder-dmm" type="text" maxlength="3" placeholder="e.g. 353">
      </div>
      <div class="form-row">
        <label for="builder-tttt">Transaction ID</label>
        <input id="builder-tttt" type="text" maxlength="4" placeholder="0001" value="0001">
      </div>
      <div class="form-row">
        <label for="builder-ssss">Sequence Number</label>
        <input id="builder-ssss" type="text" maxlength="4" placeholder="9999" value="9999">
      </div>
    </fieldset>

    <div id="dfid-fields"></div>

    <div id="build-errors"></div>

    <button id="generate-btn" class="primary-btn">Generate</button>

    <div class="output-controls">
      <label class="toggle-label">
        <input type="checkbox" id="output-toggle"> CSI format
      </label>
      <button id="copy-btn" type="button">Copy</button>
    </div>

    <pre id="build-result" class="output-box"></pre>
  </section>

  <footer>
    UHLL Specification v<span id="spec-version"></span>
  </footer>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:           #f5f7fa;
  --surface:      #ffffff;
  --border:       #dde1e7;
  --primary:      #2563eb;
  --primary-dark: #1d4ed8;
  --text:         #1e2430;
  --muted:        #6b7280;
  --error:        #dc2626;
  --warning:      #d97706;
  --radius:       6px;
  --shadow:       0 1px 3px rgba(0,0,0,.08);
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
}

/* ── Header ── */
header {
  background: var(--primary);
  color: #fff;
  padding: 1.5rem 2rem;
}
header h1    { font-size: 1.5rem; }
.subtitle    { font-size: .875rem; opacity: .85; margin-top: .2rem; }

/* ── Tabs ── */
.tabs {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 2rem;
  display: flex;
  gap: .5rem;
}
.tab-btn {
  padding: .75rem 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: .95rem;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  transition: color .15s, border-color .15s;
}
.tab-btn.active,
.tab-btn:hover { color: var(--primary); border-bottom-color: var(--primary); }

/* ── Panels ── */
.panel         { display: none; padding: 2rem; max-width: 900px; margin: 0 auto; }
.panel.active  { display: block; }
h2             { font-size: 1.1rem; margin-bottom: .5rem; }
.hint          { color: var(--muted); font-size: .875rem; margin-bottom: .75rem; }
.hint-inline   { color: var(--muted); font-size: .8rem; }

/* ── Textarea ── */
textarea {
  width: 100%;
  font-family: 'Courier New', monospace;
  font-size: .875rem;
  padding: .75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  resize: vertical;
  background: var(--surface);
}

/* ── Primary button ── */
.primary-btn {
  display: inline-block;
  margin-top: .75rem;
  padding: .6rem 1.5rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: .95rem;
  cursor: pointer;
  transition: background .15s;
}
.primary-btn:hover { background: var(--primary-dark); }

/* ── Result tables ── */
.result-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.25rem;
  font-size: .875rem;
  background: var(--surface);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
  overflow: hidden;
}
.result-table th {
  background: var(--bg);
  text-align: left;
  padding: .5rem .75rem;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  color: var(--muted);
  font-size: .75rem;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.result-table td {
  padding: .5rem .75rem;
  border-bottom: 1px solid var(--border);
  font-family: 'Courier New', monospace;
}
.result-table tr:last-child td { border-bottom: none; }
.result-table tbody tr:hover   { background: #f0f4ff; }

/* ── Messages ── */
.error   { color: var(--error);   font-size: .875rem; margin-top: .75rem; }
.warning { color: var(--warning); font-size: .8rem; }
.muted-msg { color: var(--muted); font-size: .875rem; margin-top: .75rem; }

/* ── Builder form ── */
.form-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .75rem;
}
.form-row label {
  width: 160px;
  font-size: .875rem;
  flex-shrink: 0;
}
.form-row input,
.form-row select {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: .875rem;
  background: var(--surface);
}

.header-fields {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1rem .25rem;
  margin: 1rem 0;
}
.header-fields legend {
  font-size: .8rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 0 .5rem;
}

#dfid-fields { margin: 1rem 0; }

.field-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .4rem 0;
  border-bottom: 1px solid var(--border);
}
.field-row:last-child { border-bottom: none; }

.field-row label {
  display: flex;
  align-items: center;
  gap: .4rem;
  width: 270px;
  flex-shrink: 0;
  font-size: .875rem;
}
.dfid-num {
  font-family: 'Courier New', monospace;
  font-size: .775rem;
  background: var(--bg);
  padding: .1rem .35rem;
  border-radius: 3px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.dfid-max { font-size: .75rem; color: var(--muted); }

.field-row input {
  flex: 1;
  padding: .4rem .6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: 'Courier New', monospace;
  font-size: .875rem;
  background: var(--surface);
}

.field-warning { font-size: .75rem; color: var(--warning); min-width: 120px; }

/* ── Output controls ── */
.output-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .875rem;
  cursor: pointer;
}
#copy-btn {
  padding: .35rem .9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  font-size: .875rem;
  transition: background .15s;
}
#copy-btn:hover { background: var(--bg); }

.output-box {
  margin-top: .75rem;
  padding: 1rem;
  background: #1e2430;
  color: #e8ecf0;
  font-family: 'Courier New', monospace;
  font-size: .875rem;
  border-radius: var(--radius);
  word-break: break-all;
  white-space: pre-wrap;
  min-height: 3rem;
}

#build-errors { margin-top: .5rem; }

/* ── Footer ── */
footer {
  text-align: center;
  padding: 1.5rem;
  color: var(--muted);
  font-size: .8rem;
  border-top: 1px solid var(--border);
  margin-top: 2rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add HTML structure and CSS styles"
```

---

## Task 9: App.js — UI Wiring

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create `js/app.js`**

```js
import { parseUHLL } from './parser.js';
import { getMessageDfids, buildUHLL, toCSI, validateField } from './builder.js';
import { MESSAGE_TYPES, DFID_NAMES, DFID_MAX_LENGTHS, SPEC_VERSION } from './data.js';

// ── Tab switching ─────────────────────────────────────────────────────────
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('[data-panel]').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
  });
});

// ── Parser tab ────────────────────────────────────────────────────────────
document.getElementById('parse-btn').addEventListener('click', () => {
  const input = document.getElementById('uhll-input').value;
  renderParseResult(parseUHLL(input));
});

function renderParseResult(result) {
  const container = document.getElementById('parse-result');

  if (result.error) {
    container.innerHTML = `<p class="error">${esc(result.error)}</p>`;
    return;
  }

  const { header, elements, parseError } = result;

  const headerRows = [
    ['Message Type', `${esc(header.mm)} — ${esc(header.messageTypeName)}`],
    ['DMM',          esc(header.dmm)],
    ['Reserved',     esc(header.rr)],
    ['Transaction ID', esc(header.tttt)],
    ['Sequence',     `${esc(header.ssss)}${header.isFinal ? ' <em>(final)</em>' : ''}`],
  ];

  const headerHtml = `
    <table class="result-table">
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${headerRows.map(([f, v]) =>
        `<tr><td>${f}</td><td>${v}</td></tr>`).join('')}
      </tbody>
    </table>`;

  const elementsHtml = elements.length === 0
    ? `<p class="muted-msg">No data elements.</p>`
    : `<table class="result-table">
        <thead><tr><th>DFID</th><th>Name</th><th>Length</th><th>Value</th></tr></thead>
        <tbody>${elements.map(e =>
          `<tr>
            <td>${esc(e.dfid)}</td>
            <td>${esc(e.name)}</td>
            <td>${e.length}</td>
            <td>${esc(e.value)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

  const errorHtml = parseError
    ? `<p class="warning">⚠ ${esc(parseError)}</p>`
    : '';

  container.innerHTML = headerHtml + elementsHtml + errorHtml;
}

// ── Builder tab ───────────────────────────────────────────────────────────
const msgSelect  = document.getElementById('msg-type-select');
const dfidFields = document.getElementById('dfid-fields');

// Populate dropdown, sorted numerically
Object.entries(MESSAGE_TYPES)
  .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
  .forEach(([key, name]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${parseInt(key, 10)} — ${name}`;
    msgSelect.appendChild(opt);
  });

msgSelect.addEventListener('change', renderDfidFields);

function renderDfidFields() {
  const mm = msgSelect.value;
  if (!mm) { dfidFields.innerHTML = ''; return; }

  const dfids = getMessageDfids(mm);
  dfidFields.innerHTML = dfids.map(dfid => {
    const name   = DFID_NAMES[dfid]       || dfid;
    const maxLen = DFID_MAX_LENGTHS[dfid] || '';
    return `
      <div class="field-row">
        <label>
          <span class="dfid-num">${dfid}</span>
          ${esc(name)}
          ${maxLen ? `<span class="dfid-max">max ${maxLen}</span>` : ''}
        </label>
        <input type="text" data-dfid="${dfid}"
               placeholder="${esc(name)}"
               ${maxLen ? `maxlength="${maxLen}"` : ''}>
        <span class="field-warning" data-warn="${dfid}"></span>
      </div>`;
  }).join('');

  dfidFields.querySelectorAll('input[data-dfid]').forEach(input => {
    input.addEventListener('input', () => {
      const warn = dfidFields.querySelector(`[data-warn="${input.dataset.dfid}"]`);
      warn.textContent = validateField(input.dataset.dfid, input.value) || '';
    });
  });
}

document.getElementById('generate-btn').addEventListener('click', () => {
  const mm   = msgSelect.value;
  if (!mm) return;

  const dmm  = document.getElementById('builder-dmm').value.trim();
  const tttt = document.getElementById('builder-tttt').value.trim() || '0001';
  const ssss = document.getElementById('builder-ssss').value.trim() || '9999';

  const fields = [];
  dfidFields.querySelectorAll('input[data-dfid]').forEach(input => {
    fields.push({ dfid: input.dataset.dfid, value: input.value });
  });

  const { raw, errors } = buildUHLL({ mm, dmm, rr: '00', tttt, ssss, fields });

  const errEl = document.getElementById('build-errors');
  if (errors.length > 0) {
    errEl.innerHTML = errors.map(e => `<p class="error">${esc(e)}</p>`).join('');
    document.getElementById('build-result').textContent = '';
    return;
  }
  errEl.innerHTML = '';
  updateBuildOutput(raw);
});

let currentRaw = '';

function updateBuildOutput(raw) {
  currentRaw = raw;
  const isCSI = document.getElementById('output-toggle').checked;
  document.getElementById('build-result').textContent = isCSI ? toCSI(raw) : raw;
}

document.getElementById('output-toggle').addEventListener('change', () => {
  if (currentRaw) updateBuildOutput(currentRaw);
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.getElementById('build-result').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
});

// ── Footer: display spec version ─────────────────────────────────────────
document.getElementById('spec-version').textContent = SPEC_VERSION;

// ── Utility ───────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Start local dev server**

```bash
docker compose up serve
```

Open http://localhost:8080.

- [ ] **Step 3: Verify Parser tab**

Paste `1735300000199991440011174003102` → click **Parse**.

Expected result table:
```
Message Type  |  17 — Maid Code
DMM           |  353
Reserved      |  00
Transaction ID|  0001
Sequence      |  9999 (final)

DFID | Name            | Length | Value
144  | Generic Status  | 1      | 1
174  | Station Number  | 3      | 102
```

- [ ] **Step 4: Verify Parser tab — CSI input**

Paste `<<<STX>1735300000199991440011174003102<ETX><LRC>` → click **Parse**.

Expected: Same result as Step 3.

- [ ] **Step 5: Verify Builder tab**

Select "17 — Maid Code", enter DMM `353`, fill Generic Status = `1`, Station Number = `102`, click **Generate**.

Expected raw output: `1735300000199991440011174003102`

Toggle CSI format checkbox.

Expected: `<STX>1735300000199991440011174003102<ETX><LRC>`

Click **Copy** → Clipboard contains the displayed string.

- [ ] **Step 6: Verify inline max-length warning**

In the Builder, select message 17, type 15 characters in the Station Number field (max 14).

Expected: Warning text appears next to the field (e.g. "Value length 15 exceeds max 14 for Station Number").

- [ ] **Step 7: Verify footer shows spec version**

Expected: Footer shows "UHLL Specification v16.12"

- [ ] **Step 8: Commit**

```bash
git add js/app.js
git commit -m "feat: add app.js UI wiring — parser and builder tabs"
```

---

## Task 10: Maintenance Guide

**Files:**
- Create: `guide.md`

- [ ] **Step 1: Create `guide.md`**

```markdown
# UHLL Parser — Maintenance Guide

## Update for a New UHLL Version

When HPD releases a new version of the UHLL specification, follow these steps.

### 1. Download updated source files

From the HPD website (https://my.comtrol.com), download:
- **UHLL Test Message Report** → save as `report.txt` (replaces existing)
- **UHLL Version Report** → save as `versions_report.txt` (replaces existing)

### 2. Regenerate js/data.js

```bash
docker compose run --rm extract
```

Output should look like:
```
Detected latest UHLL version: X.X
Extracted YY message types, ZZ DFIDs (UHLL vX.X)
Written: js/data.js
```

### 3. Run all tests

```bash
docker compose run --rm test
```

All tests must pass. If a test fails, the report file format may have changed — check the
parsing logic in `scripts/extract-data.js` against the new format.

### 4. Spot-check in browser

```bash
docker compose up serve
```

Open http://localhost:8080 and verify:
- Footer shows the new spec version number
- Builder dropdown contains a known message type (e.g. "17 — Maid Code")
- Parser correctly parses: `1735300000199991440011174003102`
- Builder generates that same string for message 17 with DMM=353, Generic Status=1, Station Number=102

### 5. Commit and deploy

```bash
git add js/data.js report.txt versions_report.txt
git commit -m "Update to UHLL vX.X"
git push
```

GitHub Pages deploys automatically within ~60 seconds.

---

## Local Development

### Start the dev server

```bash
docker compose up serve
```

Access the site at http://localhost:8080. File changes (HTML, CSS, JS) are reflected on
browser reload — no container restart needed.

### Run a one-off command in the Node.js container

```bash
docker compose run --rm extract node scripts/extract-data.js
docker compose run --rm extract node scripts/test-parser.mjs
```

### Rebuild Docker images (after changing Dockerfiles)

```bash
docker compose build
```

---

## GitHub Pages Setup (first time)

1. Push the repository to GitHub (ensure `js/data.js` is committed)
2. Go to **Settings → Pages** in the GitHub repository
3. Under **Source**, select **Deploy from a branch**
4. Choose `main` branch, root folder `/`
5. Click **Save** — the site is live at `https://<username>.github.io/<repo-name>/`

Note: `js/data.js` must be committed to the repository (it is not in `.gitignore`) because
GitHub Pages has no build step to regenerate it.
```

- [ ] **Step 2: Commit**

```bash
git add guide.md
git commit -m "docs: add maintenance and deployment guide"
```

---

## Task 11: Final Integration Verification

- [ ] **Step 1: Run full test suite one last time**

```bash
docker compose run --rm test
```

Expected: All three test suites pass with `0 failed`.

- [ ] **Step 2: Verify complete file structure is in place**

```bash
find . -not -path './.git/*' -not -name '.gitkeep' | sort
```

Expected output includes:
```
./css/style.css
./docker-compose.yml
./docker/Dockerfile.extract
./docker/Dockerfile.serve
./docker/nginx.conf
./guide.md
./index.html
./js/app.js
./js/builder.js
./js/data.js
./js/parser.js
./scripts/extract-data.js
./scripts/test-builder.mjs
./scripts/test-extract.mjs
./scripts/test-parser.mjs
```

- [ ] **Step 3: Start serve and do a final end-to-end walkthrough**

```bash
docker compose up serve
```

1. Open http://localhost:8080
2. **Parser tab** — paste raw: `1735300000199991440011174003102` → parse → verify Maid Code breakdown
3. **Parser tab** — paste CSI: `<<<STX>1735300000199991440011174003102<ETX><LRC>` → same result
4. **Parser tab** — paste empty input → verify error message shown
5. **Builder tab** — select "17 — Maid Code", DMM=`353`, Generic Status=`1`, Room Number=`102` → Generate → verify raw output
6. **Builder tab** — toggle CSI → verify `<STX>...<ETX><LRC>` format
7. **Builder tab** — Copy → paste in text editor to confirm clipboard content
8. **Builder tab** — enter invalid DMM (e.g. `AB`) → Generate → verify error shown

- [ ] **Step 4: Final commit**

```bash
git status
git add -A
git commit -m "chore: final integration verified — UHLL parser v1.0"
```

- [ ] **Step 5: Push to GitHub and confirm GitHub Pages deployment**

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Wait ~60 seconds, then open `https://<your-username>.github.io/<repo-name>/` and verify the page loads.
