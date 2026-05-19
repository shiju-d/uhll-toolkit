# UHLL Parser Webpage — Design Spec

**Date:** 2026-05-19
**Status:** Approved

## Overview

A static single-page web application that provides two-way conversion between raw UHLL protocol messages and human-readable form. Hosted on GitHub Pages with no build pipeline. Supports UHLL Specification Version 16.12 (latest). A Node.js extraction script regenerates the data layer from `report.txt` whenever a new spec version is released.

---

## Architecture & File Structure

```
uhll_parser/
├── index.html              # Single-page app shell — tab UI (Parser / Builder)
├── css/
│   └── style.css           # Styling
├── js/
│   ├── data.js             # AUTO-GENERATED — message types + DFID lookup table
│   ├── parser.js           # Raw/CSI UHLL → structured object → human-readable display
│   ├── builder.js          # Message type + DFID field values → raw/CSI UHLL string
│   └── app.js              # UI wiring: tab switching, events, copy-to-clipboard
├── scripts/
│   └── extract-data.js     # Node.js script: reads report.txt + versions_report.txt → writes js/data.js
├── docker/
│   ├── Dockerfile.extract  # Node.js image — runs extract-data.js inside container
│   └── Dockerfile.serve    # Nginx image — serves the static site locally
├── docker-compose.yml      # Orchestrates extract + serve services
├── report.txt              # Full message snapshot per version (primary data source — has max-lengths)
├── versions_report.txt     # Incremental changelog per version (secondary — version detection + changelog)
├── guide.md                # Step-by-step: how to update for new UHLL versions
└── overview.md             # UHLL protocol reference
```

**Data flow:**
- `report.txt` + `versions_report.txt` → `extract-data.js` (inside Docker) → `js/data.js`
- Parser tab: user pastes UHLL string → `parser.js` + `data.js` → labeled breakdown table
- Builder tab: user picks message type → `builder.js` + `data.js` → dynamic DFID fields → UHLL string

**Docker setup — no local dependencies required beyond Docker itself:**

| Service | Image | Purpose |
|---------|-------|---------|
| `extract` | Node.js (Alpine) | Runs `extract-data.js` once; mounts project root as volume so `js/data.js` is written to the host |
| `serve` | Nginx (Alpine) | Serves the static site at `http://localhost:8080` for local development; mounts project root as volume for live edits |

**Common commands (documented in `guide.md`):**
```bash
# Generate js/data.js from report.txt + versions_report.txt
docker compose run --rm extract

# Start local dev server at http://localhost:8080
docker compose up serve

# Full update workflow: replace report files, regenerate data, restart server
docker compose run --rm extract && docker compose up serve
```

---

## Parser Module (`js/parser.js`)

### Input Formats
- **Raw UHLL:** `1735300000199991440011174003102`
- **CSI format:** `<<<STX>17@@@0000019999144014Generic Status174014Station Number<ETX><LRC>`
  - `<<` is the CSI data-flow directive; `<STX>` is start-of-text. The parser strips both along with the trailing `<ETX><LRC>` to extract the bare UHLL message.

### Parsing Steps
1. Strip CSI wrapper — remove leading `<<<STX>` (or `<<STX>`) and trailing `<ETX><LRC>` (and anything after) if present
2. Extract header fields by fixed position:
   - Positions 0–1: Message Type (MM)
   - Positions 2–4: DMM
   - Positions 5–6: Reserved (RR)
   - Positions 7–10: Transaction ID (TTTT)
   - Positions 11–14: Sequence Number (SSSS)
3. Walk remaining string, reading element triplets: 3-char DFID + 3-char length + N-char data
4. Resolve names via `data.js` (MM → message type name, DFID number → field name)
5. Render a labeled breakdown table

### Output Display

```
Message Type:    17 — Maid Code
DMM:             353
Reserved:        00
Transaction ID:  0001
Sequence:        9999 (final)

DFID  Name            Length  Value
144   Generic Status  1       1
174   Station Number  3       102
```

---

## Builder Module (`js/builder.js`)

### User Flow
1. Select message type from dropdown (e.g., "17 — Maid Code")
2. Fill in header fields:
   - DMM (3 characters, required)
   - Transaction ID (4-digit numeric, auto-populated with 0001, user-editable)
   - Sequence Number (defaults to 9999 for single-message transactions)
