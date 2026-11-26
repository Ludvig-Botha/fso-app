# FSO Field App — CLAUDE.md

Context file for Claude Code sessions. Read this first — the CLI has no memory of prior sessions.

## What this is

A single-file offline-first PWA (`FSO_App.html` + `sw.js` + `manifest.json`) for John Thompson
(ACTOM) field service engineers. ~10 users. Captures FSO job cards on-site (offline), collects
customer signatures, and syncs to OneDrive/SharePoint via MSAL + Microsoft Graph.

**Owner/editors:** Ludvig Botha + IT (2 editors). All other engineers are read-only users.
**Current version:** see `APP_VERSION` in FSO_App.html. Bump it on every push.

## Hard rules — never break these

1. **PDF revisions (v2.12.0, `ensureFsoPdf`).** First PDF = `<title> FSO.pdf`. A new revision
   (`… FSO Rev 1.pdf`, `Rev 2`, …) only when printed data changed (`fsoDataHash`). The ONE
   exception to "never overwrite": a PDF that was not fully signed is replaced (same name) when
   the only change is signatures being added. A fully signed PDF is never overwritten. The
   working `.xlsx` always carries the LATEST data and is overwritten freely. Every PDF goes
   through `ensureFsoPdf` — never call `odMakeFsoPdf` (legacy). Names: `pdfFileName(title, rev,
   signed)` → "<title> FSO[ Rev N][ Signed].pdf" (Signed = customer signature present); when an
   unsigned PDF is replaced by its signed copy the unsigned file is deleted.
2. **The app's FSO number is the number of record** (v2.12.0). The official-number field and the
   export hard block still exist behind `FEATURES.officialNo` (false) — do not re-enable without
   Ludvig's go-ahead. Gates use `officialNoMissing(fso)`.
3. **Offline-first.** Signature capture and data entry must work with zero connectivity.
   Nothing may block on the network at capture time; sends queue and drain later.
4. **Security matters.** PIN lock, no secrets in the repo (the Azure Client ID is public by
   design; anything else sensitive goes in Settings, entered per user).
5. **The All sheet uses FORMULAS, not written values** — the workbook must stay
   self-consistent even if someone edits a sheet by hand in Excel.
6. **User-entered links open ONLY through `safeOpenUrl()`** (https only, no embedded
   login details, checked at open time). Never call `window.open(userValue)` directly.

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

## SharePoint shortcuts (v2.10.0)

- Home → **SharePoint** card → `screen-sp-links` (list) → groups open `screen-sp-group`
  (`ctx.linkId`). Home → **Audit Report** card → `openAuditApp()`.
- Data: `APP.settings.links = { audit, items:[{id, icon, label, url, pinned, children:[…]}] }`,
  created from `LINK_DEFAULTS` by `linksCfg()`. One level of children only. Part of `APP`, so
  it is in every backup automatically. Each engineer enters their own URLs (by design, for now).
- Device sync (v2.10.1): links + pins travel in `app_index.json` → `settings.links` with
  `settings.linksUpdatedAt`; `mergeLinksFromCloud()` (called from `odMergeFromCloud`) adopts
  the newer copy through `sanitizeLinks()`, or sets `linksPushPending` so startup pushes the
  index. Any change to links must go through `linksTouched()` (stamps + pushes).
- Editor: Settings → SharePoint shortcuts (`screen-settings-links`). Edits a deep-copied
  `linksDraft`; `readLinksForm()` syncs inputs before any add/move/delete; ← / ✓ run
  `saveLinksSettings()`, which refuses to save while any URL fails `linkUrlProblem()`.
- Pins: `pinned` on any item or child → chips in `#home-pins` (`renderHomeLinks()`, called
  from `renderHome()`).
- Share/import: `shareLinks()` → `FSO-App-links.json` `{kind:'fso-app-links', version:1,
  audit, items}` (no pins). `importLinks()` caps sizes, regenerates ids, blanks non-https
  URLs, keeps pins by label, loads into the draft only (user must tap ✓).
- Offline: `refreshNetUi()` on `online`/`offline` events; `.link-off` greys items.
- Links open with `window.open(url,'_blank','noopener')`. SharePoint sends frame-ancestors
  restrictions, so an in-app iframe is NOT possible — don't try.

## Back button handling (v2.10.0)

- Problem: MSAL `loginRedirect` (standalone PWA) leaves login.microsoftonline.com in the
  history behind the app, so Android back left the app for the sign-in page.
- `initBackHandling()` keeps one guard history entry on top (`armBackGuard`, first pushed on a
  user click/keydown because Chrome skips entries added before any user activation).
  `popstate` → re-arm → `handleHardwareBack()`: closes an open overlay via its own close
  function, else clicks the active screen's visible `.topbar .back-btn` (so save-on-back
  screens still save). Home: toast only. PIN: nothing. Error screen: `errorBackHome()`.
- New overlays must be added to the list in `handleHardwareBack()`.

## FSO page model (v2.11.0)

