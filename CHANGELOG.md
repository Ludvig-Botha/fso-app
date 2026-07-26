# Changelog

## v2.6.0 — 2026-07-26
- Bug log now survives a reload and records Graph failures automatically
  (Settings > Report a Bug), so an error can be read after the fact.
- Worksheet copy (400 "segment 'copy'"): now tries the worksheet ID first, then
  the name, and if the tenant does not expose the copy action at all it adds a
  plain sheet and says so, rather than failing the whole export.
- Admin email now CCs the service manager AND the engineer. Multiple manager
  addresses can be separated by commas. The toast and job history record
  exactly who it went to.
- FSO screen reworked: "Create / Update job" replaces the old preview and
  company-system buttons. It creates/refreshes the OneDrive job folder, writes
  the job workbook, produces the PDF and opens it. A badge above it shows
  whether the app data matches OneDrive (up to date / changed since last
  update / not created yet).
- Folder buttons renamed: "SharePoint folder" and "OneDrive folder"; the
  OneDrive one resolves this job's own folder link automatically.
- Export screen: "Also produce" removed; "Send to Workbook" removed. Bottom bar
  is now Preview sheet / Send customer email / Send admin emails / Close job.
- Preview sheet opens the job's own workbook in its OneDrive folder.
- Email subject is now "<job no>, <company>, <description>, FSO" for both
  customer and admin mail; admin mail keeps the Loriza wording.

### Known, not yet done
- Attachments are emailed as separate files; they are not yet merged into the
  FSO PDF itself.
- Logo positioning and the sheet layout still need work — next step is
  rebuilding the template from scratch, step by step.
- Service engineer name is missing from the rendered sheet (cell X19 is not
  being written).

## v2.5.0 — 2026-07-26
- FIX (423 resourceLocked / no PDFs): FSO PDFs are built from a locally
  generated workbook again, then uploaded and converted. The server-side
  builder held a persistent workbook session on the file, so the PDF
  conversion that ran straight afterwards hit a locked resource. It also could
  never embed the signature images — the Graph workbook API cannot insert
  pictures — so even a successful PDF would have been unsigned.
- FIX (400 "Resource not found for the segment 'copy'"): worksheet copy now
  uses the /worksheets/{name}/copy form. The parenthesised worksheets('name')
  form does not resolve the copy action, which is why "Send to workbook" failed
  and jobs were never added to the workbook alongside the All and TEMPLATE tabs.
- FIX (leftover template data): the template carried cached formula results
  from the FSO it was cleaned from (100 km, 5 h, R3 300, R500...). Those cached
  values are now stripped, so a new workbook starts genuinely empty. The
  template's hard-coded rates were cleared too.
- FIX (logos): the John Thompson logo was lost during the earlier template
  clean-up. Both logos are now anchored in their proper blocks — ACTOM across
  the top, John Thompson at A11.
- FIX (dates): the engineer's date now uses the same dd/mm/yyyy format as the
  customer's date-signed. Both previously came from different sources.
- FIX (stale signatures): the template's signature placeholders are now blank
  transparent images, so an unsigned FSO can never show someone else's mark.
- NEW: Settings > About > Clear app data. Warns with a count of what will be
  lost, writes a timestamped .zip backup to OneDrive (FSO App > Backups)
  containing all data plus every signature and photo, then requires typing
  ERASE before wiping the device.
- NEW: Settings > About > Restore from OneDrive backup — pick any saved backup
  and put the device back exactly as it was.
- Books now number automatically: 1-50, then 51-100, 101-150 and so on. The
  next range is pre-filled, duplicate ranges are refused and overlapping ranges
  warn, so two books can never share a workbook name or folder.
- The book list shows the date each book was created.
- Customer import now has separate Street Address / City / Province / Country
  columns, each printing on its own line. The site field on an FSO is
  multi-line and is filled from the customer record when one is selected.
- SW cache v17.

## v2.4.0 — 2026-07-26
- Auto-update fixed. Three separate causes: (1) the service worker was
  registered without updateViaCache:'none', so the browser could serve sw.js
  from its own HTTP cache and never notice a new build; (2) the worker fetched
  the app shell through that same HTTP cache, so even a "network-first" load
  could return a stale FSO_App.html; (3) an installed PWA is resumed rather
  than reloaded, so no update check ever ran. Now: registration bypasses the
  HTTP cache, shell fetches use no-store, and updates are checked on load, on
  return to the foreground, and every 15 minutes.
- New "Check for updates" in Settings → About: asks GitHub what version is
  published, compares it with the running build, and offers a forced update
  (clears caches, retires the old worker, reloads).
- PIN keypad buttons are now round.
- NEW: Call out vs Quote basis per FSO (Job basis on the FSO Details screen).
  - Call out behaves exactly as before.
  - Quote skips all pricing of hours, travel and materials: enter the
    quotation number and the amount excluding VAT, and tick whether VAT should
    be added. The quoted amount is written to the sheet as Other charges, and
    VAT is forced to nil when the tick box is off.
  - The job description automatically carries "According to quotation <number>"
    as its first line, and follows the number if it changes.
  - Export validation for quoted jobs checks the quotation number, the amount
    and both signatures instead of day entries and hours.
- Existing FSOs are treated as call-outs. SW cache v16.

## v2.3.0 — 2026-07-25
- ROOT CAUSE FOUND (Graph 501 unsupportedWorkbook): the embedded FSO template
  still contained an EXTERNAL LINK back to "47700C-47750C Ludvig Botha FSO
  Sheet.xlsx", left over from when the clean sheet was extracted. The Graph
  Excel API refuses to open any workbook with external references, so EVERY
  workbook API call had been failing since day one — which is why sheets stayed
  named "18", stayed empty, kept old data, no All sheet was built, no PDF was
  produced, and the company-system email never sent.
- The template is now cleaned: external links removed, broken in-cell "rich
  value" images removed (they rendered #VALUE! in A1/A11), stale calcChain and
  metadata dropped, and the letterhead re-anchored as a normal picture so it
  still prints. Validated: opens cleanly, all 23 formulas intact, no #VALUE!.
- FIX: customer import skipped every row — it looked for a "Customer Name"
  column but the template ships "Company Name". Header matching is now
  forgiving, and a failed import lists the columns it actually found.
- FIX: "Date Signed" showed the job start date (template pulled =X13). It now
  shows the real customer signature date.
- Exported PDFs are emailed to the engineer automatically (Settings → Engineer
  Profile → My email address).
- Site address now prints one line per part (street / city / province /
  country), accepting either line breaks or a comma-separated address.
- New "Workbook Folder" button on the FSO screen, beside "Open Job Folder".
- Settings → SharePoint is now "SharePoint & OneDrive folders", with a field for
  the OneDrive FSO App folder URL.
- Confirmed already correct: internal jobs mark materials up 5% (external 30%).
- SW cache v15.

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
