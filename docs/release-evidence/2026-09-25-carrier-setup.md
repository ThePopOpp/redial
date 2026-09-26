# Carrier setup preparation — September 25, 2026

**Not a production release.** Branch `main`, inspected HEAD
`fb315753057e9de031dfa35c66293d83a9301448`. Existing tracked changes and untracked
dashboard/deployment work were present before editing and preserved. This
increment is uncommitted; HEAD alone does not reproduce it.

## Changes

- `src/lib/dashboard/carrier-setup.ts`: documented provider registry and validated draft contract.
- `src/components/dashboard/carrier-setup.tsx`, `src/app/carrier-setup.css`: five-step animated incoming-call setup modal, country/provider/device/plan, connection choice, official instructions, prerequisites, review and save. Accessible dialog, reduced-motion behavior and step focus/scroll restoration.
- `src/lib/dashboard/setup-actions.ts`: verified server account, strict origin/input validation and scoped database RPC.
- `supabase/migrations/202609250001_carrier_setup.sql`: separate draft table, private reads, RPC-only mutations, immutable line scope, optimistic revision, metadata audit. No provisioning/activation/verified-evidence fields.
- Member Numbers page and public demo Numbers page expose the wizard. Connections includes truthful implementation gates in `launch-status.tsx`.
- Offline redacted configuration checker and `test:launch` command; `.env.example` documents credential separation.
- `docs/LIVE-LAUNCH-PREPARATION.md`: service/account list, deployment layout, staging procedure, remaining implementation, provider test matrix and rollback plan.
- Added actual PostgreSQL permission assertions, UI persistence tests using the existing HTTP contract double, mobile/provider browser tests and configuration checks.

No external repository code imported. No dependency changes for this increment;
Node 24.12.0, pinned package manifest/lock retained. ESLint 9 compatibility exception
from `M1-EVIDENCE.md` remains unresolved.

## Executed checks

| Check | Actual result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed after final UI changes |
| `npm run test:launch` | 3 passed |
| `npm run test:database` | 29 named assertions plus denial/rollback blocks passed against isolated PostgreSQL; no published port; container removed |
| Provider wizard + existing phone simulator Playwright tests | 4 passed; final provider-only screenshot rerun 2 passed |
| `npm run test:dashboard` | 5 passed against HTTP Auth/PostgREST contract double, including setup save/reload |
| `npm run test:reference` | 75 passed; policy/reference evidence only |
| `npm run verify:kit` | All 92 original file hashes unchanged |
| `npm run check:launch -- .env.local` | Expected exit 1: local origin, missing Supabase configuration, and unimplemented live-call engine block launch; secrets not printed |
| Review server | Restarted verified Redial process on port 4317; `/demo/numbers` returned 200 |

An initial SQL test caught an incorrect expected JSON field count; corrected and
rerun successfully. An initial mobile test caught the country select's accessible
name ambiguity; corrected and rerun successfully. Visual inspection caught the
missing modal surface background; corrected and final desktop/mobile captures
reviewed. The full landing/browser suite was not rerun; landing motion was not
changed in this increment.

Screenshots: [desktop](../evidence/carrier-setup/desktop.png),
[mobile](../evidence/carrier-setup/mobile.png).

## Remaining gates / signoff

No actual Supabase project, provider credentials, infrastructure, WSS proxy,
inbound call, carrier reversal, consent/audio, charge, email delivery, backup
restore, security audit or production deployment was verified. The carrier
documentation does not prove the user's exact plan/device works with Redial.
The domain value and first pilot geography remain pending user confirmation.

Voice gateway, durable workers, bounded spend/consent/fallback, complete v1.1 Live
Call Controls, Square, companion surfaces and later product milestones remain
open as detailed in the launch preparation document. All owner production
signoffs remain pending. M1 is not marked complete.
