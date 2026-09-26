# Contacts: phone and vCard import

The authenticated `/app/contacts` page now offers **From phone** and **Import vCard**. Scan the locally generated QR code, sign in to the same account on the phone, and return to the same workspace and line. Supported phone browsers offer one-contact or multiple-contact selection. A vCard upload offers selection of one, several or all eligible numbers. The desktop refreshes every ten seconds while the import dialog is open, on window focus, and when the dialog closes.

## Reference and provenance

The user identified Channel Cast as their project and explicitly requested this feature on 2026-09-22. Read-only GitHub inspection used `Qallus/Channel-Cast-OS` at commit `ba9e5ff50bf532e6eaaf40f323e14bfbf4b69078`. Repository metadata reports no license; no license file was found. No Channel Cast implementation was copied, installed, edited or pushed. Redial's implementation is original, using the requested interaction as its reference.

Inspected sources:

- [Phone import modal](https://github.com/Qallus/Channel-Cast-OS/blob/ba9e5ff50bf532e6eaaf40f323e14bfbf4b69078/components/crm/phone-import-modal.tsx): phone link/QR, browser picker, vCard source and pre-save review.
- [Import utility](https://github.com/Qallus/Channel-Cast-OS/blob/ba9e5ff50bf532e6eaaf40f323e14bfbf4b69078/lib/crm/phone-import.ts) and its tests: normalization and vCard behavior references.

Pinned dependencies: `qrcode@1.5.4` (MIT), `@types/qrcode@1.5.6` (MIT) and `libphonenumber-js@1.13.13` (MIT). The QR is generated locally; no external QR service receives the link. Existing dependencies and kit originals were preserved.

## Redial behavior and boundaries

- A QR carries only a page URL and workspace/line IDs, never a session, password or capability token. The phone independently signs in. Only the contacts return path and valid scope IDs survive the sign-in redirect; external redirects and extra query parameters are discarded. Existing-account login is supported directly; newly registering users can confirm their account and rescan the QR.
- The native picker requires a user tap in a supported secure, top-level browser context. It asks for names and telephone numbers only. It is not opened automatically after navigation. See [Chrome's Contact Picker documentation](https://developer.chrome.com/docs/capabilities/web-apis/contact-picker).
- Native support varies. iPhone and unsupported browsers can use `.vcf` exports. A website cannot silently read all phone contacts; “Select all eligible” applies to the entries the person explicitly shared or exported.
- Files are parsed locally before confirmation. Only selected names and normalized numbers go to the server; photos, email, addresses and notes are ignored. Text vCard 2.1/3.0/4.0, folded lines, quoted-printable names, grouped phone properties and multiple phone numbers are supported. Malformed/incomplete files fail with an error. Limits are 2 MB and 1,000 phone numbers per import.
- Local-format numbers require an explicit country choice; no country is silently assumed. Extensions and impossible numbers are excluded. Matching uses complete E.164 numbers, never a name or the last ten digits. Each separate number becomes one Redial contact record. Existing records, VIP/block settings and names are not overwritten. Imported contacts start with the standard preference.
- `import_contacts` runs as the authenticated user with RLS and rechecks current line `manage_rules` access. A batch is transactional. Imports on a line serialize, and retrying skips numbers already present. Ordinary contact edits retain their existing revision checks. Record audit triggers retain metadata, not uploaded contact content.

## Setup and verification

Apply `supabase/migrations/202609230003_contact_import.sql` after the two dashboard migrations. No new environment variable is needed. `APP_BASE_URL` must be the reachable HTTPS Redial origin for a real phone; a loopback QR cannot reach this workstation from a phone. No Supabase migration or production deployment was performed by this task.

Automated coverage includes parser limits, international normalization, safe redirects, a separate browser context signing in from the QR link, single/multiple picker requests under user activation, selective and all-eligible vCard import, persistence, duplicate handling, mobile overflow and modal accessibility. The browser picker is mocked: actual Android/iPhone interaction and camera scanning remain device checks after hosting is configured. Database permission assertions use actual PostgreSQL with the existing isolated Auth-context test harness; they are not hosted Supabase evidence.

The public `/demo` remains synthetic and does not ingest personal phone books. Use `/app/contacts` after configuring Supabase. Existing release gates, including the ESLint compatibility exception, remain open.

Final local results (2026-09-22): lint, typecheck, optimized build, Docker build, all 92 kit hashes, all 75 reference tests, 17 targeted parser/shell checks, four dashboard browser tests and 21 named PostgreSQL assertions plus denied-write checks passed. Desktop QR and mobile review screenshots were visually inspected; the mobile dialog passed the selected automated accessibility checks. The review server was restarted on port 4317. No physical-phone or hosted-project success is claimed.
