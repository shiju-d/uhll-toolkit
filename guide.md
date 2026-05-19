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
