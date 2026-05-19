import { MESSAGE_DFIDS, DFID_NAMES, DFID_MAX_LENGTHS } from './data.js';

export function getMessageDfids(mm) {
  const key = String(mm).padStart(2, '0');
  return MESSAGE_DFIDS[key] || [];
}

export function buildUHLL({ mm, dmm, rr = '00', tttt = '0001', ssss = '9999', fields = [] }) {
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
  if (value == null) return null;
  const strValue = String(value);
  const maxLen = DFID_MAX_LENGTHS[dfid];
  if (maxLen && strValue.length > maxLen) {
    const name = DFID_NAMES[dfid] || dfid;
    return `Value length ${strValue.length} exceeds max ${maxLen} for ${name}`;
  }
  return null;
}