- **Materials are per FSO**: `fso.materials[]` = `{id, date, description, stockCode, qty, costPrice,
  sellingPrice, totalSelling, receiptAttId}`. `migrateFsoMaterials()` (run in `migrateData` and on
  opening the Materials screen) moves legacy `day.materials` across; `fsoMaterials(fso)` is the ONE
  reader (totals, page, sheets). Sheet rows: `materialSheetRows()` → AD25:AD39 "name ×qty",
  AM25:AM39 line total (15 rows, overflow summed into row 15). Receipts are normal attachments
  flagged `receipt:true`.
- **Accommodation is opt-in**: `fso.hasAccommodation`; always read through `fsoHasAcc()`. When off,
  `calcTotals` charges nothing and I68/M68 are left blank on both sheet writers.
- **Customer label**: `custLabel(c)` = name + city (+ country when not South Africa), from
  `c.city`/`c.country` or a 4-line address. `fsoCustLabel(fso)` prints in F15 and lists;
  `fso.header.customer` stays the bare company name (folder/file names unchanged).
- **Boiler Number & More** values are written back to the customer by `rememberCustomerExtras()`
  (`jtContractNo`, `poNo`, `vatNo`, `accountNo`, boiler appended to `c.boilers`).
- **Open Job** → `openJobRegister()` → `APP.settings.links.register` (synced/shared/sanitised with
  the other links). **RFP page** → the links item with id `rfp`.
- `askChoice()` / `#choice-overlay` is a small promise-based chooser (registered in
  `handleHardwareBack`).

## Currency & PDF actions (v2.12.0)

- `fso.currency = {code:'ZAR'|'USD'|'GBP', rate, at, source, addVat}`; `rate` = foreign units per
  1 ZAR, captured from `FX_URL` (open.er-api.com, CORS ok, no key) at creation or on Update rate,
  or set by Override ("1 USD = R …"). Never refreshed automatically.
- `calcTotals` stays in ZAR; `calcTotalsFx` converts money + rates for printing. Both sheet
  writers use it; materials rows and M68 are multiplied by `t.fxRate`. Local PDF path swaps the
  template's Rand number formats (`fxStyleXml`, function replacers — "$" in a replace string is
  special) and headings AM24/R60; the Graph path PATCHes `numberFormat` entries (`w.numberFormat`).
- Foreign FSOs: VAT excluded unless `currency.addVat` (`fxNoVat`). Print/email blocked while a
  foreign FSO has no rate.
- FSO page: **Create** (`createJobOnly`: folder + xlsx + receipts), **Print PDF / Update**
  (`printPdfUpdate` → `ensureFsoPdf`), **Latest PDF** (`previewLatestPdf`, IndexedDB cache
  `pdf-<book>-<fso>`), **Share PDF** (Web Share API, download fallback).
- Receipts (`attachment.receipt`) upload to `<job folder>/Receipts` (`uploadReceipts`), are
  never printed, and go only with the **admin** email.
- Book workbook = OneDrive › FSO App › "FSO work book <start>-<end>" › "FSO work book
  <start>-<end>.xlsx" (All sheet + one sheet per FSO, filled by Export). All sheet column K =
  currency, written by `odExportFso`.
- `FEATURES.spJobFolder` (false) hides the SharePoint job folder / upload feature.

## v2.13.0 additions

- **Office GPS** defaults to `OFFICE_DEFAULT_GPS` (-33.928917, 18.641889, JT Bellville) in
  `migrateData`; `parseCoords()` reads decimal, DMS and Google Maps links (office + customers).
- **Day details** `day.details` → `commentLines(fso)`: description, blank line, then
  "dd/mm/yyyy – details" wrapped to 115 chars over A42:A59 (18 merged rows) on BOTH writers.
- **Engineer signature**: `APP.settings.engineerSignature` (per device, in backups);
  `engineerSigFor(fso)` is used for the sheet image, the signature hash and validation.
  `openSig('profile')` / `confirmSig` handle the profile mode.
- **Attachments in the PDF**: `attPrints(a)` (`a.printWithPdf`; default true for PDFs, false for
  images; receipts never) → `mergeAttachmentsIntoPdf` (pdf-lib, SRI-pinned, loaded on demand).
  Their ids are part of `fsoDataHash`. Emails don't attach printed attachments again.
- **Status Sent** is set ONLY by Share PDF (`markSent`). Export/email no longer change it.
- **Active FSOs**: pills All/Open/In Progress/Signed/Sent/Completed; All = every non-available FSO,
  sorted by FSO number (numeric).
- **Delete** moves the job folder to `<book folder>/Deleted FSO's` (`odMoveToDeleted`; offline →
  queue op `moveDeleted`). `odEnsureChildFolder` encodes "'" as %27 in paths.
- `editCustomerFromFso()` carries `fsoId/bookId` into the customer screen's ctx (goTo replaces
  ctx — anything that must survive a round-trip has to be passed along).

## Status colours (v2.13.1)

- `statusKey(fso)` → active (open/progress, yellow) · signed (orange) · sent without customer
  signature (red) · sentsigned (purple) · done/complete (green); CSS `.st .st-<key>`, total = white.
  Use `statusChipFor(fso)` / `statusDot(fso)` — not `statusChip(status)` — wherever an FSO is shown.
- Home version banner: `renderHomeVersion()` (silent live-version check every 10 min) /
  `homeVersionAction()`.

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
- Shared/central SharePoint link list pushed to all engineers (currently each engineer
  enters their own; share/import file covers handing links on).
