# Changelog

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
