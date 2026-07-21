# FSO Field App — CLAUDE.md

Context file for Claude Code sessions. Read this first — the CLI has no memory of prior sessions.

## What this is

A single-file offline-first PWA (`FSO_App.html` + `sw.js` + `manifest.json`) for John Thompson
(ACTOM) field service engineers. ~10 users. Captures FSO job cards on-site (offline), collects
customer signatures, and syncs to OneDrive/SharePoint via MSAL + Microsoft Graph.

**Owner/editors:** Ludvig Botha + IT (2 editors). All other engineers are read-only users.
**Current version:** see `APP_VERSION` in FSO_App.html. Bump it on every push.

## Hard rules — never break these

1. **Original PDFs are immutable.** First export = `<OfficialNo>.pdf`, never overwritten.
   Re-exports become `<OfficialNo> Rev 1.pdf`, `Rev 2`, … The working `.xlsx` always carries
   the LATEST data and is overwritten freely. This rule applies on OneDrive AND SharePoint.
2. **Export is hard-blocked without the official FSO number.** No bypass, no "send anyway".
   The wrong number on a signed FSO causes real admin mix-ups.
3. **Offline-first.** Signature capture and data entry must work with zero connectivity.
   Nothing may block on the network at capture time; sends queue and drain later.
4. **Security matters.** PIN lock, no secrets in the repo (the Azure Client ID is public by
   design; anything else sensitive goes in Settings, entered per user).
5. **The All sheet uses FORMULAS, not written values** — the workbook must stay
   self-consistent even if someone edits a sheet by hand in Excel.

## Two-number system

- **Book ref** (e.g. `47703C`): generated when a book is created (always 50 numbers per book).
  Names the worksheet (`sheetNameFor` → last two digits, `01`–`50`), orders things on the
  engineer's side. Reference only.
- **Official FSO number**: issued by the company SharePoint system when the job is registered
  there. Pasted into FSO Details → "Official FSO No." This is the number of record — printed
  in the FSO No field (cell F20) on the sheet and PDF, used for file/folder names, shown on
  the All sheet (via `='NN'!F20` formula).

## Per-FSO workflow

1. Engineer fills in job on-site, offline; customer signs.
2. Back in signal: "Register job ↗" (URL kept in Settings → SharePoint) → company system
   issues the official number AND auto-creates the job folder on SharePoint.
3. Paste official number + job folder URL into FSO Details.
4. Export (blocked until official number present):
   - writes data into the FSO's sheet in the book workbook (OneDrive, Graph range PATCH)
   - creates/uses a per-job OneDrive folder named `<OfficialNo>` under the book folder;
     working xlsx + revision-safe PDF go there
   - if Settings → SharePoint → upload toggle is ON: same files uploaded into the pasted
     SharePoint job folder via Graph `/shares/{u!base64url}/driveItem` (same revision rule)
   - optional email via Graph sendMail with PDF + ticked attachments

## Workbook architecture (one Excel workbook per book)

- Created in OneDrive when a book is created (`odCreateWorkbook`); lazy or upfront sheet mode.
- Sheet `TEMPLATE` (hidden once real sheets exist) is the copy source; per-FSO sheets are
  server-side copies named `01`–`50`.
- **All sheet** (first sheet): one row per FSO. Column A = book ref (literal, written at
  creation). Columns B–J are formulas pulling from each FSO sheet: FSO No (F20), Customer
  (F15), Date (TEXT of X13), NT/OT1.5/OT2.0 sums (R/T/V 25:39), Km (SUM F25:F39), Materials R
  (SUM AM25:AM39), and a `HYPERLINK("#'NN'!A1","Open ▸")` jump link.
- **Gotcha:** Excel turns references to not-yet-existing sheets into permanent `#REF!`, so an
  FSO's formula row is written only when its sheet is created (`odEnsureSheet` →
  `odWriteAllRow`). Never pre-write formula rows.
- Old macro workbook (`47700C47750C_..._Macros.xlsm`) is retired — kept only as an example.

## Azure / Graph

- MSAL SPA + PKCE, no client secret. Redirect URI = exact GitHub Pages URL, platform "SPA".
- Base delegated scopes: `Files.ReadWrite`, `User.Read`, `Mail.Send`.
- `Sites.ReadWrite.All` is requested **only** when the SharePoint upload toggle is on
  (`odScopes()`), because it needs IT admin consent — asking earlier would block every
  engineer's sign-in with an approval screen. After IT consent: toggle on, sign out/in.
- PDF generation = upload filled xlsx, then Graph `?format=pdf` (server-side, pixel-true).

## Distribution (GitHub)

- **Private repo** `fso-app` (Ludvig + IT as collaborators) = source of truth.
- **GitHub Pages** off `main` hosts the live app; all engineers bookmark the Pages URL.
- Update flow: push → Pages redeploys → service worker (`sw.js`, cache name `fso-cache-vNN`)
  detects the new shell → "New version ready" banner → engineer taps Update. No git on phones.
- Optional public mirror `fso-app-mirror` synced by a GitHub Action (force-push on main,
  PAT stored as `MIRROR_PUSH_TOKEN` secret) so engineers can view code read-only.
- On every release: bump `APP_VERSION`, bump the sw cache version, add a CHANGELOG.md entry.

## Storage model (client)

- `APP` object in localStorage (`saveData` with quota try/catch).
- Attachment/signature bytes in IndexedDB (`fso-files` DB), images compressed on capture.
- Rolling cloud backup `backup-latest.json` on every sync; manual export/restore in Settings.
- Multi-device: per-FSO `modifiedAt`, newest-wins merge in `syncBook`.

## Future / not yet implemented (do NOT build without asking)

- Stock sheet integration (auto material costs/selling/stock codes).
- Timesheet push into an Excel sheet via Graph (current: local xlsx download generator).
- Risk Assessment attachment (Phase 3 checkbox is disabled in the UI).
- At-rest encryption of localStorage (discussed, deferred — migration complexity).
