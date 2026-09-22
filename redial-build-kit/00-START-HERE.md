# 00 · Start here — Redial project handoff

**Product specification: v1.1 · Packaging: 1.1.1 · Prepared for JW**

This single folder contains the current Redial build specification, the complete master blueprint, website and lifecycle content, architecture, shared contracts, configuration examples, agent instructions, reference tests, original Claude Design files, and the four Live Call Controls: **Insider, Gavel, Audible, and Directory**.

## Put this folder in your project

Extract the ZIP, then place the **`redial-build-kit` folder** directly inside your existing Redial project. When your extraction tool offers a destination, select the project root; the archive already supplies the `redial-build-kit` folder.

```text
Your Redial project/
├── [your existing application files — leave these in place]
└── redial-build-kit/
    ├── 00-START-HERE.md
    ├── 01-BUILD-ORDER.md
    ├── 02-VS-CODE-PROMPT.md
    ├── 03-FILE-INDEX.md
    ├── REDIAL_MASTER_BLUEPRINT.md
    ├── REDIAL_BLUEPRINT_READER.html
    ├── docs/
    ├── prompts/
    └── [the other included support folders]
```

You do not need to extract or merge any earlier ZIP. This package uses the full v1.1 kit, not only the Live Call Controls supplement.

If `redial-build-kit` already exists and you have edited it, preserve those changes and compare the files before replacing it. Do not overwrite your application, root `AGENTS.md`, root `CLAUDE.md`, environment files, package manifests, lockfiles, or production configuration.

## First action in VS Code

Open your **Redial project root** in VS Code, not just this handoff folder. Paste the following into Claude Code or Codex:

```text
Read redial-build-kit/00-START-HERE.md, redial-build-kit/01-BUILD-ORDER.md,
and redial-build-kit/02-VS-CODE-PROMPT.md. Follow the latest v1.1 specifications,
including Insider, Gavel, Audible, and Directory. Inventory the existing project
and the approved read-only reference repositories first. Preserve all current
work. Produce the M0 inventory and implementation plan, then implement the
smallest safe local M1 increment. Report changed files, actual checks, remaining
gaps, and the next acceptance gate. Do not alter production services.
```

The full initial prompt is in **[02-VS-CODE-PROMPT.md](02-VS-CODE-PROMPT.md)**. The ordered stages are in **[01-BUILD-ORDER.md](01-BUILD-ORDER.md)**. The complete file map is in **[03-FILE-INDEX.md](03-FILE-INDEX.md)**.

## What to read and when

Read the start guide and initial prompt first. Use the numbered `docs/00`–`docs/21` specifications by topic and the stage map before choosing an implementation prompt. `prompts/13-live-call-controls.md` was added later, so its number is a document identifier, **not** a direction to defer call-topology planning until after deployment.

Use the master blueprint or HTML reader for a consolidated view. The modular specifications and current user instructions are the implementation references. Original design files and sample data are visual references, not evidence of working integrations. Source registers retain their original review dates; packaging does not reverify provider behavior, prices, or policies.

## Exact feature names to preserve

| Feature | Requested behavior |
|---|---|
| Insider | Silent live listening to the agent and caller. |
| Gavel | Stop and remove the agent; the authorized user takes over the call. |
| Audible | Privately message the active AI agent with real-time direction. |
| Directory | Transfer to approved phone/custom numbers, extensions, internal users, and other supported destinations. |

## Important handoff boundary

This is a **project-ready planning and implementation package**, not a completed or immediately runnable Next.js application. It contains isolated reference code and tests, not provider credentials, production migrations, compiled mobile apps, or a built extension. Do not run application install or deployment commands against this handoff folder. Let the IDE agent inspect or scaffold the actual application in the project root as directed by the included prompts.

The previous product requirements, prices, quotas, and feature gates have not been changed by this packaging pass. The original reference designs and reference-code modules remain unchanged. No source repository was cloned into this ZIP; the repository review and reuse instructions are included. No local user project, remote repository, VPS, provider account, or billing account was modified.

## Optional local reference checks

From your project root, with Node.js already available:

```bash
node --test redial-build-kit/reference-code/policy.test.mjs redial-build-kit/reference-code/live-controls.test.mjs
```

Those checks cover isolated policy/state examples only. They do not prove live audio, transfers, permissions in a deployed database, payments, native apps, or deployment. Packaging-time results are recorded in `qa/package-assembly-validation.json` separately from the inherited v1.1 QA reports.
