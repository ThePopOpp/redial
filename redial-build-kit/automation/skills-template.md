# Redial skill template

## Identity
Skill ID; version; owner; approved environments; agent role; last-reviewed date.

## Trigger and result
Describe the business event or explicit user request that invokes the skill. Define what successful completion looks like and which durable record proves it. Distinguish producing a draft from sending/publishing/executing it.

## Inputs
Typed parameters, required resource/workspace scope, source evidence, allowed data categories and validation limits. Mark caller-provided statements as untrusted.

## Permissions
Allowed tools and maximum scopes. Which human approvals are required? Which data may be read? Which changes may be proposed versus executed? No capability is granted merely by inclusion in this text.

## Procedure
Check identity/scope and latest record state; gather minimum evidence; form a structured proposed action; validate against policy; request approval if required; execute through the broker with idempotency; verify external result; write a redacted audit entry; report actual status.

## Failure and escalation
Missing consent, missing permission, expired approval, changed arguments, unknown provider behavior, unavailable services, exhausted budget and conflicting evidence must fail safely. Do not invent a successful action. Escalate to the responsible human queue with a concise reason.

## Privacy and retention
Specify which content is temporary, which is retained, where it is stored and how deletion/revocation is honored. Do not copy data into global agent memory.

## Tests
Positive case; unauthorized actor; wrong tenant; stale state; duplicate call; changed approval; malicious instruction in tool output; provider failure; budget exhaustion; deletion/revocation. Record expected output and side effects.
