// Single source of truth for the published legal documents. `legalVersion` is
// recorded against an account when someone accepts the terms at registration,
// so a later change to the documents is distinguishable from the version the
// person actually agreed to. Bump both values together when the terms change.
export const legalVersion = '2026-09-26';
export const legalEffectiveDate = '26 September 2026';
