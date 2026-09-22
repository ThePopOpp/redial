# Assembly notes — packaging 1.1.1

## Source and precedence

The source is `REDIAL_PRODUCT_AND_BUILD_KIT_v1.1.zip`, the full updated kit. Its file list includes every file from the original v1.0 ZIP. Updated v1.1 content takes precedence over earlier exports. No additional provider research, new pricing, new product behavior, or external project changes were made in this assembly.

## What this packaging adds

- A top-level numbered start guide, dependency-ordered build sequence, initial VS Code prompt and complete clickable file index.
- The already-delivered standalone Live Call Controls specification, without duplicating the matching prompt.
- Both previously supplied blueprint-reader screenshots.
- Fresh local reference-test and contract-check output, a content inventory and package-assembly validation report.
- A refreshed integrity manifest for the assembled files; the prior manifest is retained as historical evidence.

All source-v1.1 files except the regenerated root `FILE_MANIFEST.json` are retained byte-for-byte at the same relative paths. The original five Claude Design files remain unchanged. Existing QA reports describe the earlier v1.1 delivery; `qa/package-assembly-validation.json` describes this packaging pass. New entry guides do not supersede current user instructions or the feature requirements.

## Practical use

Add the single `redial-build-kit` folder to the existing Redial project. You do not need an older ZIP. The original modular paths are intentionally stable so prior implementation prompts and references continue working. Specifications and prompts are numbered within their folders; `01-BUILD-ORDER.md` maps prompt IDs to actual delivery order, including the early live-call topology proof.

No application `package.json`, `.env`, root `AGENTS.md`, root `CLAUDE.md`, deployment file or live credential is installed or replaced by extraction. Review local edits before replacing any older copy of the handoff folder.
