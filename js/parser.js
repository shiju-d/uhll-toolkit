import { MESSAGE_TYPES, DFID_NAMES } from './data.js';

export function parseUHLL(input) {
  if (!input || !input.trim()) {
    return { error: 'Empty input' };
  }

  let raw = input.trim();

  // Strip CSI wrapper: <STX> or <<<STX> (zero or more leading <)
  raw = raw.replace(/^<*<STX>/, '');
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
