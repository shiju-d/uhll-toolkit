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
