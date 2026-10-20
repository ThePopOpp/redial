# Supabase Auth email templates

These are the emails Supabase Auth sends: confirmation, password reset, magic
link, email change, invitation and reauthentication. They are **not** sent by this application.
Supabase Auth has its own SMTP settings and its own templates, neither of which
inherit anything from `REDIAL_EMAIL_PROVIDER` or the rest of the application
environment — the note in `docs/DEVELOPMENT-DEPLOYMENT.md` says so, and the
generic default that reached the owner's inbox is what that separation looks
like when only the SMTP half has been configured.

They are kept here so the wording and the markup are reviewable and version
controlled, rather than existing only in a dashboard field where a change leaves
no trace.

## Applying them

Supabase Studio → **Authentication → Emails → Templates**. One template per tab.
Paste the body of the matching file, keeping the subject line listed below.

| File | Template | Subject |
| --- | --- | --- |
| `confirm-signup.html` | Confirm signup | Confirm your Redial account |
| `reset-password.html` | Reset password | Reset your Redial password |
| `magic-link.html` | Magic link | Your Redial sign-in link |
| `change-email.html` | Change email address | Confirm your new Redial address |
| `invite.html` | Invite user | You have been invited to Redial |
| `reauthentication.html` | Reauthentication | Your Redial verification code |

Also check, in the same area:

- **Site URL** is `https://redial.si`
- **Redirect URLs** includes `https://redial.si/auth/callback`

## Why they look the way they do

Email clients are not browsers. Gmail strips `<style>` blocks in some contexts,
Outlook renders through Word, and no client loads a web font reliably. So every
rule is inlined, the layout is a table, and the display face falls back to
Georgia rather than loading DM Serif Display and getting Times.

Colours are Redial's light-mode tokens written as literals, because a CSS
variable has nothing to resolve against in an email. A `prefers-color-scheme`
block is included for the clients that honour it; the design is readable without
it rather than depending on it.

The confirmation link is also printed as plain text underneath. A button is a
link with a background colour, and a client that strips the background leaves
something unclickable-looking; the bare URL is what a person falls back to, and
it is what they need when the link has to be moved to another browser.

## Reauthentication is a code, not a link

`reauthentication.html` is the one template with no button and no URL. Supabase
sends `{{ .Token }}` — a short code typed back into the page that asked for it —
so a button would have nowhere to go.

It is set oversized and letter-spaced because the usual failure is reading `0`
as `O` while copying it across by eye, and it carries the line that no one at
Redial will ever ask for it. That sentence is the only defence against someone
phoning a member and talking them through reading it out.

## One-time links expire when they are followed

Supabase consumes the token at its own verify endpoint before redirecting to
`/auth/callback`. If anything refuses that landing — a gate, a scanner that
prefetches links, a corporate mail filter — the token is spent and the next
click reports `otp_expired`. That is a symptom. The cause is whatever refused
the first landing, not the template.
