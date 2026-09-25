import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local artifacts only. This script has no mail transport or recipient list.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'public/email');
const html = await readFile(path.join(directory, 'redial-teaser.html'), 'utf8');
const plain = await readFile(path.join(directory, 'redial-teaser.txt'), 'utf8');
const phone = await readFile(path.join(directory, 'redial-phone-preview.png'));
const subject = plain.split('\n')[0].replace(/^Subject: /, '');
const emailBody = html.split('<!-- EMAIL START -->')[1].split('<!-- EMAIL END -->')[0];
const imageData = `data:image/png;base64,${phone.toString('base64')}`;
const embedded = emailBody.replace('src="redial-phone-preview.png"', `src="${imageData}"`);
const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1].trim();
const base64 = content => Buffer.from(content).toString('base64').match(/.{1,76}/g).join('\r\n');
const related = 'redial-first-look-related', alternative = 'redial-first-look-alternative';
const draft = [
  'X-Unsent: 1', 'MIME-Version: 1.0', `Subject: ${subject}`,
  `Content-Type: multipart/related; boundary="${related}"`, '',
  `--${related}`, `Content-Type: multipart/alternative; boundary="${alternative}"`, '',
  `--${alternative}`, 'Content-Type: text/plain; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', base64(plain.split('\n').slice(2).join('\n')), '',
  `--${alternative}`, 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', base64(html.replace('src="redial-phone-preview.png"', 'src="cid:redial-phone-preview@redial.si"')), '',
  `--${alternative}--`, '', `--${related}`, 'Content-Type: image/png; name="redial-phone-preview.png"',
  'Content-Transfer-Encoding: base64', 'Content-Disposition: inline; filename="redial-phone-preview.png"',
  'Content-ID: <redial-phone-preview@redial.si>', '', base64(phone), '', `--${related}--`, '',
].join('\r\n');
await writeFile(path.join(directory, 'redial-teaser.eml'), draft);
const preview = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Redial — copy your first-look email</title>
<style>${styles}
body{background:#eeebf2;color:#312b39;font-family:Arial,Helvetica,sans-serif}.tools{max-width:640px;margin:26px auto 0;padding:0 16px;box-sizing:border-box}.tools h1{font:26px/1.2 Georgia,serif;margin:0 0 12px}.tools p{font-size:13px;line-height:1.7;margin:10px 0}.tools label{display:block;font-size:12px;font-weight:bold;margin-bottom:8px}.tools input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #b8a4cf;border-radius:5px;background:white;color:#312b39;font-size:13px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.actions button,.actions a{font:600 12px/20px Arial,sans-serif;padding:9px 13px;border:1px solid #b8a4cf;border-radius:5px;background:white;color:#513473;text-decoration:none;cursor:pointer}.actions button:first-child{background:#6943a8;color:white;border-color:#6943a8}#copy-status{min-height:22px;color:#513473}.note{border-left:3px solid #b89772;padding-left:12px}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #a281d2;outline-offset:3px}@media print{.tools{display:none}}
</style></head><body>
<section class="tools" aria-label="Email copy tools"><h1>Your Redial first-look email</h1>
<label for="subject">Subject</label><input id="subject" readonly value="${subject}">
<div class="actions"><button id="copy-email" type="button">Copy email for Outlook</button><button id="copy-subject" type="button">Copy subject</button><a href="redial-teaser.eml" download>Download Outlook draft</a><a href="redial-phone-preview.png" download>Download phone image</a></div>
<p>Paste into an HTML message in Outlook using <strong>Keep Source Formatting</strong>. Replace <strong>[First name]</strong> and <strong>[Your name]</strong>. If Outlook drops the image, insert the supplied PNG inline, or open the embedded-image draft.</p>
<p class="note"><strong>Before sending:</strong> redial.si returned a certificate error during preparation. Verify the homepage and simulator open publicly before inviting contacts. This note is not copied into the email.</p>
<p id="copy-status" role="status" aria-live="polite">Only the email below is copied. Nothing is sent.</p></section>
<div id="email-content">${embedded}</div>
<script>
const status = document.getElementById('copy-status');
document.getElementById('copy-subject').addEventListener('click', async () => {
 try { await navigator.clipboard.writeText(document.getElementById('subject').value); status.textContent = 'Subject copied.'; }
 catch { document.getElementById('subject').select(); status.textContent = 'Subject selected. Press Ctrl+C to copy.'; }
});
document.getElementById('copy-email').addEventListener('click', async () => {
 const email = document.getElementById('email-content');
 try {
   const content = '<html><body>' + email.innerHTML + '</body></html>';
   await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([content], {type:'text/html'}), 'text/plain': new Blob([email.innerText], {type:'text/plain'}) })]);
   status.textContent = 'Email copied. Paste into Outlook with Keep Source Formatting, then personalize the two names.';
 } catch {
   const selection = getSelection(); const range = document.createRange(); range.selectNodeContents(email); selection.removeAllRanges(); selection.addRange(range);
   status.textContent = 'Email selected. Press Ctrl+C, then paste into Outlook with Keep Source Formatting.';
 }
});
</script></body></html>`;
await writeFile(path.join(directory, 'redial-teaser-preview.html'), preview);
console.log('Created the copy/paste preview and an unsent MIME draft with an inline phone image. No mail sent.');