3. Dynamic DFID input fields appear — one per DFID associated with the selected message type, sourced from `data.js`
4. All DFID fields are optional; empty fields are omitted from the generated message
5. Click **Generate** → output appears below with toggle and copy button

### Output Panel
- Toggle between **Raw UHLL** and **CSI format**
  - CSI output wraps the message as `<STX>{message}<ETX><LRC>` with `<LRC>` as a literal placeholder (LRC checksum calculation is out of scope)
- Copy-to-clipboard button

### Validation
- DMM: must be exactly 3 characters
- Transaction ID: enforced as 4-digit numeric (0001–9999)
- Data length: auto-calculated from input value — user never types length manually
- Input value exceeding a DFID's known max length: inline warning (non-blocking)

---

## Data Extraction Script (`scripts/extract-data.js`)

### Purpose
Reads **both** `report.txt` and `versions_report.txt` to produce `js/data.js`. Each file plays a distinct role — neither is sufficient alone.

### Source File Roles

| File | Role | Why needed |
|------|------|------------|
| `report.txt` | Primary — full current-state snapshot | Contains DFID max-lengths embedded in message lines (e.g. `174014Station Number` → max 14). Also the authoritative source for message type → DFID mappings for the latest version. |
| `versions_report.txt` | Secondary — incremental changelog | Used to detect the latest version number and extract per-version change history (new/updated messages and DFIDs). Enables a future "What's new" panel. |

### Parsing Logic
1. **Detect latest version** from `versions_report.txt` (last `UHLL Specification Version X.X` heading)
2. **Extract full message set** from `report.txt` for that version:
   - Message types from the Message Definition Table (`| 17 | Maid Code |`)
   - DFIDs per message type from outbound/inbound message lines (`144014Generic Status` → DFID 144, max-length 14, name "Generic Status")
   - Global DFID name + max-length dictionary built from all unique entries
3. **Extract changelog** from `versions_report.txt` — new/updated messages and DFIDs per version (stored in `data.js` for future UI use)

### Output Shape (`js/data.js`)
```js
export const SPEC_VERSION = "16.12";

export const MESSAGE_TYPES = {
  "17": "Maid Code",
  "14": "Check In Room",
  // ...
};

export const DFID_NAMES = {
  "144": "Generic Status",
  "174": "Station Number",
  // ...
};

export const MESSAGE_DFIDS = {
  "17": ["144", "174"],
  "14": ["008", "018", "023", ...],
  // ...
};

export const DFID_MAX_LENGTHS = {
  "144": 14,
  "174": 14,
  // ...
};

// Per-version changelog (from versions_report.txt) — for future "What's new" UI
export const VERSION_CHANGELOG = {
  "16.12": { messages: [...], dfids: [...] },
  // ...
};
```

### Usage
```bash
node scripts/extract-data.js
# Reads report.txt + versions_report.txt → writes js/data.js
# Prints: "Extracted X message types, Y DFIDs (UHLL v16.12)"
```

---

## GitHub Pages Deployment

- **Repository:** standard GitHub repo, `main` branch
- **Pages source:** root of `main` branch — no build step, no GitHub Actions required
- **Deploy:** every `git push` to `main` auto-deploys (ensure `js/data.js` is committed before pushing)
- **Native ES modules** (`type="module"` on script tags) are served directly by GitHub Pages
- Docker is used for **local development only** — GitHub Pages serves the static files directly

---

## Version Update Workflow

Documented fully in `guide.md`:
1. Download the new `report.txt` **and** `versions_report.txt` from the HPD website
2. Replace both files in the project root
3. Run `docker compose run --rm extract`
4. Verify the printed summary (detected version, message type count, DFID count)
5. Run `docker compose up serve` and spot-check a known message type in both parser and builder at `http://localhost:8080`
6. `git add js/data.js report.txt versions_report.txt && git commit -m "Update to UHLL vX.X" && git push`

---

## Out of Scope

- Multi-transaction / multi-sequence message assembly
- UHLL version selection in the UI (future enhancement)
- Server-side processing or persistence
- LRC checksum validation
- Production Docker image (GitHub Pages serves static files directly)
