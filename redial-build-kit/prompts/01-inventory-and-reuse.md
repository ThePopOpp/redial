# M0 · Inventory and safe reuse


Read the start-here prompt and reuse specification. Inspect the current Redial tree and git status without discarding anything. Report the resolved framework/runtime/package manager, lockfiles, entrypoints, existing routes/components, auth/session strategy, Supabase schema/RLS, provider code, tests and deployment files. Distinguish “declared dependency,” “implemented code,” “tested behavior” and “production verified.”

Inspect the authorized local/GitHub references read-only. Compare actual auth, UI, table/forms, extension messages, telephony client and deployment modules. Recommend selective reuse with source path/commit, target path, dependencies, permission assumptions and removal requirements. Do not infer implementation from folder names. Capture possible license/ownership conditions for the different source businesses.

Create an inventory report, reuse manifest and dependency/architecture decision log. Establish baseline typecheck/tests/build using the project's commands; report failures honestly and separate preexisting failures from new ones. Identify any dirty/untracked user files and leave them intact. Do not create a fresh scaffold on top of existing files. Choose the smallest next shell increment after the inventory; do not wire production credentials.

Acceptance: clean isolation from original business data, exact source references, verified baseline or documented blockers, and a concrete M1 plan respecting the existing project.
