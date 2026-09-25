import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(page: Page) {
  await page.getByLabel('Email',{exact:true}).fill('review@example.test');
  await page.getByLabel('Password',{exact:true}).fill('A-long-test-password!');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
}
async function prepare(page: Page) {
  await page.request.post('http://127.0.0.1:3213/__test/reset');
  await page.goto('/sign-in'); await signIn(page);
  await page.getByLabel('Workspace name').fill('Phone import workspace');
  await page.getByRole('button',{name:'Create workspace',exact:true}).click();
  await page.getByRole('link',{name:'Contacts',exact:true}).click();
}
const vcard = ['BEGIN:VCARD','VERSION:3.0','FN:One person','TEL:+16025550111','END:VCARD','BEGIN:VCARD','VERSION:3.0','FN:Second person','TEL:+442071234567','END:VCARD','BEGIN:VCARD','VERSION:3.0','FN:Duplicate','TEL:+1 (602) 555-0111','END:VCARD'].join('\n');

test('QR handoff preserves target through phone sign-in; one, selected and all imports persist',async({page,browser})=>{
  await prepare(page);
  await page.getByRole('button',{name:'From phone',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('img',{name:/QR code/})).toHaveAttribute('src',/^data:image\/png;base64,/);
  const href=await dialog.getByRole('link',{name:'Open phone import link'}).getAttribute('href');
  expect(href).toContain('/app/contacts?workspace=');expect(href).not.toMatch(/token|secret|code=/);
  await page.screenshot({path:'test-results/contact-import-qr.png'});
  const phone=await browser.newContext({viewport:{width:390,height:844}});
  const mobile=await phone.newPage();
  await mobile.goto(href!);await expect(mobile).toHaveURL(/sign-in\?next=/);await signIn(mobile);
  await expect(mobile.getByRole('dialog')).toBeVisible();await expect(mobile).toHaveURL(/import=phone/);
  await mobile.getByLabel('Choose vCard file').setInputFiles({name:'contacts.vcf',mimeType:'text/vcard',buffer:Buffer.from(vcard)});
  await mobile.getByRole('checkbox',{name:'Import One person +16025550111',exact:true}).check();
  await mobile.getByRole('button',{name:'Import 1 selected',exact:true}).click();
  await expect(mobile.getByRole('status')).toContainText('1 contact imported');
  await expect(mobile.getByText('One person',{exact:true})).toBeVisible();
  await mobile.getByRole('button',{name:'From phone',exact:true}).click();
  await mobile.getByLabel('Choose vCard file').setInputFiles({name:'contacts.vcf',mimeType:'text/vcard',buffer:Buffer.from(vcard)});
  await mobile.getByRole('button',{name:'Select all eligible'}).click();
  await expect(mobile.getByRole('button',{name:'Import 1 selected',exact:true})).toBeEnabled();
  await expect(mobile.getByRole('checkbox',{name:'Import One person +16025550111',exact:true})).toBeDisabled();
  expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mobile.screenshot({path:'test-results/contact-import-review-mobile.png'});
  expect((await new AxeBuilder({page:mobile}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await mobile.getByRole('button',{name:'Import 1 selected',exact:true}).click();
  await expect(mobile.getByText('Second person',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close contact import'}).click();
  await expect(page.getByText('Second person',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('One person',{exact:true})).toBeVisible();
  await phone.close();
});

test('supported phone picker opens only on a user gesture and supports single or multiple selection',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'contacts',{value:{select:async(properties:string[],options:{multiple:boolean})=>{
      if(!navigator.userActivation.isActive || properties.join(',')!=='name,tel')throw new Error('Incorrect picker request');
      return options.multiple ? [{name:['Selected one'],tel:['+16025550121']},{name:['Selected two'],tel:['+16025550122']}] : [{name:['Single person'],tel:['+16025550120']}];
    }}});
  });
  await prepare(page);await page.getByRole('button',{name:'From phone',exact:true}).click();
  await page.getByRole('button',{name:'Choose one contact'}).click();
  await expect(page.getByRole('heading',{name:'Review your contacts'})).toBeVisible();
  await page.getByRole('button',{name:'Select all eligible'}).click();
  await page.getByRole('button',{name:'Import 1 selected',exact:true}).click();
  await expect(page.getByText('Single person',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'From phone',exact:true}).click();
  await page.getByRole('button',{name:'Select contacts',exact:true}).click();
  await page.getByRole('button',{name:'Select all eligible'}).click();
  await page.getByRole('button',{name:'Import 2 selected',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('2 contacts imported');
});
