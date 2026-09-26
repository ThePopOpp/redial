# Supabase Auth email templates

Paste these into **Authentication → Emails → Templates** in the Supabase
dashboard, one per tab. They are not read by the application at runtime; they
live here so the wording and markup are reviewable and can be restored.

## Why they are built this way

Email clients are not browsers. Outlook renders with Word's engine, Gmail strips
`<style>` blocks in some contexts, and nothing supports CSS custom properties.
So every colour is a literal hex value, every rule is an inline `style`, layout
is tables rather than flex or grid, and there is no web font: `DM Serif Display`
is replaced by Georgia, which is present on effectively every client and carries
the same high-contrast serif feel.

Brand values are copied from the light theme in `src/app/globals.css`. Light is
used unconditionally, because most clients force a light background and a dark
template inverts into something unreadable.

| Token | Value | Used for |
|---|---|---|
| `--primary` | `#37264f` | Button fill, brand mark border, heading |
| `--foreground` | `#27222f` | Body text |
| `--muted-foreground` | `#68616f` | Secondary and footer text |
| `--background` | `#faf9fc` | Page background |
| `--card` | `#ffffff` | Card |
| `--border` | `#d8d0e1` | Rules and card edge |
| `--violet` | `#6c4db3` | Links |

Every template states that the link works once and when it expires. That is the
failure people actually hit: a recovery link is single use, so a second click on
the same message returns `otp_expired`, which reads like a broken product rather
than a used ticket.

No template invents a customer count, a testimonial or a carrier claim, and none
carries a marketing footer. These are transactional messages.

## Shared shell

Each template below is complete and self-contained; paste the whole thing. The
only differences between them are the heading, the sentence, the button label
and the expiry line.

---

## Confirm signup

**Subject:** `Confirm your Redial account`

```html
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9fc;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid #d8d0e1;border-radius:14px;">
      <tr><td style="padding:28px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:34px;height:34px;border:1px solid #37264f;border-radius:8px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#37264f;line-height:34px;">R</td>
          <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#27222f;">Redial</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">Confirm your account</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">Use the button below to confirm this address and finish setting up your Redial account.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#37264f;border-radius:9px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm my account</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:22px 32px 0 32px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#68616f;">This link works once and expires in 24 hours. If the button does nothing, copy this address into your browser:</p>
        <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#6c4db3;">{{ .ConfirmationURL }}</a></p>
      </td></tr>
      <tr><td style="padding:22px 32px 26px 32px;">
        <div style="border-top:1px solid #d8d0e1;padding-top:16px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#68616f;">If you did not create a Redial account, you can ignore this message and nothing will happen.</p>
          <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68616f;">Redial is operated by Qallus. <a href="https://redial.si/legal/privacy" style="color:#6c4db3;">Privacy</a> &middot; <a href="https://redial.si/legal/terms" style="color:#6c4db3;">Terms</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Reset password

**Subject:** `Reset your Redial password`

Identical shell; heading, sentence, button and expiry differ.

```html
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9fc;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid #d8d0e1;border-radius:14px;">
      <tr><td style="padding:28px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:34px;height:34px;border:1px solid #37264f;border-radius:8px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#37264f;line-height:34px;">R</td>
          <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#27222f;">Redial</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">Choose a new password</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">Someone asked to reset the password for <strong style="color:#27222f;">{{ .Email }}</strong>. Use the button below to choose a new one.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#37264f;border-radius:9px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Choose a new password</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:22px 32px 0 32px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#68616f;"><strong style="color:#27222f;">This link works once.</strong> Opening it a second time will say it has expired &mdash; that is normal, and you can simply request another. It expires in 1 hour.</p>
        <p style="margin:12px 0 0 0;font-size:13px;line-height:1.6;color:#68616f;">If the button does nothing, copy this address into your browser:</p>
        <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#6c4db3;">{{ .ConfirmationURL }}</a></p>
      </td></tr>
      <tr><td style="padding:22px 32px 26px 32px;">
        <div style="border-top:1px solid #d8d0e1;padding-top:16px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#68616f;">If you did not ask for this, ignore the message. Your password stays as it is, and nobody can change it without this link.</p>
          <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68616f;">Redial is operated by Qallus. <a href="https://redial.si/legal/privacy" style="color:#6c4db3;">Privacy</a> &middot; <a href="https://redial.si/legal/terms" style="color:#6c4db3;">Terms</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Invite user

**Subject:** `You have been invited to Redial`

Same shell. Replace the two content rows with:

```html
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">You have been invited</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">Someone has invited you to join their workspace on Redial, where an assistant screens calls so the phone stops interrupting the day. Accept below to set your password.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#37264f;border-radius:9px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Accept the invitation</a>
          </td>
        </tr></table>
      </td></tr>
```

and the closing note with:

```html
          <p style="margin:0;font-size:12px;line-height:1.6;color:#68616f;">If you were not expecting this, you can ignore it. No account is created until you accept.</p>
```

---

## Magic link

**Subject:** `Your Redial sign-in link`

Same shell, content rows:

```html
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">Your sign-in link</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">Use the button below to sign in to Redial. No password needed.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#37264f;border-radius:9px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to Redial</a>
          </td>
        </tr></table>
      </td></tr>
```

---

## Change email address

**Subject:** `Confirm your new Redial address`

Same shell, content rows:

```html
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">Confirm your new address</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">A request was made to change the address on your Redial account from <strong style="color:#27222f;">{{ .Email }}</strong> to <strong style="color:#27222f;">{{ .NewEmail }}</strong>. Confirm below.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#37264f;border-radius:9px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm the change</a>
          </td>
        </tr></table>
      </td></tr>
```

Note: `/account` does not offer an email change, and says so on the page. This
template exists so the message is branded if the flow is ever enabled, not
because it is reachable today.

---

## Reauthentication

**Subject:** `Your Redial confirmation code`

This one has no link. Supabase sends a six-digit code.

```html
      <tr><td style="padding:22px 32px 0 32px;">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#27222f;font-weight:normal;">Confirmation code</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#27222f;">Enter this code to confirm the change you asked for:</p>
        <p style="margin:18px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:6px;color:#37264f;">{{ .Token }}</p>
        <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#68616f;">If you did not ask for this, ignore the message and change your password.</p>
      </td></tr>
```

## After pasting

Send yourself one of each that is reachable. The reset template is the easiest:
`/forgot-password`, then check the message renders in the client you care about.
Outlook is the strict one; if it looks right there it will look right elsewhere.

`{{ .Email }}` and `{{ .NewEmail }}` render as empty strings in Supabase's
preview pane. That is the preview, not the template.
