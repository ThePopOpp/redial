# Redial first-look email

Open the [local copy/paste preview](http://127.0.0.1:4317/email/redial-teaser-preview.html), or open `public/email/redial-teaser-preview.html` directly in a browser.

**Subject:** An early look at Redial: your calls, on your terms

## Copy into Outlook

1. Click **Copy subject**, then paste into the subject line of a new Outlook message.
2. Click **Copy email for Outlook** and paste into the message body with **Keep Source Formatting**. Use HTML formatting for the message.
3. Replace **[First name]** and **[Your name]**, and add the intended recipient yourself.
4. Check the phone image in your Outlook draft. Some Outlook versions strip pasted embedded images: insert `redial-phone-preview.png` inline at the image position if that happens. Alternatively, open `redial-teaser.eml` in an Outlook version that supports unsent EML drafts; its image is embedded as a MIME attachment with a Content-ID, so it needs no external image host.

The copy button copies only the designed email, excluding the author toolbar and preparation notes. If browser clipboard access is unavailable, it selects the email for manual Ctrl+C. Both the browser preview and the EML contain the image internally. The smaller editable HTML source references the PNG beside it; keep those two files together.

## Files

| File under `public/email/` | Purpose |
| --- | --- |
| `redial-teaser-preview.html` | Self-contained preview with copy buttons and download links |
| `redial-teaser.html` | Editable email HTML; inline styles, presentation tables, Outlook width fallback |
| `redial-teaser.eml` | Unsent draft with HTML/plain-text alternatives and embedded phone image; no sender or recipient filled in |
| `redial-phone-preview.png` | 1560 × 1238 product mockup for inline insertion |
| `redial-teaser.txt` | Subject and plain-text alternative |

After editing the HTML, plain-text copy or PNG, run `node scripts/build-teaser-email.mjs` to regenerate the preview and EML.

## Content and links

The email is a personal first look at an app in development, not an announcement of live calling. It includes a hero eyebrow/title/subtitle, the phone mockup, a short introduction, Insider/Gavel/Audible/Directory summaries, feedback invitation, CTA section and footer. The sample phone image was captured from Redial's existing local Three.js interface with its fictional caller. Only capture-time browser styling was changed; the application's source, animations and form behavior were preserved.

- **Visit redial.si:** `https://redial.si/`
- **Get Started:** `https://redial.si/demo/live` — the implemented call-control simulator route

**Sending prerequisite observed September 25, 2026:** both public URLs returned `DEPTH_ZERO_SELF_SIGNED_CERT` during HTTPS verification. The intended links are present, but public access is not verified. Correct the site's TLS setup and confirm contacts can open both routes before sending. No DNS, hosting, provider configuration or outgoing mail was changed for this template.

## Validation

Reviewed the rendered desktop and 390px mobile previews, confirmed no horizontal overflow or browser errors, and checked the phone image and CTA destinations. Verified the copy payload includes the image but excludes the author notes, without changing the user's system clipboard. Checked the EML's unsent header, two body alternatives, matching image CID and exact embedded PNG bytes. Actual Outlook rendering and delivery were not tested; new Outlook, classic Outlook and Outlook on the web can handle pasted images differently.

Lint, typecheck, the development Docker build and all 92 original-kit integrity checks also passed. No application workflow or provider configuration changed.
