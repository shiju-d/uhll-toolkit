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

  // Skip past the closing +== border of the version header box, then find the
  // next +== block that signals another version section (or use EOF).
  const headerBoxClose = reportText.indexOf('+==', startIdx + versionHeader.length);
  const searchFrom = headerBoxClose !== -1 ? headerBoxClose + 3 : startIdx + versionHeader.length;
  const nextVersionIdx = reportText.indexOf('+==', searchFrom);
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
  // Split on version section boundaries (+===...===+\n| UHLL Specification Version)
  const blocks = versionsText.split(/(?=\+={10,}\+\n\| UHLL Specification Version)/);

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
