# Changelog

## v2.2.0 — 2026-07-21
- FIX (406 PDF, real root cause): FSO documents are now built SERVER-SIDE.
  The app uploads the pristine template (written by Excel itself) and fills it
  through the Graph workbook API, instead of rebuilding the .xlsx in the browser
  and sending that to Microsoft's converter — which rejected it with 406
  UnsupportedMediaType. Preview FSO (PDF), the PDF copy on export, and the
  company-system email all use this path now.
- Because Excel Online owns the file, its own formulas recalculate live, so
  totals are always right, and the sheet is renamed to the job number instead of
  staying "18".
- Naming: job folder is now "<Job number> <Company> <Job description>"; the
  workbook/PDF inside use the same name with " FSO" appended. Illegal characters
  stripped and length-capped so long descriptions can't break uploads.
- FIX: "Create on Company System" now always sends. A PDF-conversion failure
  falls back to attaching the workbook and reports the reason, instead of
  silently aborting before sendMail.
- Book workbooks left half-built by earlier versions (single "18" sheet, no All
  sheet) now self-repair on the next export. SW cache v14.

## v2.1.1 — 2026-07-21
- FIX (406 PDF preview): removed the calcPr hand-edit and now strip the stale
  calcChain.xml before export. That inconsistency made the Office PDF-conversion
  service reject the file with HTTP 406 while Excel still opened it — which is why
  the download preview worked but "Preview FSO (PDF)" failed and fell back to a
  file named "<n> preview.xlsx".
- FIX (empty workbook sheet): "Send to workbook" now writes through a persistent
  workbook session and reads a cell back to confirm data landed. Session-less
  writes on a just-copied sheet could silently no-op, leaving the sheet blank.
- FIX (device sync): Sync is now TWO-WAY. Previously "Sync now" and startup only
  pushed the local device up, so a second device never pulled the first device's
  jobs. Both "Sync now" and app startup now pull the cloud index, merge every
  book (newest-per-FSO wins, cloud-only books added whole), then push. Your data
  stays in your own OneDrive; engineers still only see their own.
- Fallback preview filename uses the official FSO number when present. SW cache v13.

## v2.1.0 — 2026-07-21
- FIX: workbook creation — Graph worksheet calls now retry while the workbook service
  warms up and address sheets by name (worksheet IDs contain braces that broke URLs).
  All sheet + FSO sheets now actually get created; failures show a toast instead of
  passing silently.
- FIX: preview/PDF totals — the sheet's formula cells are now computed by the app and
  written as values (the template carried cached results from the FSO it was cleaned
  from, and neither the filler nor Graph's PDF converter recalculates).
- FIX: export emails — an address typed but not yet "tagged" (no Enter pressed) is now
  included automatically.
- Rates: removed from New Book; global under Settings → Rates; travel (km) rate split
  External/Internal; everything defaults to 0 on first run; each FSO locks its rates at
  the moment of export — later changes only affect unexported FSOs.
- Customers: contacts (name/email/number) — import template, editor card, signature
  name pick-list, tap-to-add email chips on export. Never printed on the FSO.
- Customer_Import_Template.xlsx: company, site address, VAT, account, default round-trip
  km, boilers (No/Model), contacts.
- FSO screen: "Preview FSO (PDF)" (in-app viewer, nothing saved, no revision consumed),
  "Open Job Folder ↗" (replaces PO/Requisition placeholder), "Create on Company System ✉"
  — one email, signed PDF attached, To admin + CC service manager, sent from the
  engineer's own mailbox (names/addresses under Settings → SharePoint).
- Export screen: Preview now opens the FSO's sheet in the online workbook.
- Active FSO list: shows sheet no · SharePoint reg no · company, with job description
  below; search matches all of them.
- Office default location set to John Thompson, Sacks Circle, Bellville South
  Industrial, Bellville, Cape Town, 7530.
- Rates for the online workbook sheet are written into the costing block so the sheet's
  own formulas price with the FSO's locked rates. SW cache v12.

## v2.0.0 — 2026-07-19
- **Two-number system**: new "Official FSO No." (from SharePoint registration) on FSO Details;
  printed in the FSO No field (F20) on sheet + PDF. Book numbers are now reference-only.
- **Hard export gate**: export is blocked (no bypass) until the official number is entered.
- **SharePoint settings screen**: job-registration page URL (powers the "Register job ↗"
  buttons) + "upload exports to SharePoint" toggle (needs IT consent for Sites.ReadWrite.All).
- **Per-FSO SharePoint job folder link**: paste the auto-created folder URL on FSO Details;
  "Open job folder ↗" buttons; exports upload there when the toggle is on.
- **Per-job OneDrive folders + immutable PDF revisions**: each export lands in a folder named
  by the official number; first PDF is never overwritten, re-exports become "Rev 1", "Rev 2"…
  Working xlsx always carries the latest data. Same rule applied on SharePoint uploads.
- **All summary sheet** in every new book workbook: one formula-driven row per FSO
  (FSO No, customer, date, NT/OT totals, km, materials) + "Open ▸" hyperlink to each sheet.
- Email/file names now use the official number; dynamic Graph scopes; version stamp in
  Settings → About; service worker cache bumped to v11.

## v1.x — earlier
- Offline PWA with PIN lock, day cards, signatures, GPS km, OneDrive sync + queue,
  IndexedDB attachments, backup/restore, conflict-aware sync, Graph PDF + email export,
  monthly timesheet generator, update banner.
